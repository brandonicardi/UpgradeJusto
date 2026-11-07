"""GIS HTTP/PG with actual official RSA verifier + synthetic public cert transport.

No real Google login, no external HTTP, no DEV mutation. Each identity is owned by
this fixture and cleaned before the existing actor fixtures remove their sessions.
"""

from concurrent.futures import ThreadPoolExecutor
from threading import Event
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from google_fixtures import CLIENT_ID
from google_fixtures import rsa_material as rsa_material
from test_pcs_postgres import ORIGIN, PASSWORD
from test_pcs_postgres import actors as actors

from upgradejusto.api.google_auth import service as google_dependency
from upgradejusto.auth.google_repository import GoogleRepository
from upgradejusto.auth.google_service import GoogleService
from upgradejusto.auth.google_tables import attempts as google_attempts
from upgradejusto.auth.google_tables import identities
from upgradejusto.auth.google_verifier import CertificateRequest, GoogleVerifier
from upgradejusto.auth.security import digest
from upgradejusto.main import app
from upgradejusto.persistence.schema import attempts, sessions, users


@pytest.fixture
def google_context(actors, pg_engine, monkeypatch, rsa_material):
    a, b = actors
    monkeypatch.setenv("UJ_GOOGLE_CLIENT_ID", CLIENT_ID)
    prefix = "synthetic-google38-" + uuid4().hex
    verifier = GoogleVerifier(CLIENT_ID, CertificateRequest(rsa_material.transport()))
    repository = GoogleRepository(pg_engine)
    previous = app.dependency_overrides.get(google_dependency)
    app.dependency_overrides[google_dependency] = lambda: GoogleService(
        repository, verifier
    )
    state = SimpleNamespace(
        a=a,
        b=b,
        prefix=prefix,
        verifier=verifier,
        repository=repository,
        crypto=rsa_material,
        raw_tokens=[],
        ips=[],
        emails=[],
    )
    try:
        yield state
    finally:
        if previous is None:
            app.dependency_overrides.pop(google_dependency, None)
        else:
            app.dependency_overrides[google_dependency] = previous
        with pg_engine.begin() as conn:
            owned = list(
                conn.scalars(
                    sa.select(identities.c.user_id).where(
                        identities.c.subject.startswith(prefix)
                    )
                )
            )
            session_ids = sa.select(sessions.c.digest).where(
                sa.or_(
                    sessions.c.user_id.in_([a[2], b[2], *owned]),
                    sessions.c.digest.in_([digest(raw) for raw in state.raw_tokens]),
                )
            )
            conn.execute(
                google_attempts.delete().where(
                    google_attempts.c.session_digest.in_(session_ids)
                )
            )
            conn.execute(identities.delete().where(identities.c.user_id.in_(owned)))
            conn.execute(
                sessions.delete().where(
                    sa.or_(
                        sessions.c.user_id.in_(owned),
                        sessions.c.digest.in_(
                            [digest(raw) for raw in state.raw_tokens]
                        ),
                    )
                )
            )
            conn.execute(users.delete().where(users.c.id.in_(owned)))
            keys = [digest("csrf-issue:" + ip) for ip in (a[3], b[3], *state.ips)]
            keys += [digest("ip:" + ip) for ip in state.ips]
            keys += [digest("email:" + email) for email in state.emails]
            conn.execute(attempts.delete().where(attempts.c.key.in_(keys)))


def issue(actor):
    response = actor[0].post("/api/auth/google/attempts", headers=actor[1])
    assert response.status_code == 200, response.text
    return response.json()


def credential(ctx, attempt, **changes):
    changes.setdefault("sub", ctx.prefix)
    return {
        "attempt_id": attempt["attempt_id"],
        "credential": ctx.crypto.signed(
            attempt["nonce"],
            **changes,
        ),
    }


def test_google_only_identity_does_not_link_local_email_and_local_login_survives(
    google_context, pg_engine
):
    ctx = google_context
    a = ctx.a
    email = a[0].get("/api/auth/session").json()["email"]
    config = a[0].get("/api/auth/google/config")
    assert config.status_code == 200 and config.json() == {
        "enabled": True,
        "client_id": CLIENT_ID,
    }
    attempt = issue(a)
    with pg_engine.connect() as conn:
        row = (
            conn.execute(
                sa.select(google_attempts).where(
                    google_attempts.c.id == UUID(attempt["attempt_id"])
                )
            )
            .mappings()
            .one()
        )
        assert row["nonce_hash"] == digest(attempt["nonce"])
        assert attempt["nonce"] not in str(dict(row))
    old = a[0].cookies.get("uj_session")
    data = credential(ctx, attempt, email=email)
    response = a[0].post("/api/auth/google", headers=a[1], json=data)
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "SameSite=lax" in response.headers["set-cookie"]
    google_user = response.json()
    assert google_user["id"] != str(a[2]) and google_user["email"] == email
    assert google_user["auth_provider"] == "google"
    assert a[0].cookies.get("uj_session") != old
    with pg_engine.connect() as conn:
        user = (
            conn.execute(sa.select(users).where(users.c.id == UUID(google_user["id"])))
            .mappings()
            .one()
        )
        assert user["email"] is None and user["password_hash"] is None
        assert user["profile_email"] == email
        assert (
            conn.scalar(
                sa.select(sessions.c.revoked_at).where(sessions.c.digest == digest(old))
            )
            is not None
        )
        assert (
            conn.scalar(
                sa.select(identities.c.issuer).where(identities.c.user_id == user["id"])
            )
            == "https://accounts.google.com"
        )
    assert a[0].get("/api/auth/session").json() == google_user
    assert a[0].get("/api/admin/revisions").status_code == 403
    a[1]["X-CSRF-Token"] = a[0].get("/api/auth/csrf").json()["csrf_token"]
    replay = a[0].post("/api/auth/google", headers=a[1], json=data)
    assert replay.status_code == 409
    local = a[0].post(
        "/api/auth/login", headers=a[1], json={"email": email, "password": PASSWORD}
    )
    assert local.status_code == 200 and local.json() == {
        "id": str(a[2]),
        "email": email,
    }
    assert "credential" not in response.text and data["credential"] not in response.text


def test_nonce_session_origin_csrf_invalid_token_and_expiry_fail_closed(
    google_context, pg_engine
):
    ctx = google_context
    a, b = ctx.a, ctx.b
    attempt = issue(a)
    data = credential(ctx, attempt)
    assert b[0].post("/api/auth/google", headers=b[1], json=data).status_code == 403
    assert (
        a[0]
        .post(
            "/api/auth/google",
            headers={**a[1], "Origin": "https://evil.example.test"},
            json=data,
        )
        .status_code
        == 403
    )
    assert (
        a[0].post("/api/auth/google", headers={"Origin": ORIGIN}, json=data).status_code
        == 403
    )
    # Wrong-session/Origin/CSRF never claims the legitimate attempt.
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(google_attempts.c.claimed_at).where(
                    google_attempts.c.id == UUID(attempt["attempt_id"])
                )
            )
            is None
        )
    invalid = credential(ctx, attempt, nonce="wrong-nonce")
    result = a[0].post("/api/auth/google", headers=a[1], json=invalid)
    assert result.status_code == 401 and invalid["credential"] not in result.text
    assert a[0].post("/api/auth/google", headers=a[1], json=data).status_code == 409
    expired = issue(a)
    with pg_engine.begin() as conn:
        from datetime import timedelta

        now = conn.scalar(sa.select(sa.func.clock_timestamp()))
        conn.execute(
            google_attempts.update()
            .where(google_attempts.c.id == UUID(expired["attempt_id"]))
            .values(
                created_at=now - timedelta(minutes=6),
                expires_at=now - timedelta(seconds=1),
            )
        )
    assert (
        a[0]
        .post("/api/auth/google", headers=a[1], json=credential(ctx, expired))
        .status_code
        == 409
    )


def test_attempt_issuance_uses_shared37_ip_budget_and_session_reuse(
    google_context, pg_engine, monkeypatch
):
    a = google_context.a
    with pg_engine.connect() as conn:
        initial = conn.scalar(
            sa.select(attempts.c.count).where(
                attempts.c.key == digest("csrf-issue:" + a[3])
            )
        )
    monkeypatch.setenv("UJ_CSRF_ISSUES_PER_15M", str(initial + 1))
    issue(a)
    denied = a[0].post("/api/auth/google/attempts", headers=a[1])
    assert denied.status_code == 429 and int(denied.headers["retry-after"]) > 0
    raw = a[0].cookies.get("uj_session")
    assert a[0].get("/api/auth/csrf").status_code == 200
    assert a[0].cookies.get("uj_session") == raw


def test_concurrent_single_use_attempt_has_one_crypto_and_one_rotation(google_context):
    ctx = google_context
    a = ctx.a
    attempt = issue(a)
    data = credential(ctx, attempt)
    original_session = a[0].cookies.get("uj_session")
    entered, release = Event(), Event()
    calls = []

    class GatedActualVerifier:
        def verify(self, raw, nonce_hash):
            calls.append(True)
            entered.set()
            assert release.wait(timeout=10), "Controlled test release timed out"
            return ctx.verifier.verify(raw, nonce_hash)

    app.dependency_overrides[google_dependency] = lambda: GoogleService(
        ctx.repository, GatedActualVerifier()
    )

    def callback():
        with TestClient(app, base_url=ORIGIN, client=(a[3], 50001)) as client:
            client.cookies.set("uj_session", original_session, path="/api")
            return client.post("/api/auth/google", headers=a[1], json=data)

    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(callback)
        try:
            assert entered.wait(timeout=10)
            second = pool.submit(callback)
            assert second.result(timeout=10).status_code == 409
        finally:
            release.set()
        assert first.result(timeout=10).status_code == 200
    assert len(calls) == 1


def test_database_failure_is503_before_verifier_and_payload_is_closed(
    google_context, pg_engine
):
    ctx = google_context
    a = ctx.a
    attempt = issue(a)
    assert (
        a[0]
        .post("/api/auth/google/attempts", headers=a[1], json={"owner_id": str(a[2])})
        .status_code
        == 422
    )
    for extra in (
        {"user_id": str(a[2])},
        {"email": "injected@example.test"},
        {"token_type": "id"},
    ):
        bad = a[0].post(
            "/api/auth/google", headers=a[1], json={**credential(ctx, attempt), **extra}
        )
        assert bad.status_code == 422
    broken = pg_engine.execution_options(
        schema_translate_map={None: "google38_missing_" + uuid4().hex}
    )

    class ForbiddenVerifier:
        def verify(self, *args):
            pytest.fail("DB failure must not invoke verification")

    app.dependency_overrides[google_dependency] = lambda: GoogleService(
        GoogleRepository(broken), ForbiddenVerifier()
    )
    response = a[0].post(
        "/api/auth/google", headers=a[1], json=credential(ctx, attempt)
    )
    assert response.status_code == 503 and response.json() == {
        "detail": "Service unavailable"
    }


def test_disabled_google_public_config_without_library_or_tokens(
    google_context, monkeypatch
):
    monkeypatch.delenv("UJ_GOOGLE_CLIENT_ID", raising=False)
    response = google_context.a[0].get("/api/auth/google/config")
    assert response.status_code == 200 and response.json() == {
        "enabled": False,
        "client_id": None,
    }
    assert (
        google_context.a[0]
        .post("/api/auth/google/attempts", headers=google_context.a[1])
        .status_code
        == 503
    )


def test_anonymous_google_flow_and_canonical_issuer_reuses_only_subject_identity(
    google_context, pg_engine
):
    ctx = google_context
    results = []
    for issuer in ("accounts.google.com", "https://accounts.google.com"):
        ip = "127." + ".".join(str(value) for value in uuid4().bytes[:3])
        ctx.ips.append(ip)
        with TestClient(app, base_url=ORIGIN, client=(ip, 50000)) as client:
            csrf = client.get("/api/auth/csrf")
            assert csrf.status_code == 200
            ctx.raw_tokens.append(client.cookies.get("uj_session"))
            headers = {"Origin": ORIGIN, "X-CSRF-Token": csrf.json()["csrf_token"]}
            challenge = client.post("/api/auth/google/attempts", headers=headers)
            assert challenge.status_code == 200
            result = client.post(
                "/api/auth/google",
                headers=headers,
                json=credential(ctx, challenge.json(), iss=issuer),
            )
            assert result.status_code == 200, result.text
            results.append(result.json())
            ctx.raw_tokens.append(client.cookies.get("uj_session"))
            headers["X-CSRF-Token"] = client.get("/api/auth/csrf").json()["csrf_token"]
            email = result.json()["email"]
            ctx.emails.append(email)
            local = client.post(
                "/api/auth/login",
                headers=headers,
                json={"email": email, "password": "synthetic-not-a-google-password"},
            )
            assert local.status_code == 401
    assert results[0]["id"] == results[1]["id"]
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(sa.func.count())
                .select_from(identities)
                .where(identities.c.subject == ctx.prefix)
            )
            == 1
        )


def test_expired_server_session_is_rejected_before_attempt_claim(
    google_context, pg_engine
):
    from datetime import timedelta

    ctx = google_context
    attempt = issue(ctx.a)
    raw = ctx.a[0].cookies.get("uj_session")
    with pg_engine.begin() as conn:
        now = conn.scalar(sa.select(sa.func.clock_timestamp()))
        conn.execute(
            sessions.update()
            .where(sessions.c.digest == digest(raw))
            .values(
                created_at=now - timedelta(minutes=2),
                expires_at=now - timedelta(seconds=1),
            )
        )
    assert (
        ctx.a[0]
        .post("/api/auth/google", headers=ctx.a[1], json=credential(ctx, attempt))
        .status_code
        == 403
    )
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(google_attempts.c.claimed_at).where(
                    google_attempts.c.id == UUID(attempt["attempt_id"])
                )
            )
            is None
        )


def test_completion_db_failure_rolls_back_identity_user_and_session_rotation(
    google_context, pg_engine, monkeypatch
):
    import upgradejusto.auth.google_service as module

    ctx = google_context
    a = ctx.a
    attempt = issue(a)
    original_session = a[0].cookies.get("uj_session")
    with pg_engine.connect() as conn:
        count_before = conn.scalar(sa.select(sa.func.count()).select_from(users))
    # Deliberately collide the NEW session digest after valid crypto and identity
    # insert. No verifier mock: the actual PG uniqueness constraint must roll back.
    monkeypatch.setattr(module, "token", lambda: original_session)
    response = a[0].post(
        "/api/auth/google", headers=a[1], json=credential(ctx, attempt)
    )
    assert response.status_code == 503
    assert a[0].cookies.get("uj_session") == original_session
    assert a[0].get("/api/auth/session").json()["id"] == str(a[2])
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(sa.select(sa.func.count()).select_from(users)) == count_before
        )
        assert (
            conn.scalar(
                sa.select(identities.c.user_id).where(
                    identities.c.subject == ctx.prefix
                )
            )
            is None
        )
        assert (
            conn.scalar(
                sa.select(sessions.c.revoked_at).where(
                    sessions.c.digest == digest(original_session)
                )
            )
            is None
        )
        row = (
            conn.execute(
                sa.select(google_attempts).where(
                    google_attempts.c.id == UUID(attempt["attempt_id"])
                )
            )
            .mappings()
            .one()
        )
        assert row["claimed_at"] is not None and row["completed_at"] is None
