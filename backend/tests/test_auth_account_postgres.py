"""PATCH /api/auth/account con PG real: nombre visible, CSRF y aislamiento."""

import uuid
from types import SimpleNamespace

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient

from upgradejusto.auth.security import digest
from upgradejusto.main import app
from upgradejusto.persistence.schema import attempts, sessions, users

PASSWORD = "test-only-password-32"
ORIGIN = "http://127.0.0.1:3000"


def _address():
    return "127." + ".".join(str(value) for value in uuid.uuid4().bytes[:3])


@pytest.fixture
def context(pg_engine, monkeypatch):
    suffix = uuid.uuid4().hex
    emails = [f"acct-{suffix}@example.test", f"acct-b-{suffix}@example.test"]
    ips = [_address(), _address()]
    monkeypatch.setenv("UJ_ORIGIN", ORIGIN)
    monkeypatch.setenv("UJ_ENV", "test")
    monkeypatch.setenv("UJ_ALLOW_INSECURE_LOOPBACK", "1")
    raw_tokens = []
    try:
        with (
            TestClient(app, base_url=ORIGIN, client=(ips[0], 50010)) as client,
            TestClient(app, base_url=ORIGIN, client=(ips[1], 50011)) as other,
        ):

            def bootstrap(target):
                response = target.get("/api/auth/csrf")
                assert response.status_code == 200
                raw_tokens.append(target.cookies.get("uj_session"))
                return {
                    "Origin": ORIGIN,
                    "X-CSRF-Token": response.json()["csrf_token"],
                }

            def authenticate(target, address):
                headers = bootstrap(target)
                payload = {"email": address, "password": PASSWORD}
                registered = target.post(
                    "/api/auth/register", json=payload, headers=headers
                )
                assert registered.status_code == 201
                logged = target.post("/api/auth/login", json=payload, headers=headers)
                assert logged.status_code == 200
                raw_tokens.append(target.cookies.get("uj_session"))
                return bootstrap(target)

            yield SimpleNamespace(
                client=client,
                other=other,
                email=emails[0],
                other_email=emails[1],
                authenticate=authenticate,
                bootstrap=bootstrap,
            )
    finally:
        # Solo identidades, sesiones y contadores generados por este fixture.
        with pg_engine.begin() as conn:
            ids = list(
                conn.scalars(sa.select(users.c.id).where(users.c.email.in_(emails)))
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
                        ]
                    )
                )
            )


def test_display_name_is_saved_trimmed_and_returned(context, pg_engine):
    client = context.client
    headers = context.authenticate(client, context.email)
    response = client.patch(
        "/api/auth/account",
        json={"display_name": "  Ada Lovelace  "},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == context.email
    assert body["display_name"] == "Ada Lovelace"
    session = client.get("/api/auth/session")
    assert session.status_code == 200
    assert session.json()["display_name"] == "Ada Lovelace"
    with pg_engine.connect() as conn:
        stored = conn.scalar(
            sa.select(users.c.display_name).where(users.c.email == context.email)
        )
    assert stored == "Ada Lovelace"


def test_two_hundred_characters_is_the_boundary(context):
    client = context.client
    headers = context.authenticate(client, context.email)
    longest = "n" * 200
    response = client.patch(
        "/api/auth/account", json={"display_name": longest}, headers=headers
    )
    assert response.status_code == 200
    assert client.get("/api/auth/session").json()["display_name"] == longest


@pytest.mark.parametrize("value", ["", "   ", " \t\r\n ", "n" * 201, "Ada\0"])
def test_invalid_display_name_is_rejected(context, value):
    client = context.client
    headers = context.authenticate(client, context.email)
    response = client.patch(
        "/api/auth/account", json={"display_name": value}, headers=headers
    )
    assert response.status_code == 422
    assert "display_name" not in client.get("/api/auth/session").json()


def test_extra_fields_are_rejected_without_echo(context, pg_engine):
    client = context.client
    headers = context.authenticate(client, context.email)
    sentinel = "11111111-1111-1111-1111-111111111111"
    response = client.patch(
        "/api/auth/account",
        json={"display_name": "Ada", "user_id": sentinel},
        headers=headers,
    )
    assert response.status_code == 422
    assert sentinel not in response.text and '"input"' not in response.text
    assert "display_name" not in client.get("/api/auth/session").json()


def test_update_requires_csrf_and_same_origin(context, pg_engine):
    client = context.client
    headers = context.authenticate(client, context.email)
    payload = {"display_name": "Ada"}
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
        response = client.patch("/api/auth/account", json=payload, headers=changed)
        assert response.status_code == 403
    assert "display_name" not in client.get("/api/auth/session").json()


def test_update_requires_an_authenticated_session(context):
    client = context.client
    headers = context.bootstrap(client)
    assert client.get("/api/auth/session").status_code == 401
    response = client.patch(
        "/api/auth/account", json={"display_name": "Ada"}, headers=headers
    )
    assert response.status_code == 401
    assert client.get("/api/auth/session").status_code == 401


def test_accounts_do_not_see_or_change_each_others_name(context, pg_engine):
    client, other = context.client, context.other
    a_headers = context.authenticate(client, context.email)
    b_headers = context.authenticate(other, context.other_email)
    first = client.patch(
        "/api/auth/account", json={"display_name": "Ada"}, headers=a_headers
    )
    assert first.status_code == 200
    assert "display_name" not in other.get("/api/auth/session").json()
    second = other.patch(
        "/api/auth/account", json={"display_name": "Grace"}, headers=b_headers
    )
    assert second.status_code == 200
    assert client.get("/api/auth/session").json()["display_name"] == "Ada"
    assert other.get("/api/auth/session").json()["display_name"] == "Grace"
    identity = client.get("/api/auth/session").json()["id"]
    extra = other.patch(
        "/api/auth/account",
        json={"display_name": "Eve", "user_id": identity},
        headers=b_headers,
    )
    assert extra.status_code == 422
    assert client.get("/api/auth/session").json()["display_name"] == "Ada"
    with pg_engine.connect() as conn:
        stored = dict(
            conn.execute(
                sa.select(users.c.email, users.c.display_name).where(
                    users.c.email.in_([context.email, context.other_email])
                )
            ).all()
        )
    assert stored == {context.email: "Ada", context.other_email: "Grace"}
