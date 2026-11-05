"""TEST PostgreSQL transactions/auth against owned synthetic PCs/plans only."""

from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from threading import Barrier
from types import SimpleNamespace
from uuid import uuid4

import pytest
import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from test_pcs_postgres import ORIGIN, create
from test_pcs_postgres import actors as actors

from upgradejusto.api.body_limits import BodyLimits
from upgradejusto.api.tower_plans import router, service
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.main import app as production
from upgradejusto.pcs.service import PCError
from upgradejusto.plans.tower_models import TowerPlanCreate
from upgradejusto.plans.tower_repository import TowerPlanRepository
from upgradejusto.plans.tower_service import (
    Generation,
    TowerPlanService,
    request_hash,
)
from upgradejusto.plans.tower_tables import headers, revisions
from upgradejusto.retail.models import REFERENCE_PRICE_VALIDITY


@pytest.fixture
def plan_context(actors, pg_engine):
    a, b = actors
    saved = create(a)
    version = PostgresCatalogRepository(pg_engine).dataset_version
    repo = TowerPlanRepository(pg_engine)
    svc = TowerPlanService(repo)
    app = FastAPI()
    app.exception_handlers.update(production.exception_handlers)
    app.include_router(router)
    app.add_middleware(BodyLimits)
    app.dependency_overrides[service] = lambda: svc
    try:
        with ExitStack() as stack:
            clients = []
            for actor in (a, b):
                client = stack.enter_context(
                    TestClient(app, base_url=ORIGIN, client=(actor[3], 50020))
                )
                client.cookies.update(actor[0].cookies)
                clients.append(client)
            yield SimpleNamespace(
                a=a,
                b=b,
                saved=saved,
                version=version,
                repo=repo,
                svc=svc,
                clients=clients,
            )
    finally:
        with pg_engine.begin() as conn:
            # Only actors belonging to this fixture; history cascades, no global reset.
            conn.execute(headers.delete().where(headers.c.owner_id.in_([a[2], b[2]])))


def body(ctx, **changes):
    return {
        "kind": "tower_plan",
        "schema_version": 2,
        "client_request_id": str(uuid4()),
        "name": "Synthetic PG plan",
        "pc_id": ctx.saved["id"],
        "expected_pc_revision": ctx.saved["revision"],
        "expected_catalog_version": ctx.version,
        "objective": "productivity",
        "workload": "blender-cpu",
        "budget_ars": "1000.00",
        "price_condition": "cash",
        "stages": [
            {
                "name": "Unknown CPU",
                "budget_ars": "1000.00",
                "materials": [],
                "actions": [
                    {
                        "action": "replace_category",
                        "category": "cpu",
                        "candidates": [
                            {
                                "declared_model": "Synthetic unknown CPU",
                                "quantity": 1,
                            }
                        ],
                    }
                ],
            }
        ],
        **changes,
    }


def test_private_plan_http_owner_csrf_cas_history_replay_and_soft_delete(plan_context):
    ctx = plan_context
    a, b = ctx.clients
    payload = body(ctx)
    root = "/api/tower-plans"
    assert b.post(root, headers=ctx.b[1], json=payload).status_code == 404
    assert a.post(root, headers={"Origin": ORIGIN}, json=payload).status_code == 403
    assert a.post(root + "?bad=1", headers=ctx.a[1], json=payload).status_code == 403
    assert (
        a.post(root, headers=ctx.a[1], json={**payload, "evidence": {}}).status_code
        == 422
    )
    created = a.post(root, headers=ctx.a[1], json=payload)
    assert created.status_code == 201, created.text
    first = created.json()
    assert first["snapshot"]["status"] == "requires_verification"
    assert (
        first["snapshot"]["stages"][0]["evaluation"]["verdict"]
        == "requiere_verificacion"
    )
    path = root + "/" + first["id"]
    assert b.get(path).status_code == 404
    replay = a.post(root, headers=ctx.a[1], json=payload)
    assert (
        replay.status_code == 200 and replay.headers["idempotency-replayed"] == "true"
    )
    assert replay.json() == first
    foreign_pc = create(ctx.b)
    assert (
        a.post(
            root, headers=ctx.a[1], json={**payload, "pc_id": foreign_pc["id"]}
        ).status_code
        == 404
    )
    assert (
        a.post(
            root, headers=ctx.a[1], json={**payload, "name": "Different"}
        ).status_code
        == 409
    )
    for changes in (
        {"expected_pc_revision": 99},
        {"expected_catalog_version": "other-version"},
    ):
        assert (
            a.post(root, headers=ctx.a[1], json=body(ctx, **changes)).status_code == 409
        )
    update = {
        **payload,
        "client_request_id": str(uuid4()),
        "expected_plan_revision": 1,
        "name": "Synthetic revision2",
    }
    assert (
        b.post(path + "/recalculate", headers=ctx.b[1], json=update).status_code == 404
    )
    changed = a.post(path + "/recalculate", headers=ctx.a[1], json=update)
    assert changed.status_code == 200 and changed.json()["revision"] == 2
    assert a.get(path + "/revisions/1").json() == first
    assert a.post(root, headers=ctx.a[1], json=payload).json() == first
    assert (
        a.post(path + "/recalculate", headers=ctx.a[1], json=update).json()
        == changed.json()
    )
    assert (
        a.post(
            path + "/recalculate",
            headers=ctx.a[1],
            json={**update, "pc_id": foreign_pc["id"]},
        ).status_code
        == 404
    )
    third = {
        **update,
        "client_request_id": str(uuid4()),
        "expected_plan_revision": 2,
        "name": "Synthetic revision3",
    }
    assert (
        a.post(path + "/recalculate", headers=ctx.a[1], json=third).json()["revision"]
        == 3
    )
    assert (
        a.post(path + "/recalculate", headers=ctx.a[1], json=update).json()
        == changed.json()
    )
    stale = {**update, "client_request_id": str(uuid4())}
    assert (
        a.post(path + "/recalculate", headers=ctx.a[1], json=stale).status_code == 409
    )
    listed = a.get(root + "?page=1&page_size=1")
    assert listed.status_code == 200 and listed.json()["total"] == 1
    assert ctx.a[0].get(f"/api/pcs/{ctx.saved['id']}").json() == ctx.saved
    assert (
        a.request(
            "DELETE", path, headers=ctx.a[1], json={"expected_plan_revision": 1}
        ).status_code
        == 409
    )
    assert (
        a.request(
            "DELETE", path, headers=ctx.a[1], json={"expected_plan_revision": 3}
        ).status_code
        == 204
    )
    assert a.get(path).status_code == 404
    assert a.post(root, headers=ctx.a[1], json=payload).status_code == 404


def test_real_pg_parallel_create_idempotency_and_rollback_after_history(
    plan_context, pg_engine, monkeypatch
):
    ctx = plan_context
    request = TowerPlanCreate.model_validate(body(ctx))
    barrier = Barrier(2)

    def save():
        barrier.wait(timeout=5)
        return ctx.svc.save(ctx.a[2], request)

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(save) for _ in range(2)]
        results = [future.result(timeout=15) for future in futures]
    assert sorted(replayed for _, replayed in results) == [False, True]
    assert results[0][0] == results[1][0]
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(sa.func.count())
                .select_from(revisions)
                .where(revisions.c.plan_id == results[0][0]["id"])
            )
            == 1
        )
    failed = TowerPlanCreate.model_validate(body(ctx))
    generation = Generation(failed)
    original = generation.before_commit
    calls = []
    seen = []
    calculate = generation.calculate

    def full_snapshot(tower, catalog, version, now):
        seen.append(set(catalog))
        return calculate(tower, catalog, version, now)

    monkeypatch.setattr(generation, "calculate", full_snapshot)

    def after_write(snapshot, now):
        original(snapshot, now)
        calls.append(True)
        if len(calls) == 2:
            raise PCError(503, "Synthetic failure after history insert")

    monkeypatch.setattr(generation, "before_commit", after_write)
    with pytest.raises(PCError):
        ctx.repo.save(ctx.a[2], failed, request_hash(failed), generation)
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(headers.c.id).where(
                    headers.c.owner_id == ctx.a[2],
                    headers.c.create_request_id == failed.client_request_id,
                )
            )
            is None
        )
    assert len(calls) == 2
    assert seen == [{part.id for part in PostgresCatalogRepository(pg_engine).all()}]
    assert ctx.a[0].get(f"/api/pcs/{ctx.saved['id']}").json() == ctx.saved


def test_frozen_get_replay_no_catalog_access_and_revoked_session(
    plan_context, pg_engine, monkeypatch
):
    import upgradejusto.plans.tower_repository as module

    ctx = plan_context
    a = ctx.clients[0]
    payload = body(ctx)
    result = a.post("/api/tower-plans", headers=ctx.a[1], json=payload)
    assert result.status_code == 201
    saved = result.json()
    # Owned historical fixture: synthetic quote observed in the past.
    # Insert history, never UPDATE an existing revision or claim live retail data.
    historical_id = uuid4()
    then = datetime.now(UTC) - timedelta(days=2)
    document = deepcopy(saved["snapshot"])
    quote = {
        "offer_id": "synthetic-expired-history",
        "amount": "12.00",
        "currency": "ARS",
        "status": "fresh",
        "availability": "in_stock",
        "observed_at": then.isoformat(),
        "expires_at": (then + REFERENCE_PRICE_VALIDITY).isoformat(),
        "source_url": "https://example.test/synthetic-history",
    }
    document["stages"][0]["offers"] = [quote]
    document["generated_at"] = then.isoformat()
    with pg_engine.begin() as conn:
        conn.execute(
            headers.insert().values(
                id=historical_id,
                owner_id=ctx.a[2],
                pc_id=ctx.saved["id"],
                current_revision=1,
                create_request_id=uuid4(),
                create_request_hash="c" * 64,
                created_at=then,
                updated_at=then,
            )
        )
        conn.execute(
            revisions.insert().values(
                plan_id=historical_id,
                revision=1,
                operation_id=uuid4(),
                request_hash="d" * 64,
                snapshot=document,
                created_at=then,
            )
        )

    def forbidden(*args):
        pytest.fail("GET/history/idempotent replay must not resolve live catalog")

    monkeypatch.setattr(module, "published_catalog_snapshot", forbidden)
    path = "/api/tower-plans/" + saved["id"]
    assert a.get(path).json() == saved
    assert a.get(path + "/revisions/1").json() == saved
    assert a.post("/api/tower-plans", headers=ctx.a[1], json=payload).json() == saved
    historical = a.get(f"/api/tower-plans/{historical_id}")
    assert historical.status_code == 200
    assert historical.json()["snapshot"] == document
    assert historical.json()["snapshot"]["stages"][0]["offers"][0] == quote
    # Existing auth service revokes the real session; no identity override in tests.
    logout = ctx.a[0].post("/api/auth/logout", headers=ctx.a[1])
    assert logout.status_code == 204
    assert a.get(path).status_code == 401
