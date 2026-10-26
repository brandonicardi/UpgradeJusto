"""Prueba real de preparación0; únicamente clúster exclusivo y tablas de catálogo."""

import hashlib
import json
import os
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import select, update

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

# Backend is explicitly non-distributed: these imports follow the local source path.
from upgradejusto.persistence.database import build_engine  # noqa: E402
from upgradejusto.persistence.schema import components  # noqa: E402
from upgradejusto.persistence.seed import SeedConflictError, seed_catalog  # noqa: E402


def snapshot(engine):
    with engine.connect() as connection:
        rows = (
            connection.execute(
                select(components).order_by(
                    components.c.dataset_version, components.c.id
                )
            )
            .mappings()
            .all()
        )
        data = [dict(row) for row in rows]
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest(), len(
        data
    )


def main():
    runtime = json.loads((ROOT / ".local/postgresql/runtime.json").read_text())
    after_restart = "--after-restart" in sys.argv
    manifest_path = ROOT / ".local/evidence/sprint32/catalog-before-restart.json"
    expected = json.loads(manifest_path.read_text()) if after_restart else {}
    result = {}
    for key, database in [
        ("DATABASE_URL", "upgradejusto_dev"),
        ("TEST_DATABASE_URL", "upgradejusto_test"),
    ]:
        engine = build_engine(runtime[key])
        assert (
            engine.url.database == database and engine.url.username == database + "_app"
        )
        assert engine.url.host == "127.0.0.1" and engine.url.port == 55433
        assert not engine.url.query
        try:
            if not after_restart:
                os.environ["DATABASE_URL"] = runtime[key]
                command.upgrade(Config(str(ROOT / "backend/alembic.ini")), "head")
                assert seed_catalog(engine) == 14
                first = snapshot(engine)
                assert seed_catalog(engine) == 14
                assert snapshot(engine) == first
                print(
                    f"{database}: migration and seed twice verified, fourteen components"
                )
                if database.endswith("_test"):
                    with engine.begin() as connection:
                        original = (
                            connection.execute(
                                select(components).where(components.c.id == "P01")
                            )
                            .mappings()
                            .one()
                        )
                        condition = (components.c.id == "P01") & (
                            components.c.dataset_version == original["dataset_version"]
                        )
                        connection.execute(
                            update(components)
                            .where(condition)
                            .values(name="Synthetic divergence test32")
                        )
                    try:
                        try:
                            seed_catalog(engine)
                        except SeedConflictError:
                            pass
                        else:
                            raise AssertionError("Divergent seed did not abort")
                        with engine.connect() as connection:
                            assert (
                                connection.execute(
                                    select(components.c.name).where(condition)
                                ).scalar_one()
                                == "Synthetic divergence test32"
                            )
                    finally:
                        with engine.begin() as connection:
                            connection.execute(
                                update(components)
                                .where(condition)
                                .values(name=original["name"])
                            )
                    assert snapshot(engine) == first
                    print(
                        "Test-only seed divergence aborted without overwrite; own synthetic change restored"
                    )
            result[database] = list(snapshot(engine))
            if after_restart:
                assert result[database] == expected[database]
                print(
                    f"{database}: complete catalog snapshot preserved after cluster restart"
                )
        finally:
            engine.dispose()
    if not after_restart:
        manifest_path.write_text(json.dumps(result), encoding="utf-8")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(
            f"Local PG verification failed ({type(error).__name__}); sensitive values omitted"
        )
        raise SystemExit(1)
