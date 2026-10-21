"""Pruebas unitarias y compilación PostgreSQL; sin integración con BD."""

import importlib
import io
import runpy
from pathlib import Path

import psycopg
import pytest
from alembic.config import Config
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from alembic import command
from upgradejusto.catalog.dataset import COMPONENTS, DATASET_VERSION
from upgradejusto.persistence import database, seed
from upgradejusto.persistence.schema import components, datasets

BACKEND = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize(
    "url",
    [
        "sqlite://",
        "sqlite:///:memory:",
        "postgresql://localhost/catalog",
        "postgresql+asyncpg://localhost/catalog",
        "mysql://localhost/catalog",
        "not a URL",
        "postgresql+psycopg:///catalog",
        "postgresql+psycopg://localhost",
    ],
)
def test_rejects_other_drivers_and_implicit_targets(url):
    with pytest.raises(ValueError):
        database.validate_database_url(url)


def test_import_and_engine_creation_never_connect(monkeypatch):
    def forbidden(*args, **kwargs):
        pytest.fail("No database connection is allowed in preparation tests")

    monkeypatch.setattr(psycopg, "connect", forbidden)
    importlib.reload(database)
    importlib.reload(seed)
    url = "postgresql+psycopg://localhost/catalog_preparation_only"
    assert database.validate_database_url(url).drivername == "postgresql+psycopg"
    engine = database.build_engine(url)
    try:
        assert engine.dialect.name == "postgresql"
        assert engine.dialect.driver == "psycopg"
        assert engine.hide_parameters is True
    finally:
        engine.dispose()


def test_json_snapshot_preserves_exact_cu04_values():
    rows = seed.component_rows()
    assert len(rows) == 14
    assert [row["id"] for row in rows] == [item.id for item in COMPONENTS]
    for item, row in zip(COMPONENTS, rows, strict=True):
        assert row == {
            "dataset_version": DATASET_VERSION,
            **item.model_dump(mode="json"),
        }
    indexed = {row["id"]: row for row in rows}
    assert indexed["P16"]["attributes"]["vram"] is None
    assert indexed["P01"]["prices"] == []
    assert indexed["P05"]["prices"][0]["amount"] == "383208.99"
    assert indexed["P05"]["prices"][0]["date"] == "2026-10-20"
    assert indexed["P08"]["image"] is None


def test_seed_statement_uses_pg_conflict_do_nothing_not_update_or_delete():
    statement = seed.component_insert(seed.component_rows())
    compiled = str(statement.compile(dialect=postgresql.dialect()))
    assert "INSERT INTO catalog_components" in compiled
    assert "ON CONFLICT (dataset_version, id) DO NOTHING" in compiled
    assert "UPDATE" not in compiled
    assert "DELETE" not in compiled
    assert "TRUNCATE" not in compiled


def test_same_snapshot_is_allowed_and_differences_fail_without_mutation():
    row = seed.component_rows()[0]
    seed.assert_existing_matches(row, dict(row))
    changed = {**row, "name": "Existing local value must be preserved"}
    with pytest.raises(seed.SeedConflictError):
        seed.assert_existing_matches(row, changed)
    assert changed["name"] == "Existing local value must be preserved"


def test_pg_metadata_constraints_compile_without_connection():
    ddl = str(CreateTable(components).compile(dialect=postgresql.dialect()))
    assert "JSONB" in ddl
    assert "PRIMARY KEY (dataset_version, id)" in ddl
    assert "FOREIGN KEY(dataset_version) REFERENCES catalog_datasets (version)" in ddl
    assert "ck_catalog_image_unknown" in ddl
    assert "ck_catalog_category" in ddl
    assert "jsonb_typeof(attributes) = 'object'" in ddl
    assert list(datasets.primary_key.columns.keys()) == ["version"]


def test_alembic_upgrade_offline_generates_pg_sql_only(monkeypatch):
    def forbidden(*args, **kwargs):
        pytest.fail("Offline SQL generation must never connect")

    monkeypatch.setattr(psycopg, "connect", forbidden)
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg://localhost/catalog_preparation_only",
    )
    output = io.StringIO()
    config = Config(str(BACKEND / "alembic.ini"), output_buffer=output)
    command.upgrade(config, "head", sql=True)
    sql = output.getvalue()
    assert "CREATE TABLE catalog_datasets" in sql
    assert "CREATE TABLE catalog_components" in sql
    assert "JSONB" in sql
    assert "31b_a_001" in sql
    assert "DROP TABLE" not in sql


def test_destructive_downgrade_is_blocked():
    migration = runpy.run_path(
        str(BACKEND / "alembic" / "versions" / "31b_a_001_catalog.py")
    )
    with pytest.raises(RuntimeError, match="not authorized"):
        migration["downgrade"]()


def test_seed_cli_missing_url_does_not_create_engine(monkeypatch, capsys):
    monkeypatch.delenv("DATABASE_URL", raising=False)

    def forbidden(*args, **kwargs):
        pytest.fail("Missing URL must not construct an engine")

    monkeypatch.setattr(seed, "build_engine", forbidden)
    assert seed.main() == 2
    assert "DATABASE_URL is required" in capsys.readouterr().out
