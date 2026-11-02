"""Additive E migration on isolated real PG schema, never DEV or legacy resets."""

import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

from upgradejusto.plans.tower_tables import headers, revisions
from upgradejusto.shares.tower_tables import budgets, shares


def test_e_additive_empty_downgrade_and_budget_refusal(pg_engine):
    schema = "synthetic_share38_" + uuid4().hex
    path = (
        Path(__file__).resolve().parents[1]
        / "alembic/versions/38_e_001_tower_shares.py"
    )
    spec = importlib.util.spec_from_file_location("synthetic_share38_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    assert migration.down_revision == "38_d_001"
    try:
        with pg_engine.begin() as base:
            base.execute(sa.schema.CreateSchema(schema))
            conn = base.execution_options(schema_translate_map={None: schema})
            local = sa.MetaData()
            users = sa.Table(
                "auth_users", local, sa.Column("id", sa.Uuid, primary_key=True)
            )
            sa.Table("pcs", local, sa.Column("id", sa.Uuid, primary_key=True))
            legacy = sa.Table("shares", local, sa.Column("snapshot", sa.Text))
            local.create_all(conn)
            headers.create(conn)
            revisions.create(conn)
            frozen = '{ "legacy": "same bytes" }'
            conn.execute(legacy.insert().values(snapshot=frozen))
            migration.op = Operations(MigrationContext.configure(conn))
            migration.upgrade()
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            conn.execute(
                budgets.insert().values(key_digest="a" * 64, started_at=now, count=1)
            )
            with pytest.raises(RuntimeError, match="Refusing downgrade"):
                migration.downgrade()
            assert conn.scalar(sa.select(legacy.c.snapshot)) == frozen
            conn.execute(budgets.delete().where(budgets.c.key_digest == "a" * 64))
            owner, plan = uuid4(), uuid4()
            conn.execute(users.insert().values(id=owner))
            conn.execute(
                headers.insert().values(
                    id=plan,
                    owner_id=owner,
                    current_revision=1,
                    create_request_id=uuid4(),
                    create_request_hash="b" * 64,
                    created_at=now,
                    updated_at=now,
                )
            )
            conn.execute(
                revisions.insert().values(
                    plan_id=plan,
                    revision=1,
                    operation_id=uuid4(),
                    request_hash="c" * 64,
                    snapshot={"kind": "tower_plan", "schema_version": 2},
                    created_at=now,
                )
            )
            conn.execute(
                shares.insert().values(
                    id=uuid4(),
                    plan_id=plan,
                    plan_revision=1,
                    token_digest="d" * 64,
                    title="Plan de mejora de torre",
                    projection_version="tower-share-projection-1",
                    snapshot={"kind": "shared_tower_plan", "schema_version": 2},
                    created_at=now,
                )
            )
            with pytest.raises(RuntimeError, match="Refusing downgrade"):
                migration.downgrade()
            conn.execute(shares.delete().where(shares.c.plan_id == plan))
            migration.downgrade()
            assert conn.scalar(sa.select(legacy.c.snapshot)) == frozen
    finally:
        with pg_engine.begin() as conn:
            conn.execute(sa.schema.DropSchema(schema, cascade=True, if_exists=True))
