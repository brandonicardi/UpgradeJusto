"""DELETE /api/auth/account con PG real: confirmación, baja total y aislamiento."""

import hashlib
import uuid
from contextlib import ExitStack
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient

from upgradejusto.administration.tables import roles
from upgradejusto.assistant.tables import conversations, messages
from upgradejusto.auth.google_tables import identities as external_identities
from upgradejusto.auth.provider_budget import leases
from upgradejusto.auth.security import digest
from upgradejusto.catalog.dataset import DATASET_VERSION
from upgradejusto.main import app
from upgradejusto.pcs.tower_tables import configurations, lines
from upgradejusto.persistence.schema import (
    attempts,
    pc_groups,
    pcs,
    plans,
    sessions,
    users,
)
from upgradejusto.persistence.schema import shares as plan_shares
from upgradejusto.plans.tower_tables import headers, progress, revisions
from upgradejusto.shares.tower_tables import shares as tower_shares

PASSWORD = "test-only-password-32"
ORIGIN = "http://127.0.0.1:3000"
CATEGORIES = (
    "cpu",
    "motherboard",
    "ram",
    "gpu",
    "psu",
    "case",
    "storage",
    "cooler",
    "fan",
)
GROUPS = [
    {"category": "cpu", "component_id": "P01", "quantity": 1},
    {"category": "motherboard", "component_id": "P03", "quantity": 1},
    {"category": "ram", "component_id": "P04", "quantity": 2},
]


def _address():
    return "127." + ".".join(str(value) for value in uuid.uuid4().bytes[:3])


def _hex(value):
    return hashlib.sha256(value.encode()).hexdigest()


def seed_person(conn, owner):
    """Datos equivalentes para una persona; respeta los CHECK de cada tabla."""
    now = datetime.now(UTC)
    legacy_pc = uuid.uuid4()
    tower_pc = uuid.uuid4()
    conn.execute(
        pcs.insert().values(id=legacy_pc, owner_id=owner, name="Legacy PC", revision=1)
    )
    conn.execute(
        pc_groups.insert().values(
            pc_id=legacy_pc,
            category="cpu",
            dataset_version=DATASET_VERSION,
            component_id="P01",
            quantity=1,
        )
    )
    conn.execute(
        pcs.insert().values(id=tower_pc, owner_id=owner, name="Tower PC", revision=1)
    )
    conn.execute(
        configurations.insert().values(
            pc_id=tower_pc,
            schema_version=2,
            category_status={category: "unknown" for category in CATEGORIES},
        )
    )
    conn.execute(
        lines.insert().values(
            pc_id=tower_pc,
            line_id=uuid.uuid4(),
            category="cpu",
            component_id=None,
            dataset_version=None,
            declared_model="Declared CPU",
            quantity=1,
            position=0,
        )
    )
    plan_id = uuid.uuid4()
    conn.execute(
        plans.insert().values(
            id=plan_id,
            owner_id=owner,
            pc_id=legacy_pc,
            name="Legacy plan",
            revision=1,
            snapshot={},
            created_at=now,
            updated_at=now,
        )
    )
    conn.execute(
        plan_shares.insert().values(
            id=uuid.uuid4(),
            plan_id=plan_id,
            owner_id=owner,
            digest=_hex("legacy-share:" + str(owner)),
            plan_revision=1,
            title="Legacy share",
            snapshot={},
            created_at=now,
        )
    )
    tower_plan_id = uuid.uuid4()
    conn.execute(
        headers.insert().values(
            id=tower_plan_id,
            owner_id=owner,
            pc_id=tower_pc,
            current_revision=1,
            create_request_id=uuid.uuid4(),
            create_request_hash=_hex("create:" + str(owner)),
            created_at=now,
            updated_at=now,
        )
    )
    conn.execute(
        revisions.insert().values(
            plan_id=tower_plan_id,
            revision=1,
            operation_id=uuid.uuid4(),
            request_hash=_hex("op:" + str(owner)),
            snapshot={"kind": "tower_plan", "schema_version": 2},
            created_at=now,
        )
    )
    conn.execute(
        progress.insert().values(
            plan_id=tower_plan_id,
            stage_key=_hex("stage:" + str(owner)),
            completed_at=now,
        )
    )
    conn.execute(
        tower_shares.insert().values(
            id=uuid.uuid4(),
            plan_id=tower_plan_id,
            plan_revision=1,
            token_digest=_hex("tower-share:" + str(owner)),
            title="Plan de mejora de torre",
            projection_version="v1",
            snapshot={"kind": "shared_tower_plan", "schema_version": 2},
            created_at=now,
        )
    )
    conversation_id = uuid.uuid4()
    conn.execute(
        conversations.insert().values(
            id=conversation_id,
            owner_id=owner,
            title="Chat",
            created_at=now,
            updated_at=now,
        )
    )
    conn.execute(
        messages.insert().values(
            id=uuid.uuid4(),
            conversation_id=conversation_id,
            sequence=1,
            request_id=uuid.uuid4(),
            role="user",
            content="hola",
            status="completed",
            citations=[],
            created_at=now,
        )
    )
    conn.execute(
        leases.insert().values(
            id=uuid.uuid4(), owner_id=owner, expires_at=now + timedelta(hours=1)
        )
    )
    conn.execute(
        external_identities.insert().values(
            issuer="https://accounts.google.com",
            subject="subject-" + str(owner),
            user_id=owner,
            created_at=now,
        )
    )


def counts(conn, owner):
    pc_ids = sa.select(pcs.c.id).where(pcs.c.owner_id == owner)
    tower_ids = sa.select(headers.c.id).where(headers.c.owner_id == owner)
    conversation_ids = sa.select(conversations.c.id).where(
        conversations.c.owner_id == owner
    )

    def count(table, condition):
        return conn.scalar(
            sa.select(sa.func.count()).select_from(table).where(condition)
        )

    return {
        "users": count(users, users.c.id == owner),
        "sessions": count(sessions, sessions.c.user_id == owner),
        "identities": count(
            external_identities, external_identities.c.user_id == owner
        ),
        "leases": count(leases, leases.c.owner_id == owner),
        "pcs": count(pcs, pcs.c.owner_id == owner),
        "pc_groups": count(pc_groups, pc_groups.c.pc_id.in_(pc_ids)),
        "tower_configurations": count(
            configurations, configurations.c.pc_id.in_(pc_ids)
        ),
        "tower_lines": count(lines, lines.c.pc_id.in_(pc_ids)),
        "plans": count(plans, plans.c.owner_id == owner),
        "plan_shares": count(plan_shares, plan_shares.c.owner_id == owner),
        "tower_plans": count(headers, headers.c.owner_id == owner),
        "tower_plan_revisions": count(revisions, revisions.c.plan_id.in_(tower_ids)),
        "tower_plan_progress": count(progress, progress.c.plan_id.in_(tower_ids)),
        "tower_plan_shares": count(tower_shares, tower_shares.c.plan_id.in_(tower_ids)),
        "conversations": count(conversations, conversations.c.owner_id == owner),
        "messages": count(messages, messages.c.conversation_id.in_(conversation_ids)),
        "roles": count(roles, roles.c.user_id == owner),
    }


@pytest.fixture
def context(pg_engine, monkeypatch):
    suffix = uuid.uuid4().hex
    emails = [f"del-a-{suffix}@example.test", f"del-b-{suffix}@example.test"]
    profile_email = f"del-g-{suffix}@example.test"
    ips = [_address() for _ in range(4)]
    google_id = uuid.uuid4()
    a_id = b_id = None
    raw_tokens = []
    monkeypatch.setenv("UJ_ORIGIN", ORIGIN)
    monkeypatch.setenv("UJ_ENV", "test")
    monkeypatch.setenv("UJ_ALLOW_INSECURE_LOOPBACK", "1")
    try:
        with ExitStack() as stack:
            clients = [
                stack.enter_context(
                    TestClient(app, base_url=ORIGIN, client=(ips[index], 50100 + index))
                )
                for index in range(4)
            ]
            client, other, a_second, google = clients

            def bootstrap(target):
                response = target.get("/api/auth/csrf")
                assert response.status_code == 200
                raw_tokens.append(target.cookies.get("uj_session"))
                return {
                    "Origin": ORIGIN,
                    "X-CSRF-Token": response.json()["csrf_token"],
                }

            def register(target, email):
                headers = bootstrap(target)
                response = target.post(
                    "/api/auth/register",
                    json={"email": email, "password": PASSWORD},
                    headers=headers,
                )
                assert response.status_code == 201, response.text

            def login(target, email):
                headers = bootstrap(target)
                response = target.post(
                    "/api/auth/login",
                    json={"email": email, "password": PASSWORD},
                    headers=headers,
                )
                assert response.status_code == 200, response.text
                raw_tokens.append(target.cookies.get("uj_session"))
                return bootstrap(target)

            register(client, emails[0])
            register(other, emails[1])
            a_headers = login(client, emails[0])
            b_headers = login(other, emails[1])
            login(a_second, emails[0])

            a_id = uuid.UUID(client.get("/api/auth/session").json()["id"])
            b_id = uuid.UUID(other.get("/api/auth/session").json()["id"])
            with pg_engine.begin() as conn:
                conn.execute(
                    users.insert().values(
                        id=google_id,
                        email=None,
                        password_hash=None,
                        profile_email=profile_email,
                        display_name="Google person",
                    )
                )
                seed_person(conn, a_id)
                seed_person(conn, b_id)
            yield SimpleNamespace(
                client=client,
                other=other,
                google=google,
                email=emails[0],
                other_email=emails[1],
                a_headers=a_headers,
                b_headers=b_headers,
                a_id=a_id,
                b_id=b_id,
                google_id=google_id,
                ips=ips,
                a_raw=client.cookies.get("uj_session"),
                bootstrap=bootstrap,
            )
    finally:
        with pg_engine.begin() as conn:
            owned = [value for value in (a_id, b_id, google_id) if value]
            user_ids = list(
                conn.scalars(sa.select(users.c.id).where(users.c.id.in_(owned)))
            )
            tokens = [digest(value) for value in raw_tokens if value]
            session_filter = sa.or_(
                sessions.c.user_id.in_(user_ids),
                sessions.c.digest.in_(tokens),
            )
            conn.execute(
                external_identities.delete().where(
                    external_identities.c.user_id.in_(user_ids)
                )
            )
            conn.execute(leases.delete().where(leases.c.owner_id.in_(user_ids)))
            conn.execute(sessions.delete().where(session_filter))
            conn.execute(
                conversations.delete().where(conversations.c.owner_id.in_(user_ids))
            )
            tower_ids = sa.select(headers.c.id).where(headers.c.owner_id.in_(user_ids))
            conn.execute(
                tower_shares.delete().where(tower_shares.c.plan_id.in_(tower_ids))
            )
            conn.execute(progress.delete().where(progress.c.plan_id.in_(tower_ids)))
            conn.execute(revisions.delete().where(revisions.c.plan_id.in_(tower_ids)))
            conn.execute(headers.delete().where(headers.c.owner_id.in_(user_ids)))
            conn.execute(
                plan_shares.delete().where(plan_shares.c.owner_id.in_(user_ids))
            )
            conn.execute(plans.delete().where(plans.c.owner_id.in_(user_ids)))
            pc_ids = sa.select(pcs.c.id).where(pcs.c.owner_id.in_(user_ids))
            conn.execute(lines.delete().where(lines.c.pc_id.in_(pc_ids)))
            conn.execute(
                configurations.delete().where(configurations.c.pc_id.in_(pc_ids))
            )
            conn.execute(pc_groups.delete().where(pc_groups.c.pc_id.in_(pc_ids)))
            conn.execute(pcs.delete().where(pcs.c.owner_id.in_(user_ids)))
            conn.execute(roles.delete().where(roles.c.user_id.in_(user_ids)))
            conn.execute(users.delete().where(users.c.id.in_(user_ids)))
            keys = [
                *(digest("email:" + email) for email in emails),
                *(
                    digest(prefix + ip)
                    for ip in ips
                    for prefix in ("ip:", "csrf-issue:")
                ),
            ]
            conn.execute(attempts.delete().where(attempts.c.key.in_(keys)))


def delete(target, headers, **body):
    payload = {"confirmation": "BORRAR", "password": PASSWORD, **body}
    return target.request("DELETE", "/api/auth/account", json=payload, headers=headers)


def test_without_confirmation_word_deletes_nothing(context, pg_engine):
    with pg_engine.connect() as conn:
        before = counts(conn, context.a_id)
    response = context.client.request(
        "DELETE",
        "/api/auth/account",
        json={"confirmation": "borrar", "password": PASSWORD},
        headers=context.a_headers,
    )
    assert response.status_code == 400
    assert context.client.get("/api/auth/session").status_code == 200
    with pg_engine.connect() as conn:
        assert counts(conn, context.a_id) == before


def test_wrong_password_deletes_nothing(context, pg_engine):
    with pg_engine.connect() as conn:
        before = counts(conn, context.a_id)
    response = delete(context.client, context.a_headers, password="wrong-password")
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid credentials"}
    assert response.text.count("wrong-password") == 0
    assert context.client.get("/api/auth/session").status_code == 200
    with pg_engine.connect() as conn:
        assert counts(conn, context.a_id) == before


def test_missing_password_on_local_account_deletes_nothing(context, pg_engine):
    with pg_engine.connect() as conn:
        before = counts(conn, context.a_id)
    response = context.client.request(
        "DELETE",
        "/api/auth/account",
        json={"confirmation": "BORRAR"},
        headers=context.a_headers,
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid credentials"}
    with pg_engine.connect() as conn:
        assert counts(conn, context.a_id) == before


def test_confirmed_deletion_removes_only_that_person(context, pg_engine):
    with pg_engine.connect() as conn:
        before_b = counts(conn, context.b_id)
    response = delete(context.client, context.a_headers)
    assert response.status_code == 204
    assert response.content == b""
    with pg_engine.connect() as conn:
        gone = counts(conn, context.a_id)
        assert all(value == 0 for value in gone.values())
        survivor = counts(conn, context.b_id)
        assert survivor == before_b
        assert all(value > 0 for key, value in survivor.items() if key != "roles")
        assert (
            conn.scalar(
                sa.select(sa.func.count())
                .select_from(attempts)
                .where(attempts.c.key == digest("email:" + context.email))
            )
            == 0
        )


def test_old_cookie_is_rejected_after_deletion(context):
    response = delete(context.client, context.a_headers)
    assert response.status_code == 204
    cookie = response.headers["set-cookie"]
    assert 'uj_session=""' in cookie
    # Starlette expira con Max-Age=0 (y un expires cercano a "ahora").
    assert "Max-Age=0" in cookie and "expires=" in cookie
    assert context.client.cookies.get("uj_session") is None
    with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50199)) as stale:
        stale.cookies.set("uj_session", context.a_raw)
        assert stale.get("/api/auth/session").status_code == 401


def test_shared_link_stops_responding(context):
    client = context.client
    created = client.post(
        "/api/pcs",
        headers=context.a_headers,
        json={
            "name": "Share PC",
            "components": GROUPS,
            "context": {"bios_version": None, "notes": None},
        },
    )
    assert created.status_code == 201, created.text
    pc = created.json()
    plan = client.post(
        "/api/plans",
        headers=context.a_headers,
        json={
            "name": "Plan draft",
            "pc_id": pc["id"],
            "expected_pc_revision": pc["revision"],
            "objective": "productivity",
            "budget_ars": "2000000.00",
            "stages": [
                {
                    "name": "RAM",
                    "replacements": [
                        {
                            "category": "ram",
                            "candidates": [{"component_id": "P05", "quantity": 2}],
                        }
                    ],
                }
            ],
        },
    )
    assert plan.status_code == 201, plan.text
    publication = client.post(
        f"/api/plans/{plan.json()['id']}/shares",
        headers=context.a_headers,
        json={
            "expected_plan_revision": plan.json()["revision"],
            "title": "Public draft",
        },
    )
    assert publication.status_code == 201, publication.text
    token = publication.json()["path"].removeprefix("/shared/")
    public_path = f"/api/shared-plans/{token}"
    assert client.get(public_path).status_code == 200
    assert delete(client, context.a_headers).status_code == 204
    assert client.get(public_path).status_code == 404


def test_last_admin_cannot_be_deleted(context, pg_engine):
    ids = (context.a_id, context.b_id)
    with pg_engine.connect() as conn:
        foreign = conn.scalar(
            sa.select(sa.func.count())
            .select_from(roles)
            .where(roles.c.user_id.not_in(ids))
        )
    if foreign:
        pytest.fail(
            "La base de test tiene administradores ajenos a esta prueba; "
            "no se tocan datos ajenos"
        )
    with pg_engine.begin() as conn:
        conn.execute(roles.insert().values(user_id=context.a_id, role="admin"))
    blocked = delete(context.client, context.a_headers)
    assert blocked.status_code == 409
    assert context.client.get("/api/auth/session").status_code == 200
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(sa.func.count())
                .select_from(users)
                .where(users.c.id == context.a_id)
            )
            == 1
        )
    with pg_engine.begin() as conn:
        conn.execute(roles.insert().values(user_id=context.b_id, role="admin"))
    assert delete(context.client, context.a_headers).status_code == 204
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(sa.func.count())
                .select_from(users)
                .where(users.c.id == context.a_id)
            )
            == 0
        )
        assert (
            conn.scalar(
                sa.select(sa.func.count())
                .select_from(roles)
                .where(roles.c.user_id == context.b_id)
            )
            == 1
        )


def test_google_account_deletes_without_password(context, pg_engine):
    headers = context.bootstrap(context.google)
    raw = context.google.cookies.get("uj_session")
    with pg_engine.begin() as conn:
        conn.execute(
            sessions.update()
            .where(sessions.c.digest == digest(raw))
            .values(user_id=context.google_id)
        )
    response = context.google.request(
        "DELETE",
        "/api/auth/account",
        json={"confirmation": "BORRAR"},
        headers=headers,
    )
    assert response.status_code == 204
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(sa.func.count())
                .select_from(users)
                .where(users.c.id == context.google_id)
            )
            == 0
        )


def test_request_boundaries(context, pg_engine):
    client = context.client
    no_origin = {**context.a_headers}
    no_origin.pop("Origin")
    rejected = [
        no_origin,
        {**context.a_headers, "Origin": "http://evil.test"},
        {**context.a_headers, "X-CSRF-Token": "bad"},
        {},
    ]
    for candidate in rejected:
        assert delete(client, candidate).status_code == 403
    with TestClient(app, base_url=ORIGIN, client=(context.ips[3], 50201)) as anonymous:
        headers = context.bootstrap(anonymous)
        assert (
            anonymous.request(
                "DELETE",
                "/api/auth/account",
                json={"confirmation": "BORRAR", "password": PASSWORD},
                headers=headers,
            ).status_code
            == 401
        )
    sentinel = str(uuid.uuid4())
    injected = delete(client, context.a_headers, user_id=sentinel)
    assert injected.status_code == 422
    assert sentinel not in injected.text and '"input"' not in injected.text
    with pg_engine.connect() as conn:
        assert counts(conn, context.a_id)["users"] == 1
