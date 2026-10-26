"""H integración obligatoria PG: bearer aislado, snapshots y revocación sin caché."""

import hashlib
import re
import secrets
import uuid

import sqlalchemy as sa
from fastapi.testclient import TestClient
from test_pcs_postgres import actors as actors
from test_pcs_postgres import create
from test_plans_postgres import GROUPS, payload, save
from test_plans_postgres import plan_actors as plan_actors

from upgradejusto.api.shares import service
from upgradejusto.main import app
from upgradejusto.persistence.schema import plans, shares
from upgradejusto.shares.repository import ShareRepository
from upgradejusto.shares.service import ShareService

ORIGIN = "http://127.0.0.1:3000"


def publish(actor, plan):
    response = actor[0].post(
        f"/api/plans/{plan['id']}/shares",
        headers=actor[1],
        json={"expected_plan_revision": plan["revision"], "title": "Public draft"},
    )
    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    token = body["path"].removeprefix("/shared/")
    assert re.fullmatch(r"[A-Za-z0-9_-]{43}", token)
    assert set(body) == {"id", "plan_revision", "title", "created_at", "path"}
    return body, token


def test_publication_digest_immutable_projection_and_no_private_access(
    plan_actors, pg_engine
):
    a, _ = plan_actors
    pc = create(
        a, components=GROUPS, context={"bios_version": "P2.30", "notes": "PRIVATE-ONLY"}
    )
    plan = save(a, pc, name="PRIVATE-PLAN")
    publication, token = publish(a, plan)
    path = f"/api/shared-plans/{token}"
    with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50000)) as anonymous:
        response = anonymous.get(path)
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store"
        assert response.headers["referrer-policy"] == "no-referrer"
        assert response.headers["x-robots-tag"] == "noindex, nofollow"
        snapshot = response.json()
        assert snapshot["status"] == "requires_verification"
        assert snapshot["plan_revision"] == 1
        assert snapshot["cost"]["total_ars"] == "766417.98"
        assert (
            "PRIVATE-ONLY" not in response.text and "PRIVATE-PLAN" not in response.text
        )
        for key in ("pc_id", "plan_id", "owner_id", "notes", "email"):
            assert f'"{key}"' not in response.text
        for private_path in (f"/api/plans/{plan['id']}", f"/api/pcs/{pc['id']}"):
            assert (
                anonymous.get(
                    private_path, headers={"Authorization": "Bearer " + token}
                ).status_code
                == 401
            )
        updated = a[0].put(
            f"/api/plans/{plan['id']}",
            headers=a[1],
            json=payload(pc, revision=1, budget_ars="1"),
        )
        assert updated.status_code == 200 and updated.json()["status"] == "blocked"
        assert anonymous.get(path).json() == snapshot
        with pg_engine.connect() as conn:
            row = (
                conn.execute(
                    sa.select(shares).where(shares.c.id == uuid.UUID(publication["id"]))
                )
                .mappings()
                .one()
            )
            assert row["digest"] == hashlib.sha256(token.encode("ascii")).hexdigest()
            assert token not in str(dict(row))
        listed = a[0].get(f"/api/plans/{plan['id']}/shares")
        assert listed.status_code == 200 and len(listed.json()["items"]) == 1
        assert (
            "path" not in listed.text
            and token not in listed.text
            and "digest" not in listed.text
        )
        _, second_token = publish(a, updated.json())
        assert second_token != token
        assert (
            anonymous.get(f"/api/shared-plans/{second_token}").json()["status"]
            == "blocked"
        )


def test_isolation_stale_and_revoke_idempotent_then_delete_cascades(
    plan_actors, pg_engine
):
    a, b = plan_actors
    pc = create(a, components=GROUPS)
    plan = save(a, pc)
    publication, token = publish(a, plan)
    root = f"/api/plans/{plan['id']}/shares"
    data = {"expected_plan_revision": 99, "title": "Public"}
    assert b[0].post(root, headers=b[1], json=data).status_code == 404
    assert b[0].get(root).status_code == 404
    assert b[0].delete(root + "/" + publication["id"], headers=b[1]).status_code == 404
    assert a[0].post(root, headers=a[1], json=data).status_code == 409
    other = save(a, pc)
    assert (
        a[0]
        .delete(f"/api/plans/{other['id']}/shares/{publication['id']}", headers=a[1])
        .status_code
        == 404
    )
    with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50000)) as anonymous:
        url = f"/api/shared-plans/{token}"
        assert anonymous.get(url).status_code == 200
        for _ in range(2):
            assert (
                a[0].delete(root + "/" + publication["id"], headers=a[1]).status_code
                == 204
            )
        expected = {"detail": "Shared plan not found"}
        assert anonymous.get(url).status_code == 404
        assert anonymous.get(url).json() == expected
        pg_engine.dispose()
        # Reconexión PG, no se presenta como reinicio físico del servidor.
        assert (
            ShareRepository(pg_engine).public(
                hashlib.sha256(token.encode()).hexdigest()
            )
            is None
        )
        _, active = publish(a, plan)
        assert anonymous.get(f"/api/shared-plans/{active}").status_code == 200
        assert a[0].delete(f"/api/plans/{plan['id']}", headers=a[1]).status_code == 204
        assert anonymous.get(f"/api/shared-plans/{active}").json() == expected
        with pg_engine.connect() as conn:
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(shares)
                    .where(shares.c.plan_id == uuid.UUID(plan["id"]))
                )
                == 0
            )


def test_public_errors_405_pg_failure_and_private_controls(plan_actors, pg_engine):
    a, _ = plan_actors
    pc = create(a, components=GROUPS)
    plan = save(a, pc)
    _, token = publish(a, plan)
    root = f"/api/plans/{plan['id']}/shares"
    assert (
        a[0].post(root, json={"expected_plan_revision": 1, "title": "x"}).status_code
        == 403
    )
    assert a[0].get(root + "?page=1").status_code == 403
    for extra in ({"owner_id": str(a[2])}, {"token": token}, {"snapshot": {}}):
        assert (
            a[0]
            .post(
                root,
                headers=a[1],
                json={"expected_plan_revision": 1, "title": "x", **extra},
            )
            .status_code
            == 422
        )
    with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50000)) as anonymous:
        url = f"/api/shared-plans/{token}"
        for invalid in ("bad", secrets.token_urlsafe(32), "a" * 44):
            response = anonymous.get(f"/api/shared-plans/{invalid}")
            assert response.status_code == 404 and response.json() == {
                "detail": "Shared plan not found"
            }
            assert response.headers["cache-control"] == "no-store"
        for method in ("post", "put", "patch", "delete"):
            response = getattr(anonymous, method)(url)
            assert response.status_code == 405
            assert response.headers["cache-control"] == "no-store"
        assert anonymous.get(url).status_code == 200
        missing = pg_engine.execution_options(
            schema_translate_map={None: "missing_h_" + uuid.uuid4().hex}
        )
        app.dependency_overrides[service] = lambda: ShareService(
            ShareRepository(missing)
        )
        try:
            response = anonymous.get(url)
            assert response.status_code == 503 and response.json() == {
                "detail": "Service unavailable"
            }
            assert response.headers["cache-control"] == "no-store"
            assert token not in response.text
        finally:
            app.dependency_overrides.pop(service, None)


def test_pg_projection_drops_nested_private_fields_and_untrusted_citations(
    plan_actors, pg_engine
):
    a, _ = plan_actors
    pc = create(
        a,
        components=GROUPS,
        context={"bios_version": "P2.30", "notes": "SECRET-NESTED"},
    )
    plan = save(a, pc)
    with pg_engine.begin() as conn:
        snapshot = conn.scalar(
            sa.select(plans.c.snapshot).where(plans.c.id == uuid.UUID(plan["id"]))
        )
        stage = snapshot["stages"][0]
        stage["name"] = "SECRET-NESTED"
        stage["evaluated_configuration"]["owner_id"] = "SECRET-NESTED"
        stage["evaluation"]["evaluated_configuration"]["context"]["notes"] = (
            "SECRET-NESTED"
        )
        stage["evaluation"]["owner_id"] = "SECRET-NESTED"
        stage["evaluation"]["coverage"]["private"] = "SECRET-NESTED"
        stage["evaluation"]["rule_results"][0]["evidence"].append(
            {
                "source_id": "private",
                "url": "http://localhost/SECRET-NESTED",
                "locator": "SECRET-NESTED",
                "consulted_on": "2026-10-24",
            }
        )
        conn.execute(
            plans.update()
            .where(plans.c.id == uuid.UUID(plan["id"]))
            .values(snapshot=snapshot)
        )
    _, token = publish(a, plan)
    with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50000)) as anonymous:
        response = anonymous.get(f"/api/shared-plans/{token}")
        assert response.status_code == 200
        assert "SECRET-NESTED" not in response.text and "localhost" not in response.text
        assert response.json()["status"] == "requires_verification"
