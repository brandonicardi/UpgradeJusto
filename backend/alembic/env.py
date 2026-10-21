"""Entorno Alembic explícito; no participa en el arranque HTTP."""

import os

from alembic import context
from upgradejusto.persistence.database import build_engine, validate_database_url
from upgradejusto.persistence.schema import metadata


def run_migrations() -> None:
    value = os.environ.get("DATABASE_URL")
    if not value:
        raise RuntimeError("DATABASE_URL is required to run migrations")
    url = validate_database_url(value)
    if context.is_offline_mode():
        context.configure(
            url=url,
            target_metadata=metadata,
            literal_binds=True,
            dialect_opts={"paramstyle": "named"},
        )
        with context.begin_transaction():
            context.run_migrations()
        return
    engine = build_engine(value)
    try:
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=metadata)
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


run_migrations()
