"""PG real requerido salvo offline explícito; sin sustitutos en memoria."""

import hashlib
import hmac
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
import sqlalchemy as sa
from argon2 import PasswordHasher
from fastapi.testclient import TestClient

from upgradejusto.api.auth import service
from upgradejusto.auth.repository import AuthRepository
from upgradejusto.auth.security import HASHER, digest
from upgradejusto.auth.service import AuthService
from upgradejusto.main import app
from upgradejusto.persistence.runtime import Unavailable
from upgradejusto.persistence.schema import attempts, sessions, users

PASSWORD = "test-only-password-32"
ORIGIN = "http://127.0.0.1:3000"


@pytest.fixture
def context(pg_engine, monkeypatch):
    suffix = uuid.uuid4().hex
    email = f"b-{suffix}@example.test"
    octets = uuid.uuid4().bytes[:3]
    ip = "127." + ".".join(str(value) for value in octets)
    monkeypatch.setenv("UJ_ORIGIN", ORIGIN)
    monkeypatch.setenv("UJ_ENV", "test")
    monkeypatch.setenv("UJ_ALLOW_INSECURE_LOOPBACK", "1")
    raw_tokens = []
    try:
        with TestClient(app, base_url=ORIGIN, client=(ip, 50000)) as client:

            def bootstrap():
                response = client.get("/api/auth/csrf")
                assert response.status_code == 200
                raw_tokens.append(client.cookies.get("uj_session"))
                return {
                    "Origin": ORIGIN,
                    "X-CSRF-Token": response.json()["csrf_token"],
                }

            yield client, email, ip, bootstrap, raw_tokens
    finally:
        # Solo identidades/tokens/contadores generados por este fixture.
        with pg_engine.begin() as conn:
            ids = list(
                conn.scalars(sa.select(users.c.id).where(users.c.email == email))
            )
            conn.execute(
                sessions.delete().where(
                    sa.or_(
                        sessions.c.user_id.in_(ids),
                        sessions.c.digest.in_([digest(t) for t in raw_tokens]),
                    )
                )
            )
            conn.execute(users.delete().where(users.c.id.in_(ids)))
            conn.execute(
                attempts.delete().where(
                    attempts.c.key.in_(
                        [
                            digest("email:" + email),
                            digest("ip:" + ip),
                        ]
                    )
                )
            )


def test_register_login_rotation_logout_and_isolation(context, pg_engine):
    client, email, ip, bootstrap, raw_tokens = context
    headers = bootstrap()
    payload = {"email": email.upper(), "password": PASSWORD}
    registered = client.post("/api/auth/register", json=payload, headers=headers)
    assert registered.status_code == 201
    assert registered.json()["email"] == email
    assert set(registered.json()) == {"id", "email"}
    assert client.get("/api/auth/session").status_code == 401
    old = client.cookies.get("uj_session")
    logged = client.post("/api/auth/login", json=payload, headers=headers)
    assert logged.status_code == 200 and logged.json() == registered.json()
    new = client.cookies.get("uj_session")
    raw_tokens.append(new)
    assert new != old
    assert "HttpOnly" in logged.headers["set-cookie"]
    assert "SameSite=lax" in logged.headers["set-cookie"]
    assert "Path=/api" in logged.headers["set-cookie"]
    assert logged.headers["cache-control"] == "no-store"
    assert AuthRepository(pg_engine).session(old) is None
    assert client.get("/api/auth/session").json() == registered.json()
    with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50002)) as other:
        assert other.get("/api/auth/session").status_code == 401
    assert client.post("/api/auth/logout", headers=headers).status_code == 403
    headers = bootstrap()
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert AuthRepository(pg_engine).session(new) is None
    assert client.get("/api/auth/session").status_code == 401


def test_csrf_origin_validation_and_no_password_echo(context):
    client, email, _, bootstrap, _ = context
    headers = bootstrap()
    for origin in [None, "null", "http://evil.test"]:
        changed = {**headers}
        changed.pop("Origin")
        if origin:
            changed["Origin"] = origin
        assert client.post("/api/auth/logout", headers=changed).status_code == 403
    assert client.get("/api/auth/csrf", headers={"Origin": "null"}).status_code == 403
    assert (
        client.post(
            "/api/auth/logout", headers={**headers, "X-CSRF-Token": "bad"}
        ).status_code
        == 403
    )
    response = client.post(
        "/api/auth/register",
        headers=headers,
        json={"email": email, "password": "sensitive", "role": "admin"},
    )
    assert response.status_code == 422
    assert "sensitive" not in response.text and '"input"' not in response.text


def test_expiration_and_absolute_lifetime(context, pg_engine):
    client, _, _, bootstrap, raw_tokens = context
    bootstrap()
    repository = AuthRepository(pg_engine)
    row = repository.session(raw_tokens[-1])
    assert row["expires_at"] - row["created_at"] == timedelta(minutes=30)
    with pg_engine.begin() as conn:
        conn.execute(
            sessions.update()
            .where(sessions.c.digest == row["digest"])
            .values(
                created_at=sa.func.now() - timedelta(hours=2),
                expires_at=sa.func.now() - timedelta(hours=1),
            )
        )
    assert repository.session(raw_tokens[-1]) is None
    assert client.get("/api/auth/session").status_code == 401


def test_concurrent_unique_email_and_atomic_limit(context, pg_engine):
    _, email, ip, _, _ = context
    repo = AuthRepository(pg_engine)
    encoded = HASHER.hash(PASSWORD)

    def register(_):
        return repo.register(uuid.uuid4(), email, encoded)

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(register, range(8)))
    assert sum(value is not None for value in results) == 1

    def consume(_):
        return repo.consume_attempt(email, ip)

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(consume, range(12)))
    assert sum(value == 0 for value in results) == 5
    assert all(value > 0 for value in results if value != 0)


def test_ip_limit_shared_concurrent_and_window_reset(context, pg_engine):
    _, email, ip, _, _ = context
    repo = AuthRepository(pg_engine)
    emails = [f"{index}-{email}" for index in range(25)]
    keys = [digest("email:" + value) for value in emails]
    try:
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(
                pool.map(lambda value: repo.consume_attempt(value, ip), emails)
            )
        assert sum(value == 0 for value in results) == 20
        assert sum(value > 0 for value in results) == 5
        with pg_engine.begin() as conn:
            conn.execute(
                attempts.update()
                .where(attempts.c.key.in_([*keys, digest("ip:" + ip)]))
                .values(started_at=sa.func.now() - timedelta(minutes=16))
            )
        assert repo.consume_attempt(emails[0], ip) == 0
    finally:
        with pg_engine.begin() as conn:
            conn.execute(attempts.delete().where(attempts.c.key.in_(keys)))


def test_rehash_independent_sessions_and_connection_reopen(context, pg_engine):
    client, email, ip, bootstrap, raw_tokens = context
    repo = AuthRepository(pg_engine)
    old_hasher = PasswordHasher(time_cost=2)
    encoded = old_hasher.hash(PASSWORD)
    assert HASHER.check_needs_rehash(encoded)
    identity = uuid.uuid4()
    assert repo.register(identity, email, encoded) == identity
    headers = bootstrap()
    payload = {"email": email, "password": PASSWORD}
    response = client.post("/api/auth/login", json=payload, headers=headers)
    raw_tokens.append(client.cookies.get("uj_session"))
    assert response.status_code == 200
    stored = repo.user_by_id(identity)["password_hash"]
    assert stored != encoded and HASHER.verify(stored, PASSWORD)
    assert not HASHER.check_needs_rehash(stored)
    first = repo.session(raw_tokens[-1])
    assert first["expires_at"] - first["created_at"] == timedelta(hours=12)
    with TestClient(app, base_url=ORIGIN, client=(ip, 50001)) as other:
        csrf_response = other.get("/api/auth/csrf")
        raw_tokens.append(other.cookies.get("uj_session"))
        assert csrf_response.status_code == 200
        second_login = other.post(
            "/api/auth/login",
            json=payload,
            headers={
                "Origin": ORIGIN,
                "X-CSRF-Token": csrf_response.json()["csrf_token"],
            },
        )
        raw_tokens.append(other.cookies.get("uj_session"))
        assert second_login.status_code == 200
        second_token = raw_tokens[-1]
        second_expiry = repo.session(second_token)["expires_at"]
        headers = bootstrap()
        assert client.post("/api/auth/logout", headers=headers).status_code == 204
        assert other.get("/api/auth/session").json() == response.json()
        # Reabrir conexiones prueba persistencia PG, no reinicio del servidor.
        pg_engine.dispose()
        assert repo.session(second_token)["user_id"] == identity
        assert repo.session(second_token)["expires_at"] == second_expiry


def test_authenticated_expiry_and_revoked_cookie_http(context, pg_engine):
    client, email, _, bootstrap, raw_tokens = context
    headers = bootstrap()
    payload = {"email": email, "password": PASSWORD}
    assert (
        client.post("/api/auth/register", json=payload, headers=headers).status_code
        == 201
    )
    assert (
        client.post("/api/auth/login", json=payload, headers=headers).status_code == 200
    )
    authenticated = client.cookies.get("uj_session")
    raw_tokens.append(authenticated)
    with pg_engine.begin() as conn:
        conn.execute(
            sessions.update()
            .where(sessions.c.digest == digest(authenticated))
            .values(
                created_at=sa.func.now() - timedelta(hours=13),
                expires_at=sa.func.now() - timedelta(hours=1),
            )
        )
    assert client.get("/api/auth/session").status_code == 401
    assert client.post("/api/auth/logout", headers=headers).status_code == 403
    headers = bootstrap()
    anonymous = client.cookies.get("uj_session")
    login = client.post("/api/auth/login", json=payload, headers=headers)
    raw_tokens.append(client.cookies.get("uj_session"))
    assert login.status_code == 200
    client.cookies.set("uj_session", anonymous, domain="127.0.0.1", path="/api")
    assert client.get("/api/auth/session").status_code == 401
    assert client.post("/api/auth/logout", headers=headers).status_code == 403


def test_real_pg_missing_schema_is_generic_503(context, pg_engine, monkeypatch):
    client, _, _, bootstrap, _ = context
    bootstrap()
    missing_schema = "missing_b_test_" + uuid.uuid4().hex
    inaccessible = pg_engine.execution_options(
        schema_translate_map={None: missing_schema}
    )
    app.dependency_overrides[service] = lambda: AuthService(
        AuthRepository(inaccessible)
    )
    monkeypatch.setattr(
        "upgradejusto.catalog.postgres.runtime_engine", lambda: inaccessible
    )
    try:
        for path in ["/api/auth/session", "/api/catalog/components"]:
            response = client.get(path)
            assert response.status_code == 503
            assert response.json() == {"detail": "Service unavailable"}
            assert missing_schema not in response.text and "SELECT" not in response.text
    finally:
        app.dependency_overrides.pop(service, None)


def test_secure_cookie_https_configuration_not_real_tls(context, monkeypatch):
    _, _, _, _, raw_tokens = context
    monkeypatch.setenv("UJ_ORIGIN", "https://127.0.0.1:3000")
    monkeypatch.setenv("UJ_ALLOW_INSECURE_LOOPBACK", "0")
    with TestClient(
        app, base_url="https://127.0.0.1:3000", client=("127.0.0.1", 50003)
    ) as client:
        response = client.get("/api/auth/csrf")
        raw_tokens.append(client.cookies.get("uj_session"))
        assert response.status_code == 200
        assert "Secure" in response.headers["set-cookie"]
        response = client.post(
            "/api/auth/logout",
            headers={
                "Origin": "https://127.0.0.1:3000",
                "X-CSRF-Token": response.json()["csrf_token"],
            },
        )
        assert response.status_code == 204
        assert "Secure" in response.headers["set-cookie"]
    monkeypatch.setenv("UJ_ENV", "production")
    monkeypatch.setenv("UJ_ALLOW_INSECURE_LOOPBACK", "1")
    with pytest.raises(Unavailable):
        with TestClient(app, base_url="https://127.0.0.1:3000"):
            pytest.fail("Production must reject the insecure exception")


def test_signed_ips_have_separate_limits_and_forgery_cannot_bypass(
    context, pg_engine, monkeypatch
):
    client, email, peer, bootstrap, _ = context
    csrf = bootstrap()
    secret = b"synthetic-pg-proxy-test-only-32-bytes"
    monkeypatch.setenv("UJ_PROXY_SECRET", secret.decode())
    monkeypatch.setenv("UJ_TRUSTED_PROXY_PEERS", peer)
    ips = ["127." + ".".join(str(v) for v in uuid.uuid4().bytes[:3]) for _ in range(2)]
    emails = [f"proxy-{index}-{email}" for index in range(22)]

    def headers(ip):
        stamp = str(int(time.time()))
        canonical = "\n".join((stamp, "POST", "/api/auth/login", ip))
        return {
            **csrf,
            "X-UJ-Client-IP": ip,
            "X-UJ-Proxy-Timestamp": stamp,
            "X-UJ-Proxy-Signature": hmac.new(
                secret, canonical.encode(), hashlib.sha256
            ).hexdigest(),
        }

    keys = [digest("email:" + value) for value in emails] + [
        digest("ip:" + ip) for ip in ips
    ]
    try:
        # Usuario inexistente también consume intentos; no se crean cuentas extra.
        for index in range(20):
            response = client.post(
                "/api/auth/login",
                headers=headers(ips[0]),
                json={"email": emails[index], "password": PASSWORD},
            )
            assert response.status_code == 401
        payload = {"email": emails[20], "password": PASSWORD}
        limited = client.post("/api/auth/login", headers=headers(ips[0]), json=payload)
        assert limited.status_code == 429 and int(limited.headers["retry-after"]) > 0
        forged = headers(ips[0])
        forged["X-UJ-Client-IP"] = ips[1]
        assert (
            client.post("/api/auth/login", headers=forged, json=payload).status_code
            == 403
        )
        assert (
            client.post(
                "/api/auth/login", headers=headers(ips[1]), json=payload
            ).status_code
            == 401
        )
        with pg_engine.connect() as conn:
            count = conn.scalar(
                sa.select(attempts.c.count).where(
                    attempts.c.key == digest("ip:" + ips[1])
                )
            )
        assert count == 1
    finally:
        with pg_engine.begin() as conn:
            conn.execute(attempts.delete().where(attempts.c.key.in_(keys)))
