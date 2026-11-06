"""Admin dashboard metrics and role/CSRF boundaries on real PostgreSQL."""

import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

import sqlalchemy as sa
from test_cu02_cu10_postgres import admin_actors as admin_actors
from test_pcs_postgres import actors as actors
from test_plans_postgres import plan_actors as plan_actors

from upgradejusto.administration.repository import AdministrationRepository
from upgradejusto.administration.tables import active, revisions, roles
from upgradejusto.persistence.schema import components, datasets, users
from upgradejusto.retail.tables import resources

CATEGORIES = (
    "cpu",
    "motherboard",
    "ram",
    "gpu",
    "psu",
    "case",
    "storage",
    "cooler",
    "fan",
)
CG_URL = "https://compragamer.com/producto/manual_900000"


class BoundEngine:
    def __init__(self, conn):
        self.conn = conn

    @contextmanager
    def begin(self):
        with self.conn.begin_nested():
            yield self.conn


def offer(component_id, observed_at, amount="123.45", condition="cash"):
    return {
        "offer_id": f"{component_id}:synthetic:{condition}",
        "store": "compragamer",
        "product_id": component_id.split("-")[-1],
        "component_id": component_id,
        "variant_key": "synthetic",
        "amount": amount,
        "currency": "ARS",
        "condition": condition,
        "availability": "in_stock",
        "stock_quantity": 1,
        "source_url": f"https://compragamer.com/producto/{component_id}",
        "observed_at": observed_at.isoformat(),
        "expires_at": (observed_at + timedelta(days=30)).isoformat(),
        "status": "fresh",
    }


def test_dashboard_metrics_lists_and_active_revision_only(pg_engine):
    now = datetime.now(timezone.utc).replace(microsecond=0)
    version = "synthetic-dashboard-" + uuid.uuid4().hex
    with pg_engine.connect() as conn:
        transaction = conn.begin()
        try:
            admin = uuid.uuid4()
            conn.execute(users.insert().values(id=admin))
            conn.execute(roles.insert().values(user_id=admin, role="admin"))
            conn.execute(datasets.insert().values(version=version))
            conn.execute(
                revisions.insert().values(id=version, base_version=None, status="draft")
            )
            parts = []
            records = []
            for index, (component_id, category, age, amount) in enumerate(
                (
                    ("cg-900000", "cpu", 0, "123.45"),
                    ("cg-900001", "motherboard", 7, "123.45"),
                    ("cg-900002", "ram", 8, None),
                    ("cg-900003", "gpu", 8, "123.45"),
                )
            ):
                parts.append(
                    {
                        "dataset_version": version,
                        "id": component_id,
                        "category": category,
                        "name": f"SYNTHETIC dashboard {index}",
                        "attributes": {},
                        "sources": [],
                        "prices": [],
                        "image": None,
                    }
                )
                records.append(
                    {
                        "dataset_version": version,
                        "component_id": component_id,
                        "identity": {
                            "store": "compragamer",
                            "product_id": component_id.split("-")[-1],
                            "variant_key": "synthetic",
                        },
                        "image_evidence": None,
                        "offers": [
                            offer(component_id, now - timedelta(days=age), amount)
                        ],
                    }
                )
            conn.execute(components.insert(), parts)
            conn.execute(resources.insert(), records)
            conn.execute(
                revisions.update()
                .where(revisions.c.id == version)
                .values(status="published")
            )
            conn.execute(
                active.update().where(active.c.singleton == 1).values(version=version)
            )
            body = AdministrationRepository(BoundEngine(conn)).dashboard(
                admin, {"cg-900000": 3}, 100, 0, now=now
            )
            assert body["dataset_version"] == version
            assert body["metrics"] == {
                "components": 4,
                "missing_data": 4,
                "without_recent_price": 2,
                "stores": 1,
            }
            assert body["old_prices"]["total"] == 1
            oldest = body["old_prices"]["items"][0]
            assert oldest["component_id"] == "cg-900003"
            assert oldest["amount"] == "123.45"
            assert oldest["days"] == 8
            assert oldest["store"] == "compragamer"
            missing = {
                item["component_id"]: item for item in body["missing_data"]["items"]
            }
            assert missing["cg-900000"]["affected_pcs"] == 3
            assert "socket" in missing["cg-900000"]["missing"]
            assert "capacity_gb" in missing["cg-900002"]["missing"]
            assert missing["cg-900002"]["affected_pcs"] == 0
        finally:
            transaction.rollback()


def test_admin_routes_require_role_and_reject_body_user_id(admin_actors, pg_engine):
    a, b = admin_actors
    with pg_engine.begin() as conn:
        current = conn.scalar(sa.select(active.c.version))
    assert a[0].get("/api/admin/dashboard").status_code == 200
    assert b[0].get("/api/admin/dashboard").status_code == 403
    valid = {
        "expected_active": current,
        "component_id": "cg-900000",
        "amount": "999.99",
        "observed_on": datetime.now(timezone.utc).date().isoformat(),
        "source_url": CG_URL,
    }
    assert b[0].post("/api/admin/prices", headers=b[1], json=valid).status_code == 403
    forged = {**valid, "user_id": str(a[2])}
    assert a[0].post("/api/admin/prices", headers=a[1], json=forged).status_code == 422
    with pg_engine.begin() as conn:
        conn.execute(roles.delete().where(roles.c.user_id == a[2]))
    assert a[0].get("/api/admin/dashboard").status_code == 403
