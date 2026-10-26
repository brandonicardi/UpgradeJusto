"""Políticas puras/offline: no representan integración PG."""

import pytest
from argon2 import Type
from pydantic import ValidationError

from upgradejusto.auth.security import (
    HASHER,
    Credentials,
    HashBusy,
    digest,
    hash_slot,
    normalize_email,
    token,
    verify_password,
)
from upgradejusto.persistence.runtime import Unavailable, auth_settings


def test_exact_argon2_profile_and_salts():
    assert (
        HASHER.type,
        HASHER.memory_cost,
        HASHER.time_cost,
        HASHER.parallelism,
        HASHER.salt_len,
        HASHER.hash_len,
    ) == (Type.ID, 65536, 3, 4, 16, 32)
    first = HASHER.hash("not-a-real-password")
    second = HASHER.hash("not-a-real-password")
    assert first != second
    assert first.startswith("$argon2id$v=19$")
    assert verify_password(first, "not-a-real-password")
    assert not verify_password(first, "incorrect-password")
    assert not HASHER.check_needs_rehash(first)


def test_two_hash_slots_only():
    with hash_slot(), hash_slot():
        with pytest.raises(HashBusy):
            with hash_slot():
                pytest.fail("third hash admitted")
    with hash_slot():
        pass


def test_email_normalization_preserves_plus_and_dots():
    assert normalize_email(" A.B+Tag@Example.COM\t") == "a.b+tag@example.com"


@pytest.mark.parametrize(
    "email",
    [
        "a..b@e.co",
        ".a@e.co",
        "a.@e.co",
        "a@-e.co",
        "a@e-.co",
        "a@localhost",
        "á@e.co",
        "a@@e.co",
        "a@e..co",
        "a" * 65 + "@e.co",
    ],
)
def test_email_rejections(email):
    with pytest.raises(ValueError):
        normalize_email(email)


@pytest.mark.parametrize(
    "password", ["short", "a" * 129, "a" * 12 + "\0", "\ud800" * 12]
)
def test_password_rejections(password):
    with pytest.raises(ValidationError):
        Credentials(email="a@e.co", password=password)


def test_password_is_not_normalized_and_extra_identity_forbidden():
    raw = "  twelve chars  "
    assert Credentials(email="a@e.co", password=raw).password.get_secret_value() == raw
    with pytest.raises(ValidationError):
        Credentials(email="a@e.co", password=raw, user_id="administrator")
    first, second = token(), token()
    assert len(first) == 43 and first != second
    assert len(digest(first)) == 64 and digest(first) != first


@pytest.mark.parametrize("mode", ["dev", "test"])
def test_loopback_exception_explicit_and_not_production(monkeypatch, mode):
    monkeypatch.setenv("UJ_ORIGIN", "http://127.0.0.1:3000")
    monkeypatch.setenv("UJ_ALLOW_INSECURE_LOOPBACK", "1")
    monkeypatch.setenv("UJ_ENV", "production")
    with pytest.raises(Unavailable):
        auth_settings()
    monkeypatch.setenv("UJ_ENV", mode)
    assert auth_settings() == ("http://127.0.0.1:3000", False)
    monkeypatch.setenv("UJ_ORIGIN", "http://example.com")
    with pytest.raises(Unavailable):
        auth_settings()
