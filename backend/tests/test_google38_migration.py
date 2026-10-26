"""Actual additive Google migration on owned synthetic pre38B auth schema."""

import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

from upgradejusto.auth.google_tables import identities
from upgradejusto.persistence.schema import users


def test_google_additive_migration_preserves_local_credentials_and_refuses_destructive_downgrade(
    pg_engine,
):
    schema = "google38_old_" + uuid4().hex
    path = (
        Path(__file__).resolve().parents[1]
        / "alembic/versions/38_b_001_google_identity.py"
    )
    spec = importlib.util.spec_from_file_location("synthetic_google38_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    with pg_engine.begin() as conn:
        conn.execute(sa.schema.CreateSchema(schema))
    try:
        with pg_engine.begin() as base:
            conn = base.execution_options(schema_translate_map={None: schema})
            conn.execute(sa.select(sa.func.set_config("search_path", schema, True)))
            old = sa.MetaData()
            local = sa.Table(
                "auth_users",
                old,
                sa.Column("id", sa.Uuid, primary_key=True),
                sa.Column("email", sa.String(254), nullable=False, unique=True),
                sa.Column("password_hash", sa.Text, nullable=False),
            )
            sa.Table(
                "auth_sessions",
                old,
                sa.Column("digest", sa.String(64), primary_key=True),
                sa.Column("user_id", sa.Uuid, sa.ForeignKey("auth_users.id")),
                sa.Column("csrf_token", sa.String(43), nullable=False),
                sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
                sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
                sa.Column("revoked_at", sa.DateTime(timezone=True)),
            )
            old.create_all(conn)
            before = {
                "id": uuid4(),
                "email": "synthetic-pre-google@example.test",
                "password_hash": "SYNTHETIC unchanged legacy hash bytes",
            }
            conn.execute(local.insert().values(**before))
            migration.op = Operations(MigrationContext.configure(conn))
            migration.upgrade()
            after = (
                conn.execute(sa.select(users).where(users.c.id == before["id"]))
                .mappings()
                .one()
            )
            assert {key: after[key] for key in before} == before
            assert after["profile_email"] is None and after["display_name"] is None
            google_id = uuid4()
            conn.execute(
                users.insert().values(
                    id=google_id,
                    email=None,
                    password_hash=None,
                    profile_email="synthetic-google@example.test",
                )
            )
            conn.execute(
                identities.insert().values(
                    issuer="https://accounts.google.com",
                    subject="synthetic-migration-subject",
                    user_id=google_id,
                    created_at=sa.func.clock_timestamp(),
                )
            )
            with pytest.raises(RuntimeError, match="Refusing downgrade"):
                migration.downgrade()
            assert (
                conn.scalar(sa.select(users.c.id).where(users.c.id == google_id))
                == google_id
            )
            conn.execute(identities.delete().where(identities.c.user_id == google_id))
            conn.execute(users.delete().where(users.c.id == google_id))
            migration.downgrade()
            assert dict(conn.execute(sa.select(local)).mappings().one()) == before
            assert "profile_email" not in {
                column["name"]
                for column in sa.inspect(conn).get_columns("auth_users", schema=schema)
            }
    finally:
        with pg_engine.begin() as conn:
            conn.execute(sa.schema.DropSchema(schema, cascade=True))
