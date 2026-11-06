"""Manual prices replace only the cash offer, atomically and with audit."""

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
import sqlalchemy as sa
from test_retail38_models import synthetic_batch

from upgradejusto.administration.repository import AdministrationRepository
from upgradejusto.administration.tables import active, manual_price_changes, roles
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import users
from upgradejusto.retail.models import VendorBatch
from upgradejusto.retail.repository import RetailRepository
from upgradejusto.retail.service import RetailService
from upgradejusto.retail.tables import publications

NOW = datetime.now(timezone.utc)
TODAY = NOW.astimezone(timezone(timedelta(hours=-3))).date()
CG_URL = "https://compragamer.com/producto/manual_900000"
VENEX_URL = "https://venex.com.ar/products/manual_900000"


class BoundEngine:
    def __init__(self, conn):
        self.conn = conn

    @contextmanager
    def begin(self):
        with self.conn.begin_nested():
            yield self.conn


def setup(pg_engine):
    conn = pg_engine.connect()
    transaction = conn.begin()
    engine = BoundEngine(conn)
    admin = uuid4()
    conn.execute(users.insert().values(id=admin))
    conn.execute(roles.insert().values(user_id=admin, role="admin"))
    initial = conn.scalar(sa.select(active.c.version))
    data = synthetic_batch(2)
    data["source_version"] = "synthetic-manual-" + uuid4().hex
    data["records"][0]["offers"][1].update(amount="150.00", availability="in_stock")
    data["records"][0]["image"] = {
        "url": (
            "https://imagenes.compragamer.com/productos/"
            "compragamer_Imganen_general_SYNTHETIC-manual.jpg"
        ),
        "alt": "SYNTHETIC manual price fixture",
        "source_url": data["records"][0]["source_url"],
        "retrieved_at": data["observed_at"],
        "rights_note": "Synthetic source mapping; not downloaded",
        "exact_variant": True,
        "status": "verified",
        "photo_bytes_verified": False,
    }
    service = RetailService(engine)
    published = service.publish(admin, VendorBatch.model_validate(data), initial)[
        "dataset_version"
    ]
    return conn, transaction, engine, admin, published, service


def price(component_id="cg-900000", amount="999.99", observed_on=TODAY, url=CG_URL):
    return {
        "component_id": component_id,
        "amount": amount,
        "observed_on": observed_on,
        "source_url": url,
    }


def test_manual_price_keeps_photo_and_list_offer_and_writes_audit(pg_engine):
    conn, transaction, engine, admin, published, service = setup(pg_engine)
    try:
        result = service.repository.publish_manual_price(
            admin, **price(), expected_active=published, now=NOW
        )
        version = result["dataset_version"]
        assert version != published
        part = PostgresCatalogRepository(engine).get("cg-900000")
        cash = next(o for o in part.offers if o.condition == "cash")
        listed = next(o for o in part.offers if o.condition == "list")
        assert cash.amount == "999.99"
        assert cash.status == "fresh"
        assert cash.source_url == CG_URL
        assert listed.amount == "150.00"
        assert part.image is not None
        assert PostgresCatalogRepository(engine).get("cg-900001").offers[0].amount == (
            "123.45"
        )
        audit = (
            conn.execute(
                sa.select(manual_price_changes).where(
                    manual_price_changes.c.dataset_version == version
                )
            )
            .mappings()
            .one()
        )
        assert audit["admin_id"] == admin
        assert audit["component_id"] == "cg-900000"
        assert audit["amount"] == Decimal("999.99")
        assert audit["currency"] == "ARS"
        assert audit["observed_on"] == TODAY
        assert audit["source_url"] == CG_URL
        publication = (
            conn.execute(
                sa.select(publications).where(publications.c.dataset_version == version)
            )
            .mappings()
            .one()
        )
        assert publication["source_version"].startswith("manual-")
        assert publication["partial_batch"] is True
        assert publication["pagination_complete"] is False
        assert conn.scalar(sa.select(active.c.version)) == version
    finally:
        transaction.rollback()
        conn.close()


def test_manual_price_rejects_invalid_amount_date_url_store_and_conflict(pg_engine):
    conn, transaction, engine, admin, published, service = setup(pg_engine)
    repository = RetailRepository(engine)
    try:
        for value in ("0.00", "-1.00", "1.234"):
            with pytest.raises(PCError) as invalid:
                repository.publish_manual_price(
                    admin,
                    **price(amount=value),
                    expected_active=published,
                    now=NOW,
                )
            assert invalid.value.status == 422
        for observed in (TODAY + timedelta(days=1), TODAY - timedelta(days=31)):
            with pytest.raises(PCError) as invalid:
                repository.publish_manual_price(
                    admin,
                    **price(observed_on=observed),
                    expected_active=published,
                    now=NOW,
                )
            assert invalid.value.status == 422
        for url in (VENEX_URL, "http://compragamer.com/producto/manual"):
            with pytest.raises(PCError) as invalid:
                repository.publish_manual_price(
                    admin, **price(url=url), expected_active=published, now=NOW
                )
            assert invalid.value.status == 422
        with pytest.raises(PCError) as invalid:
            repository.publish_manual_price(
                admin, **price(component_id="P01"), expected_active=published, now=NOW
            )
        assert invalid.value.status == 422
        with pytest.raises(PCError) as conflict:
            repository.publish_manual_price(
                admin, **price(), expected_active="not-current", now=NOW
            )
        assert conflict.value.status == 409
        assert conn.scalar(sa.select(active.c.version)) == published
    finally:
        transaction.rollback()
        conn.close()


def test_audit_failure_rolls_back_publication(pg_engine, monkeypatch):
    conn, transaction, engine, admin, published, service = setup(pg_engine)
    repository = RetailRepository(engine)
    try:
        before_publications = conn.scalar(
            sa.select(sa.func.count()).select_from(publications)
        )
        before_audit = conn.scalar(
            sa.select(sa.func.count()).select_from(manual_price_changes)
        )

        def fail(*args, **kwargs):
            raise RuntimeError("Synthetic audit failure")

        with monkeypatch.context() as patch:
            patch.setattr(AdministrationRepository, "record_manual_price", fail)
            with pytest.raises(RuntimeError, match="Synthetic audit failure"):
                repository.publish_manual_price(
                    admin, **price(), expected_active=published, now=NOW
                )
        assert conn.scalar(sa.select(active.c.version)) == published
        assert (
            conn.scalar(sa.select(sa.func.count()).select_from(publications))
            == before_publications
        )
        assert (
            conn.scalar(sa.select(sa.func.count()).select_from(manual_price_changes))
            == before_audit
        )
    finally:
        transaction.rollback()
        conn.close()
