"""POST /api/auth/password con PG real: contraseña actual, sesiones y política."""

import uuid
from types import SimpleNamespace

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient

from upgradejusto.auth.security import digest
from upgradejusto.main import app
from upgradejusto.persistence.schema import attempts, sessions, users

PASSWORD = "test-only-password-32"
NEW_PASSWORD = "test-only-password-64"
ORIGIN = "http://127.0.0.1:3000"


def _address():
    return "127." + ".".join(str(value) for value in uuid.uuid4().bytes[:3])


@pytest.fixture
def context(pg_engine, monkeypatch):
    suffix = uuid.uuid4().hex
    emails = [f"pass-{suffix}@example.test", f"pass-b-{suffix}@example.test"]
    google_email = f"pass-google-{suffix}@example.test"
    ips = [_address(), _address(), _address()]
    google_id = uuid.uuid4()
    monkeypatch.setenv("UJ_ORIGIN", ORIGIN)
    monkeypatch.setenv("UJ_ENV", "test")
    monkeypatch.setenv("UJ_ALLOW_INSECURE_LOOPBACK", "1")
    raw_tokens = []
    try:
        with (
            TestClient(app, base_url=ORIGIN, client=(ips[0], 50020)) as client,
            TestClient(app, base_url=ORIGIN, client=(ips[1], 50021)) as other,
            TestClient(app, base_url=ORIGIN, client=(ips[2], 50022)) as google,
        ):

            def bootstrap(target):
                response = target.get("/api/auth/csrf")
                assert response.status_code == 200
                raw_tokens.append(target.cookies.get("uj_session"))
                return {
                    "Origin": ORIGIN,
                    "X-CSRF-Token": response.json()["csrf_token"],
                }

            def login(target, address, password=PASSWORD):
                headers = bootstrap(target)
                logged = target.post(
                    "/api/auth/login",
                    json={"email": address, "password": password},
                    headers=headers,
                )
                assert logged.status_code == 200, logged.text
                raw_tokens.append(target.cookies.get("uj_session"))
                return bootstrap(target)

            def authenticate(target, address):
                headers = bootstrap(target)
                payload = {"email": address, "password": PASSWORD}
                registered = target.post(
                    "/api/auth/register", json=payload, headers=headers
                )
                assert registered.status_code == 201
                return login(target, address)

            yield SimpleNamespace(
                client=client,
                other=other,
                google=google,
                email=emails[0],
                other_email=emails[1],
                google_email=google_email,
                google_id=google_id,
                pg_engine=pg_engine,
                authenticate=authenticate,
                login=login,
                bootstrap=bootstrap,
            )
    finally:
        # Solo identidades, sesiones y contadores generados por este fixture.
        with pg_engine.begin() as conn:
            ids = list(
                conn.scalars(
                    sa.select(users.c.id).where(
                        sa.or_(
                            users.c.email.in_(emails),
                            users.c.id == google_id,
                        )
                    )
                )
            )
            conn.execute(
                sessions.delete().where(
                    sa.or_(
                        sessions.c.user_id.in_(ids),
                        sessions.c.digest.in_([digest(value) for value in raw_tokens]),
                    )
                )
            )
            conn.execute(users.delete().where(users.c.id.in_(ids)))
            conn.execute(
                attempts.delete().where(
                    attempts.c.key.in_(
                        [
                            *(digest("email:" + value) for value in emails),
                            *(digest("ip:" + value) for value in ips),
                            *(digest("csrf-issue:" + value) for value in ips),
                        ]
                    )
                )
            )


def change(target, headers, current=PASSWORD, new=NEW_PASSWORD):
    return target.post(
        "/api/auth/password",
        json={"current_password": current, "new_password": new},
        headers=headers,
    )


@pytest.mark.parametrize(
    "current",
    ["x", "wrong-but-long-enough", "y" * 200],
    ids=["short", "normal", "long"],
)
def test_wrong_current_password_fails_generically_and_changes_nothing(context, current):
    client = context.client
    headers = context.authenticate(client, context.email)
    response = change(client, headers, current=current)
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid credentials"}
    assert current not in response.text
    assert client.get("/api/auth/session").status_code == 200
    # La contraseña guardada no cambió: la original sigue entrando.
    assert context.login(context.other, context.email).get("X-CSRF-Token")


def test_new_password_replaces_the_old_one(context):
    client = context.client
    headers = context.authenticate(client, context.email)
    response = change(client, headers)
    assert response.status_code == 204
    assert response.content == b""
    assert NEW_PASSWORD not in response.text
    assert PASSWORD not in response.text
    old = context.other.post(
        "/api/auth/login",
        json={"email": context.email, "password": PASSWORD},
        headers=context.bootstrap(context.other),
    )
    assert old.status_code == 401
    fresh = context.login(context.google, context.email, NEW_PASSWORD)
    assert fresh["X-CSRF-Token"]


def test_other_sessions_fall_and_the_current_one_survives(context):
    client, second = context.client, context.other
    context.authenticate(client, context.email)
    context.login(second, context.email)
    assert second.get("/api/auth/session").status_code == 200
    response = change(client, context.bootstrap(client))
    assert response.status_code == 204
    assert second.get("/api/auth/session").status_code == 401
    assert client.get("/api/auth/session").status_code == 200
    with context.pg_engine.connect() as conn:
        alive = conn.scalar(
            sa.select(sa.func.count())
            .select_from(sessions)
            .where(
                sessions.c.user_id
                == sa.select(users.c.id)
                .where(users.c.email == context.email)
                .scalar_subquery(),
                sessions.c.revoked_at.is_(None),
            )
        )
    assert alive == 1


def test_google_account_has_no_password_to_change(context):
    with context.pg_engine.begin() as conn:
        conn.execute(
            users.insert().values(
                id=context.google_id,
                email=None,
                password_hash=None,
                profile_email=context.google_email,
                display_name="Google person",
            )
        )
    client = context.google
    headers = context.bootstrap(client)
    raw = client.cookies.get("uj_session")
    with context.pg_engine.begin() as conn:
        conn.execute(
            sessions.update()
            .where(sessions.c.digest == digest(raw))
            .values(user_id=context.google_id)
        )
    assert client.get("/api/auth/session").status_code == 200
    response = change(client, headers)
    assert response.status_code == 409
    assert response.json() == {"detail": "Account has no password"}
    assert NEW_PASSWORD not in response.text
    assert client.get("/api/auth/session").status_code == 200
    with context.pg_engine.connect() as conn:
        stored = (
            conn.execute(
                sa.select(
                    users.c.email, users.c.password_hash, users.c.profile_email
                ).where(users.c.id == context.google_id)
            )
            .mappings()
            .one()
        )
    assert stored["email"] is None
    assert stored["password_hash"] is None
    assert stored["profile_email"] == context.google_email


@pytest.mark.parametrize("length", [11, 129])
def test_password_outside_policy_is_rejected(context, length):
    client = context.client
    headers = context.authenticate(client, context.email)
    candidate = "Z" * length
    response = change(client, headers, new=candidate)
    assert response.status_code == 422
    assert candidate not in response.text
    assert client.get("/api/auth/session").status_code == 200
    new_login = context.login(context.other, context.email)
    assert new_login["X-CSRF-Token"]


@pytest.mark.parametrize("length", [12, 128])
def test_password_policy_boundaries_are_accepted(context, length):
    client = context.client
    headers = context.authenticate(client, context.email)
    candidate = "Q" * length
    response = change(client, headers, new=candidate)
    assert response.status_code == 204
    assert context.login(context.other, context.email, candidate)["X-CSRF-Token"]


def test_password_change_requires_csrf_and_same_origin(context):
    client = context.client
    headers = context.authenticate(client, context.email)
    no_origin = {**headers}
    no_origin.pop("Origin")
    rejected = [
        no_origin,
        {**headers, "Origin": "http://evil.test"},
        {**headers, "Origin": "null"},
        {**headers, "X-CSRF-Token": "bad"},
        {},
    ]
    for changed in rejected:
        assert change(client, changed).status_code == 403
    assert context.login(context.other, context.email)["X-CSRF-Token"]


def test_password_change_requires_an_authenticated_session(context):
    client = context.client
    headers = context.bootstrap(client)
    assert client.get("/api/auth/session").status_code == 401
    assert change(client, headers).status_code == 401
    assert client.get("/api/auth/session").status_code == 401


def test_extra_fields_cannot_target_another_identity(context):
    client, other = context.client, context.other
    headers = context.authenticate(client, context.email)
    other_headers = context.authenticate(other, context.other_email)
    sentinel = str(uuid.uuid4())
    response = client.post(
        "/api/auth/password",
        json={
            "current_password": PASSWORD,
            "new_password": NEW_PASSWORD,
            "user_id": sentinel,
        },
        headers=headers,
    )
    assert response.status_code == 422
    assert sentinel not in response.text and '"input"' not in response.text
    assert NEW_PASSWORD not in response.text
    assert context.login(other, context.other_email)["X-CSRF-Token"]
    assert other.get("/api/auth/session").status_code == 200
    assert other_headers["X-CSRF-Token"]
