"""PG test exacto; falta de configuración no equivale a integración omitida."""

import os
from pathlib import Path

import pytest
from alembic.config import Config

from alembic import command
from upgradejusto.persistence.database import build_engine, validate_database_url
from upgradejusto.persistence.seed import seed_catalog


@pytest.fixture(scope="session")
def pg_engine():
    integration = os.environ.get("UJ_TEST_POSTGRES")
    if integration == "0":
        pytest.skip("Modo offline explícito: integración PG NO verificada")
    if integration != "1":
        pytest.fail(
            "PG integration required: set UJ_TEST_POSTGRES=1 or explicit offline=0"
        )
    if os.environ.get("UJ_ENV") != "test":
        pytest.fail("PG integration requires explicit UJ_ENV=test")
    value = os.environ.get("DATABASE_URL", "")
    test_value = os.environ.get("TEST_DATABASE_URL", "")
    if not value or not test_value or value != test_value:
        pytest.fail(
            "PG integration requires identical DATABASE_URL and TEST_DATABASE_URL"
        )
    try:
        url = validate_database_url(value)
        authorized = (
            url.host == "127.0.0.1"
            and url.port == 55433
            and url.database == "upgradejusto_test"
            and url.username == "upgradejusto_test_app"
            and not url.query
        )
    except ValueError:
        pytest.fail("Invalid PG test configuration", pytrace=False)
    if not authorized:
        pytest.fail("PG integration target does not match the authorized test cluster")
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "head")
    engine = build_engine(value)
    try:
        assert seed_catalog(engine) == 14
        assert seed_catalog(engine) == 14
        yield engine
    finally:
        engine.dispose()
