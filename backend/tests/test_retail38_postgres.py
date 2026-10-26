"""Real TEST PostgreSQL, outer rollback; no SQLite substitutes or real accounts."""

from contextlib import contextmanager
from copy import deepcopy
from uuid import uuid4

import pytest
import sqlalchemy as sa
from test_retail38_models import synthetic_batch

from upgradejusto.administration.repository import AdministrationRepository
from upgradejusto.administration.tables import active, roles, rows
from upgradejusto.catalog.postgres import (
    PostgresCatalogRepository,
    published_catalog_snapshot,
)
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import components, users
from upgradejusto.retail.models import VendorBatch
from upgradejusto.retail.service import RetailService
from upgradejusto.retail.tables import publications, resources


class BoundEngine:
    def __init__(self, conn):
        self.conn = conn

    @contextmanager
    def begin(self):
        with self.conn.begin_nested():
            yield self.conn


def test_publication_atomic_history_idempotent_and_role_fresh(pg_engine, monkeypatch):
    with pg_engine.connect() as conn:
        transaction = conn.begin()
        try:
            engine = BoundEngine(conn)
            admin, ordinary = uuid4(), uuid4()
            conn.execute(users.insert(), [{"id": admin}, {"id": ordinary}])
            conn.execute(roles.insert().values(user_id=admin, role="admin"))
            initial = conn.scalar(sa.select(active.c.version))
            before = published_catalog_snapshot(conn, initial)
            service = RetailService(engine)
            data = synthetic_batch()
            # Unique source version per invocation, all records explicitly synthetic.
            data["source_version"] = "synthetic-" + uuid4().hex
            batch = VendorBatch.model_validate(data)
            with pytest.raises(PCError) as denied:
                service.publish(ordinary, batch, initial)
            assert denied.value.status == 403
            assert conn.scalar(sa.select(active.c.version)) == initial
            # Fail after revision/dataset/components inserts, not before transaction.
            publication_count = conn.scalar(
                sa.select(sa.func.count()).select_from(publications)
            )

            def injected_failure():
                raise RuntimeError("Synthetic mid-publication failure")

            with monkeypatch.context() as patch:
                patch.setattr(resources, "insert", injected_failure)
                with pytest.raises(RuntimeError, match="Synthetic mid-publication"):
                    service.publish(admin, batch, initial)
            assert conn.scalar(sa.select(active.c.version)) == initial
            assert (
                conn.scalar(sa.select(sa.func.count()).select_from(publications))
                == publication_count
            )
            assert published_catalog_snapshot(conn, initial) == before
            result = service.publish(admin, batch, initial)
            version = result["dataset_version"]
            repo = PostgresCatalogRepository(engine)
            assert len(repo.all()) == len(before.components) + 61
            assert repo.get("cg-900060").offers[0].amount == "123.45"
            assert repo.get("cg-900060").attributes == {}
            assert all(p.image is None for p in repo.all())
            assert published_catalog_snapshot(conn, initial) == before
            assert service.publish(admin, batch, "not-current")["idempotent"]
            assert conn.scalar(sa.select(active.c.version)) == version
            changed = deepcopy(data)
            changed["records"][0]["name"] = "SYNTHETIC changed source content"
            with pytest.raises(PCError):
                service.publish(admin, VendorBatch.model_validate(changed), version)
            changed["source_version"] += "-conflict"
            changed["records"][0]["mpn"] = "OTHER-SYNTHETIC-VARIANT"
            conflict = service.publish(
                admin, VendorBatch.model_validate(changed), version
            )
            assert conflict["quarantine"][0]["product_id"] == "900000"
            # Previous valid evidence is retained, never moved to another variant.
            assert (
                PostgresCatalogRepository(engine).get("cg-900000").name
                == batch.records[0].name
            )
            assert all(
                o.status == "unavailable"
                for o in PostgresCatalogRepository(engine).get("cg-900000").offers
            )
            # Original publication is still readable with its original offer evidence.
            original = published_catalog_snapshot(conn, version)
            assert (
                next(p for p in original.components if p.id == "cg-900000")
                .offers[0]
                .amount
                == "123.45"
            )
            administration = AdministrationRepository(engine)
            draft = administration.create(admin, conflict["dataset_version"])
            administration.publish(admin, draft["id"], conflict["dataset_version"])
            assert PostgresCatalogRepository(engine).get("cg-900060").offers
            count = conn.scalar(sa.select(sa.func.count()).select_from(publications))
            conn.execute(roles.delete().where(roles.c.user_id == admin))
            with pytest.raises(PCError):
                service.publish(admin, batch, draft["id"])
            assert (
                conn.scalar(sa.select(sa.func.count()).select_from(publications))
                == count
            )
            assert (
                conn.scalar(
                    sa.select(components.c.image).where(
                        components.c.dataset_version == version,
                        components.c.id == "cg-900000",
                    )
                )
                is None
            )
        finally:
            transaction.rollback()


def test_commercial_refresh_preserves_cu10_curation_and_history(pg_engine):
    """All attributes/prices below are synthetic, not manufacturer evidence."""
    with pg_engine.connect() as conn:
        transaction = conn.begin()
        try:
            engine = BoundEngine(conn)
            admin = uuid4()
            conn.execute(users.insert().values(id=admin))
            conn.execute(roles.insert().values(user_id=admin, role="admin"))
            initial = conn.scalar(sa.select(active.c.version))
            data = synthetic_batch(1)
            data["source_version"] = "synthetic-curation-" + uuid4().hex
            service = RetailService(engine)
            first = service.publish(admin, VendorBatch.model_validate(data), initial)
            first_version = first["dataset_version"]
            first_snapshot = published_catalog_snapshot(conn, first_version)
            administration = AdministrationRepository(engine)
            draft = administration.create(admin, first_version)
            # Existing synthetic source backs this synthetic curation. Identity,
            # category, name and sources remain unchanged by the admin edit.
            attributes = {"socket": "SYNTHETIC-TEST-SOCKET"}
            administration.write(
                admin,
                draft["id"],
                "components",
                {"attributes": attributes},
                row_id="cg-900000",
            )
            administration.publish(admin, draft["id"], first_version)
            curated_version = draft["id"]
            curated_snapshot = published_catalog_snapshot(conn, curated_version)

            def entries_for(version):
                return {
                    (row["collection"], row["id"]): row["data"]
                    for row in conn.execute(
                        sa.select(rows).where(rows.c.revision_id == version)
                    ).mappings()
                }

            curated_entries = entries_for(curated_version)
            refreshed = deepcopy(data)
            refreshed["source_version"] += "-refresh"
            refreshed["records"][0]["offers"][0]["amount"] = "234.56"
            result = service.publish(
                admin, VendorBatch.model_validate(refreshed), curated_version
            )
            assert result["quarantine"] == []
            current = PostgresCatalogRepository(engine).get("cg-900000")
            curated = next(
                p for p in curated_snapshot.components if p.id == "cg-900000"
            )
            assert current.attributes == attributes
            assert current.sources == curated.sources
            assert current.name == curated.name
            assert current.prices == curated.prices
            assert current.offers[0].amount == "234.56"
            assert entries_for(result["dataset_version"]) == curated_entries
            assert published_catalog_snapshot(conn, first_version) == first_snapshot
            assert published_catalog_snapshot(conn, curated_version) == curated_snapshot
            assert entries_for(curated_version) == curated_entries
            assert curated.attributes == attributes
            assert curated.offers[0].amount == "123.45"
        finally:
            transaction.rollback()
