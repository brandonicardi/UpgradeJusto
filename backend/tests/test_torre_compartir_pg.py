"""Real TEST PG core, not mounted HTTP/logging proof. No shared publication writes."""

from concurrent.futures import ThreadPoolExecutor
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from test_pcs_postgres import actors as actors
from test_torre_plan_pg import body
from test_torre_plan_pg import plan_context as plan_context

from upgradejusto.pcs.service import PCError
from upgradejusto.plans.tower_models import TowerPlanCreate, TowerPlanRecalculate
from upgradejusto.shares.tower_models import TowerPublishRequest
from upgradejusto.shares.tower_repository import TowerShareRepository
from upgradejusto.shares.tower_service import TowerShareService, token_digest
from upgradejusto.shares.tower_tables import budgets, shares


def test_owner_cas_frozen_revision_revoke_after_recalculate_and_delete(
    plan_context, pg_engine
):
    ctx = plan_context
    owner, foreign = ctx.a[2], ctx.b[2]
    plan, _ = ctx.svc.save(owner, TowerPlanCreate.model_validate(body(ctx)))
    identity = UUID(str(plan["id"]))
    svc = TowerShareService(TowerShareRepository(pg_engine))
    request = TowerPublishRequest(
        expected_plan_revision=1,
        title="Plan de mejora de torre",
        public_projection_confirmed=True,
    )
    with pytest.raises(PCError) as error:
        svc.publish(
            foreign, identity, request.model_copy(update={"expected_plan_revision": 99})
        )
    assert error.value.status == 404
    with pytest.raises(PCError) as error:
        svc.publish(
            owner, identity, request.model_copy(update={"expected_plan_revision": 99})
        )
    assert error.value.status == 409
    created = svc.publish(owner, identity, request)
    digest = token_digest(created["token"])
    repo = svc.repository
    frozen = repo.public(digest)
    assert len(created["token"]) == 43
    assert "token" not in svc.list(owner, identity)["items"][0]
    assert "effective_state" not in created
    assert svc.list(owner, identity)["items"][0]["effective_state"] == "active"
    with pytest.raises(PCError) as error:
        svc.list(foreign, identity)
    assert error.value.status == 404
    recalc = TowerPlanRecalculate.model_validate(
        {**body(ctx), "expected_plan_revision": 1}
    )
    ctx.svc.save(owner, recalc, identity)
    assert repo.public(digest) == frozen
    assert (
        ctx.a[0].delete(f"/api/pcs/{ctx.saved['id']}", headers=ctx.a[1]).status_code
        == 204
    )
    assert repo.public(digest) == frozen
    ctx.svc.delete(owner, identity, 2)
    with pytest.raises(PCError) as error:
        repo.public(digest)
    assert error.value.status == 404
    assert error.value.detail == "Shared plan not found"
    deleted_listing = svc.list(owner, identity)["items"][0]
    assert deleted_listing["effective_state"] == "disabled_plan_deleted"
    assert deleted_listing["revoked_at"] is None
    assert set(deleted_listing) == {
        "id",
        "plan_revision",
        "title",
        "projection_version",
        "created_at",
        "revoked_at",
        "effective_state",
    }
    with pytest.raises(PCError) as error:
        svc.list(foreign, identity)
    assert error.value.status == 404
    svc.revoke(owner, identity, created["id"], 1)
    svc.revoke(owner, identity, created["id"], 1)
    assert svc.list(owner, identity)["items"][0]["revoked_at"] is not None
    assert svc.list(owner, identity)["items"][0]["effective_state"] == "revoked"
    with pytest.raises(PCError) as error:
        repo.public(digest)
    assert error.value.status == 404
    assert error.value.detail == "Shared plan not found"
    with pytest.raises(PCError) as error:
        svc.list(foreign, identity)
    assert error.value.status == 404
    with pg_engine.begin() as conn:
        row = (
            conn.execute(sa.select(shares).where(shares.c.id == created["id"]))
            .mappings()
            .one()
        )
        assert row["token_digest"] == digest
        assert created["token"] not in str(dict(row))
        assert row["snapshot"] == frozen


def test_pg_budget_serializes_60_and_counts_denied_attempts(pg_engine):
    repo = TowerShareRepository(pg_engine)
    key = token_digest(uuid4().hex)
    try:
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: repo.consume_read(key), range(64)))
        assert sum(allowed for allowed, _ in results) == 60
        assert all(1 <= retry <= 60 for _, retry in results)
        with pg_engine.begin() as conn:
            assert (
                conn.scalar(
                    sa.select(budgets.c.count).where(budgets.c.key_digest == key)
                )
                == 61
            )
            conn.execute(
                budgets.update()
                .where(budgets.c.key_digest == key)
                .values(
                    started_at=sa.func.clock_timestamp()
                    - sa.text("INTERVAL '61 seconds'")
                )
            )
        assert repo.consume_read(key)[0] is True
    finally:
        with pg_engine.begin() as conn:
            conn.execute(budgets.delete().where(budgets.c.key_digest == key))


def test_pg_failed_insert_rolls_back_and_cap_counts_revoked_emissions(
    plan_context, pg_engine
):
    ctx = plan_context
    owner = ctx.a[2]
    plan, _ = ctx.svc.save(owner, TowerPlanCreate.model_validate(body(ctx)))
    identity = UUID(str(plan["id"]))
    repo = TowerShareRepository(pg_engine)
    request = TowerPublishRequest(
        expected_plan_revision=1,
        title="Plan de mejora de torre",
        public_projection_confirmed=True,
    )

    class FailingGeneration:
        calls = 0

        def check(self):
            self.calls += 1
            if self.calls == 2:
                raise PCError(503, "Synthetic rollback")

        def project(self, *args):
            return {"kind": "shared_tower_plan", "schema_version": 2}

    with pytest.raises(PCError):
        repo.publish(
            owner, identity, request, token_digest(uuid4().hex), FailingGeneration()
        )
    assert repo.list(owner, identity)["items"] == []
    svc = TowerShareService(repo)
    created = svc.publish(owner, identity, request)
    with pg_engine.begin() as conn:
        row = dict(
            conn.execute(sa.select(shares).where(shares.c.id == created["id"]))
            .mappings()
            .one()
        )
        for _ in range(99):
            conn.execute(
                shares.insert().values(
                    {
                        **row,
                        "id": uuid4(),
                        "token_digest": token_digest(uuid4().hex),
                        "revoked_at": row["created_at"],
                    }
                )
            )
    with pytest.raises(PCError) as error:
        svc.publish(owner, identity, request)
    assert error.value.status == 409
    assert len(repo.list(owner, identity)["items"]) == 100
