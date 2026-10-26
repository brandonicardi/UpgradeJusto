"""G PG real: propiedad, snapshot JSONB atómico, revisión y conservación tras PC delete."""

import hashlib
import hmac
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from test_pcs_postgres import actors as actors
from test_pcs_postgres import create

from upgradejusto.api.plans import service
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService
from upgradejusto.main import app
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import plans
from upgradejusto.plans.models import PlanUpdate
from upgradejusto.plans.repository import PlanRepository
from upgradejusto.plans.service import PlanService

BASE = "/api/plans"
GROUPS = [
    {"category": "cpu", "component_id": "P01", "quantity": 1},
    {"category": "motherboard", "component_id": "P03", "quantity": 1},
    {"category": "ram", "component_id": "P04", "quantity": 2},
]


@pytest.fixture
def plan_actors(actors, pg_engine):
    try:
        yield actors
    finally:
        with pg_engine.begin() as conn:
            conn.execute(
                plans.delete().where(
                    plans.c.owner_id.in_([actor[2] for actor in actors])
                )
            )


def payload(pc, **changes):
    return {
        "name": " Plan draft ",
        "pc_id": pc["id"],
        "expected_pc_revision": pc["revision"],
        "objective": "productivity",
        "budget_ars": "2000000.00",
        "stages": [
            {
                "name": " RAM ",
                "replacements": [
                    {
                        "category": "ram",
                        "candidates": [{"component_id": "P05", "quantity": 2}],
                    }
                ],
            }
        ],
        **changes,
    }


def save(actor, pc, **changes):
    response = actor[0].post(BASE, json=payload(pc, **changes), headers=actor[1])
    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    return response.json()


def test_snapshot_survives_pc_edit_delete_and_reconnection(plan_actors, pg_engine):
    a, _ = plan_actors
    pc = create(
        a, components=GROUPS, context={"bios_version": "P2.30", "notes": "PRIVATE"}
    )
    plan = save(a, pc)
    path = f"{BASE}/{plan['id']}"
    assert plan["revision"] == 1 and plan["name"] == "Plan draft"
    assert plan["status"] == "requires_verification"
    assert plan["cost"]["total_ars"] == "766417.98"
    assert plan["pc_revision"] == "1"
    assert plan["base_snapshot"]["context"]["notes"] == "PRIVATE"
    assert "owner_id" not in plan
    listed = a[0].get(BASE, params={"page_size": 1})
    assert listed.status_code == 200 and listed.json()["total"] == 1
    assert listed.json()["items"][0]["total_ars"] == "766417.98"
    assert "base_snapshot" not in listed.json()["items"][0]
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc
    edited = a[0].put(
        f"/api/pcs/{pc['id']}",
        headers=a[1],
        json={
            "revision": 1,
            "name": "Changed",
            "components": [],
            "context": {"bios_version": None, "notes": None},
        },
    )
    assert edited.status_code == 200
    assert a[0].get(path).json() == plan
    assert a[0].delete(f"/api/pcs/{pc['id']}", headers=a[1]).status_code == 204
    preserved = a[0].get(path).json()
    assert preserved == {**plan, "pc_id": None}
    # Nueva conexión/repositorio, no se presenta como reinicio físico de PostgreSQL.
    pg_engine.dispose()
    reread = PlanRepository(pg_engine).get(a[2], uuid.UUID(plan["id"]))
    assert reread.model_dump(mode="json") == preserved
    assert a[0].delete(path, headers=a[1]).status_code == 204
    assert a[0].get(path).status_code == 404


def test_isolation_revision_order_validation_and_rollback(plan_actors):
    a, b = plan_actors
    pc = create(a, components=GROUPS)
    foreign = create(b, components=GROUPS)
    plan = save(a, pc)
    path = f"{BASE}/{plan['id']}"
    assert b[0].get(BASE).json()["items"] == []
    assert b[0].get(path).status_code == 404
    assert (
        b[0].put(path, json=payload(foreign, revision=99), headers=b[1]).status_code
        == 404
    )
    assert b[0].delete(path, headers=b[1]).status_code == 404
    assert (
        a[0].put(path, json=payload(foreign, revision=99), headers=a[1]).status_code
        == 404
    )
    assert a[0].post(BASE, json=payload(foreign), headers=a[1]).status_code == 404
    stale = a[0].put(path, json=payload(pc, revision=99), headers=a[1])
    assert (
        stale.status_code == 409 and stale.json()["detail"] == "Plan revision conflict"
    )
    stale_pc = a[0].put(
        path, json=payload(pc, revision=1, expected_pc_revision=99), headers=a[1]
    )
    assert (
        stale_pc.status_code == 409
        and stale_pc.json()["detail"] == "PC revision conflict"
    )
    bad = payload(pc)
    bad["stages"].append(
        {
            "name": "bad",
            "replacements": [
                {
                    "category": "gpu",
                    "candidates": [{"component_id": "P99", "quantity": 1}],
                }
            ],
        }
    )
    assert a[0].post(BASE, json=bad, headers=a[1]).status_code == 422
    assert a[0].put(path, json={**bad, "revision": 1}, headers=a[1]).status_code == 422
    assert a[0].get(path).json() == plan
    assert a[0].get(BASE).json()["total"] == 1
    for extra in ({"owner_id": str(a[2])}, {"revision": True}, {"budget_ars": 1}):
        assert (
            a[0]
            .put(path, json={**payload(pc, revision=1), **extra}, headers=a[1])
            .status_code
            == 422
        )
    updated = a[0].put(
        path, json=payload(pc, revision=1, name="Recalculated"), headers=a[1]
    )
    assert updated.status_code == 200 and updated.json()["revision"] == 2
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc


def test_blocked_draft_saved_and_get_never_recalculates(plan_actors, monkeypatch):
    a, _ = plan_actors
    pc = create(a, components=GROUPS)
    stages = [
        {
            "name": "Unsupported BIOS",
            "replacements": [
                {
                    "category": "motherboard",
                    "candidates": [{"component_id": "P03", "quantity": 1}],
                    "candidate_context": {"bios_version": "P1.20"},
                }
            ],
        }
    ]
    plan = save(a, pc, stages=stages)
    assert plan["status"] == "blocked"
    assert plan["cost"]["total_ars"] is None
    assert (
        plan["missing_fields"]
        and plan["stages"][0]["evaluation"]["verdict"] == "incompatible"
    )

    def forbidden(*args, **kwargs):
        pytest.fail("GET must not evaluate new rules or reload catalogue")

    monkeypatch.setattr("upgradejusto.plans.service.calculate_plan", forbidden)
    monkeypatch.setattr(CatalogService, "snapshot", forbidden)
    assert a[0].get(f"{BASE}/{plan['id']}").json() == plan


def test_revision_concurrency_one_update_only(plan_actors, pg_engine):
    a, _ = plan_actors
    pc = create(a, components=GROUPS)
    plan = save(a, pc)
    svc = PlanService(
        PlanRepository(pg_engine), CatalogService(PostgresCatalogRepository())
    )

    def update(name):
        try:
            result = svc.save(
                a[2],
                PlanUpdate.model_validate(payload(pc, revision=1, name=name)),
                uuid.UUID(plan["id"]),
            )
            return 200, result.name
        except PCError as exc:
            return exc.status, exc.detail

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(update, ["First", "Second"]))
    assert sorted(code for code, _ in results) == [200, 409]
    persisted = a[0].get(f"{BASE}/{plan['id']}").json()
    assert persisted["revision"] == 2
    assert persisted["name"] == next(name for code, name in results if code == 200)


def test_auth_queries_gateway_and_pg_failure(plan_actors, pg_engine, monkeypatch):
    a, _ = plan_actors
    pc = create(a, components=GROUPS)
    plan = save(a, pc)
    path = f"{BASE}/{plan['id']}"
    assert a[0].post(BASE, json=payload(pc)).status_code == 403
    assert a[0].delete(path).status_code == 403
    assert (
        a[0]
        .post(BASE, headers={**a[1], "Origin": "null"}, json=payload(pc))
        .status_code
        == 403
    )
    assert a[0].get(path + "?page=1").status_code == 403
    assert a[0].get(BASE + "?owner_id=x").status_code == 403
    assert a[0].get(BASE + "?page=1&page=2").status_code == 403
    assert a[0].get(BASE + "?page_size=51").status_code == 422
    with TestClient(
        app, base_url="http://127.0.0.1:3000", client=("127.0.0.1", 50000)
    ) as anonymous:
        assert anonymous.get(path).status_code == 401
    secret = b"synthetic-G-proxy-secret-only-32bytes"
    monkeypatch.setenv("UJ_PROXY_SECRET", secret.decode())
    monkeypatch.setenv("UJ_TRUSTED_PROXY_PEERS", a[3])
    stamp, ip = str(int(time.time())), "198.51.100.46"
    canonical = "\n".join((stamp, "GET", BASE, ip))
    headers = {
        "X-UJ-Client-IP": ip,
        "X-UJ-Proxy-Timestamp": stamp,
        "X-UJ-Proxy-Signature": hmac.new(
            secret, canonical.encode(), hashlib.sha256
        ).hexdigest(),
    }
    assert a[0].get(BASE + "?page=1", headers=headers).status_code == 200
    assert a[0].get(path, headers=headers).status_code == 403
    missing = pg_engine.execution_options(
        schema_translate_map={None: "missing_g_" + uuid.uuid4().hex}
    )
    app.dependency_overrides[service] = lambda: PlanService(
        PlanRepository(missing), None
    )
    try:
        response = a[0].get(path)
        assert response.status_code == 503
        assert response.json() == {"detail": "Service unavailable"}
        assert response.headers["cache-control"] == "no-store"
    finally:
        app.dependency_overrides.pop(service, None)
