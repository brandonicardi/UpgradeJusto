"""Official verifier + synthetic RSA, mocked PUBLIC cert transport, not Google live."""

from time import time

import pytest
from google38_fixtures import CLIENT_ID
from google38_fixtures import rsa_material as rsa_material

from upgradejusto.auth.google_models import GoogleCredential
from upgradejusto.auth.google_verifier import CertificateRequest, GoogleVerifier
from upgradejusto.auth.security import digest
from upgradejusto.auth.service import AuthError


def verifier(crypto):
    return GoogleVerifier(CLIENT_ID, CertificateRequest(crypto.transport()))


@pytest.mark.parametrize(
    "issuer", ["accounts.google.com", "https://accounts.google.com"]
)
def test_actual_rsa_signature_official_google_verifier_and_canonical_issuer(
    rsa_material, issuer
):
    raw = rsa_material.signed("synthetic-nonce", iss=issuer)
    result = verifier(rsa_material).verify(raw, digest("synthetic-nonce"))
    assert result["issuer"] == "https://accounts.google.com"
    assert result["subject"] == "synthetic-subject"
    assert result["profile_email"] == "synthetic-google@example.test"


@pytest.mark.parametrize(
    "changes",
    [
        {"aud": "wrong.apps.googleusercontent.com"},
        {"iss": "https://evil.example.test"},
        {"exp": 1},
        {"iat": 9999999999, "exp": 99999999999},
        {"nonce": "wrong-nonce"},
        {"nonce": None},
        {"token_use": "access"},
        {"token_type": "Bearer"},
        {"azp": "wrong.apps.googleusercontent.com"},
        {"sub": ""},
    ],
)
def test_invalid_id_token_claims_fail_closed_without_reflecting_token(
    rsa_material, changes
):
    raw = rsa_material.signed("synthetic-nonce", **changes)
    with pytest.raises(AuthError) as error:
        verifier(rsa_material).verify(raw, digest("synthetic-nonce"))
    assert error.value.status == 401
    assert error.value.detail == "Invalid Google ID token" and raw not in str(
        error.value
    )


def test_signature_tampering_rejected_by_real_crypto(rsa_material):
    raw = rsa_material.signed("synthetic-nonce")
    head, body, signature = raw.split(".")
    signature = ("A" if signature[0] != "A" else "B") + signature[1:]
    with pytest.raises(AuthError) as error:
        verifier(rsa_material).verify(
            ".".join((head, body, signature)), digest("synthetic-nonce")
        )
    assert error.value.status == 401


@pytest.mark.parametrize(
    "headers",
    [
        {"typ": "at+jwt"},
        {"jku": "http://127.0.0.1/keys"},
        {"x5u": "https://evil.example.test/cert"},
    ],
)
def test_untrusted_header_never_controls_key_fetch(rsa_material, headers):
    transport = rsa_material.transport()
    checked = GoogleVerifier(CLIENT_ID, CertificateRequest(transport))
    with pytest.raises(AuthError) as error:
        checked.verify(
            rsa_material.signed("synthetic-nonce", headers=headers),
            digest("synthetic-nonce"),
        )
    assert error.value.status == 401 and transport.calls == 0


def test_access_hs256_and_non_jwt_rejected_without_fetch(rsa_material):
    import jwt

    transport = rsa_material.transport()
    checked = GoogleVerifier(CLIENT_ID, CertificateRequest(transport))
    access = jwt.encode(
        {"exp": int(time()) + 3600},
        "synthetic-not-secret-test-key-32-bytes-minimum",
        algorithm="HS256",
        headers={"kid": "synthetic-key"},
    )
    for raw in (access, "opaque-access-token", "a.b.c"):
        with pytest.raises(AuthError) as error:
            checked.verify(raw, digest("synthetic-nonce"))
        assert error.value.status == 401
    assert transport.calls == 0


def test_certificates_cache_respects_max_age_and_rejects_arbitrary_urls(
    rsa_material, monkeypatch
):
    import upgradejusto.auth.google_verifier as module

    clock = [0.0]
    monkeypatch.setattr(module, "monotonic", lambda: clock[0])
    transport = rsa_material.transport({"cache-control": "max-age=60", "age": "5"})
    request = CertificateRequest(transport)
    checked = GoogleVerifier(CLIENT_ID, request)
    raw = rsa_material.signed("synthetic-nonce")
    checked.verify(raw, digest("synthetic-nonce"))
    checked.verify(raw, digest("synthetic-nonce"))
    assert transport.calls == 1
    clock[0] = 56
    checked.verify(raw, digest("synthetic-nonce"))
    assert transport.calls == 2
    with pytest.raises(AuthError) as error:
        request("http://127.0.0.1/arbitrary")
    assert error.value.status == 503 and transport.calls == 2


def test_cert_transport_failure_and_jwks_shape_are_sanitized_503(rsa_material):
    from upgradejusto.auth.google_verifier import CertificateReply

    for body in (b'{"keys":[]}', b'{"key":"not a certificate"}'):
        request = CertificateRequest(
            lambda *args, **kwargs: CertificateReply(200, body, {})
        )
        with pytest.raises(AuthError) as error:
            GoogleVerifier(CLIENT_ID, request).verify(
                rsa_material.signed("synthetic-nonce"), digest("synthetic-nonce")
            )
        assert error.value.status == 503


def test_credential_repr_is_secret_and_external_identity_fields_are_closed():
    from uuid import uuid4

    from pydantic import ValidationError

    value = GoogleCredential(
        attempt_id=uuid4(), credential="synthetic-sensitive-idtoken"
    )
    assert "synthetic-sensitive-idtoken" not in repr(value)
    with pytest.raises(ValidationError):
        GoogleCredential(
            attempt_id=uuid4(), credential="x", user_id="model-user", token_type="id"
        )


def test_official_requests_adapter_has_fixed_url_bounded_tls_transport(
    rsa_material, monkeypatch
):
    import ssl
    from types import SimpleNamespace

    import upgradejusto.auth.google_verifier as module

    constructed, fetched = [], []
    reply = rsa_material.transport()(module.CERT_URL)

    class Response:
        status_code = 200
        headers = reply.headers

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def iter_bytes(self):
            yield reply.data

    class Client:
        def __init__(self, **kwargs):
            constructed.append(kwargs)

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def stream(self, *args, **kwargs):
            fetched.append((args, kwargs))
            return Response()

    monkeypatch.setattr(module, "httpx", SimpleNamespace(Client=Client))
    checked = GoogleVerifier(CLIENT_ID, CertificateRequest())
    assert (
        checked.verify(
            rsa_material.signed("synthetic-nonce"), digest("synthetic-nonce")
        )["issuer"]
        == module.ISSUER
    )
    assert fetched == [(("GET", module.CERT_URL), {})]
    assert constructed[0]["timeout"] == 2
    assert (
        constructed[0]["follow_redirects"] is False
        and constructed[0]["trust_env"] is False
    )
    assert constructed[0]["verify"].verify_mode == ssl.CERT_REQUIRED
    assert constructed[0]["verify"].check_hostname
