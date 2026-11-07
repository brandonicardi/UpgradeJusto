"""Actual additive operations on owned synthetic prior-schema PostgreSQL."""

import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

from upgradejusto.plans.tower_tables import headers, revisions


def test_additive_tower_plan_migration_keeps_prior_rows_and_refuses_data_loss(
    pg_engine,
):
    schema = "synthetic_plan38_" + uuid4().hex
    path = (
        Path(__file__).resolve().parents[1] / "alembic/versions/d_001_torre_planes.py"
    )
    spec = importlib.util.spec_from_file_location("synthetic_plan38_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    assert migration.down_revision == "38_c_001"
    try:
        with pg_engine.begin() as base:
            base.execute(sa.schema.CreateSchema(schema))
            conn = base.execution_options(schema_translate_map={None: schema})
            local = sa.MetaData()
            users = sa.Table(
                "auth_users",
                local,
                sa.Column("id", sa.Uuid, primary_key=True),
                sa.Column("email", sa.Text, nullable=False),
            )
            pcs = sa.Table("pcs", local, sa.Column("id", sa.Uuid, primary_key=True))
            legacy = sa.Table(
                "plans",
                local,
                sa.Column("id", sa.Uuid, primary_key=True),
                sa.Column("snapshot", sa.Text, nullable=False),
            )
            local.create_all(conn)
            owner, pc, plan = uuid4(), uuid4(), uuid4()
            frozen = '{"legacy":"unchanged bytes with spaces"}'
            conn.execute(
                users.insert().values(id=owner, email="synthetic-plan@example.test")
            )
            conn.execute(pcs.insert().values(id=pc))
            conn.execute(legacy.insert().values(id=uuid4(), snapshot=frozen))
            migration.op = Operations(MigrationContext.configure(conn))
            migration.upgrade()
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            conn.execute(
                headers.insert().values(
                    id=plan,
                    owner_id=owner,
                    pc_id=pc,
                    current_revision=1,
                    create_request_id=uuid4(),
                    create_request_hash="a" * 64,
                    created_at=now,
                    updated_at=now,
                )
            )
            conn.execute(
                revisions.insert().values(
                    plan_id=plan,
                    revision=1,
                    operation_id=uuid4(),
                    request_hash="b" * 64,
                    snapshot={"kind": "tower_plan", "schema_version": 2},
                    created_at=now,
                )
            )
            with pytest.raises(RuntimeError, match="Refusing downgrade"):
                migration.downgrade()
            assert conn.scalar(sa.select(legacy.c.snapshot)) == frozen
            conn.execute(headers.delete().where(headers.c.id == plan))
            migration.downgrade()
            assert conn.scalar(sa.select(legacy.c.snapshot)) == frozen
            assert (
                conn.scalar(sa.select(users.c.email)) == "synthetic-plan@example.test"
            )
    finally:
        with pg_engine.begin() as conn:
            conn.execute(sa.schema.DropSchema(schema, cascade=True, if_exists=True))
