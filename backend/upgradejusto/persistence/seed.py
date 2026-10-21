"""Seed explícito PostgreSQL, append-only; nunca llamado por HTTP/importación."""

import os

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from upgradejusto.catalog.dataset import COMPONENTS, DATASET_VERSION
from upgradejusto.persistence.database import build_engine
from upgradejusto.persistence.schema import components, datasets


class SeedConflictError(RuntimeError):
    """El mismo identificador/version contiene datos distintos; no sobrescribir."""


def component_rows() -> list[dict]:
    # mode=json preserva fechas ISO, amount string, listas, null y procedencia.
    return [
        {"dataset_version": DATASET_VERSION, **item.model_dump(mode="json")}
        for item in COMPONENTS
    ]


def component_insert(rows: list[dict]):
    return (
        insert(components)
        .values(rows)
        .on_conflict_do_nothing(
            index_elements=[components.c.dataset_version, components.c.id],
        )
    )


def assert_existing_matches(expected: dict, existing: dict) -> None:
    if any(existing.get(key) != value for key, value in expected.items()):
        raise SeedConflictError(
            "Existing catalog snapshot differs; no data overwritten"
        )


def seed_catalog(engine: Engine) -> int:
    if engine.dialect.name != "postgresql" or engine.dialect.driver != "psycopg":
        raise ValueError("Seed requires PostgreSQL with psycopg")
    rows = component_rows()
    with engine.begin() as connection:
        connection.execute(
            insert(datasets)
            .values(version=DATASET_VERSION)
            .on_conflict_do_nothing(
                index_elements=[datasets.c.version],
            )
        )
        connection.execute(component_insert(rows))
        # Comparar sin UPDATE/DELETE: una colisión divergente aborta la transacción.
        existing = (
            connection.execute(
                sa.select(components).where(
                    components.c.dataset_version == DATASET_VERSION,
                    components.c.id.in_([row["id"] for row in rows]),
                )
            )
            .mappings()
            .all()
        )
        indexed = {row["id"]: dict(row) for row in existing}
        for row in rows:
            if row["id"] not in indexed:
                raise SeedConflictError("Catalog snapshot incomplete; seed rolled back")
            assert_existing_matches(row, indexed[row["id"]])
    return len(rows)


def main() -> int:
    # Solo este comando explícito lee la variable; nunca imprimir URL/excepciones BD.
    value = os.environ.get("DATABASE_URL")
    if not value:
        print("Seed not run: DATABASE_URL is required")
        return 2
    engine = None
    try:
        engine = build_engine(value)
        count = seed_catalog(engine)
    except (ValueError, SeedConflictError, SQLAlchemyError):
        print(
            "Seed failed; check PostgreSQL/migration and snapshot consistency locally"
        )
        return 1
    finally:
        if engine is not None:
            engine.dispose()
    print(f"Catalog snapshot checked: {DATASET_VERSION}, {count} components")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
