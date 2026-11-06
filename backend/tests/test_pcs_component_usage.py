"""Aggregated PC usage per component: distinct PCs, no owner identifiers."""

from contextlib import contextmanager
from uuid import uuid4

import sqlalchemy as sa

from upgradejusto.administration.tables import active, revisions
from upgradejusto.pcs.repository import PCRepository
from upgradejusto.pcs.service import PCService
from upgradejusto.pcs.tower_tables import configurations, lines
from upgradejusto.persistence.schema import components, datasets, pcs, users

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


class BoundEngine:
    def __init__(self, conn):
        self.conn = conn

    @contextmanager
    def connect(self):
        yield self.conn


def add_pc(conn, owner, name):
    identity = uuid4()
    conn.execute(
        pcs.insert().values(id=identity, owner_id=owner, name=name, revision=1)
    )
    conn.execute(
        configurations.insert().values(
            pc_id=identity,
            schema_version=2,
            category_status={category: "unknown" for category in CATEGORIES},
        )
    )
    return identity


def add_line(conn, pc_id, category, component_id, version, position):
    conn.execute(
        lines.insert().values(
            pc_id=pc_id,
            line_id=uuid4(),
            category=category,
            component_id=component_id,
            dataset_version=version,
            declared_model=None,
            quantity=1,
            position=position,
        )
    )


def test_component_usage_counts_distinct_pcs_across_accounts_and_revisions(pg_engine):
    with pg_engine.connect() as conn:
        transaction = conn.begin()
        try:
            engine = BoundEngine(conn)
            initial = conn.scalar(sa.select(active.c.version))
            second = "synthetic-usage-" + uuid4().hex
            conn.execute(datasets.insert().values(version=second))
            conn.execute(
                revisions.insert().values(
                    id=second, base_version=initial, status="draft"
                )
            )
            first_component = dict(
                conn.execute(
                    sa.select(components).where(
                        components.c.dataset_version == initial,
                        components.c.id == "P01",
                    )
                )
                .mappings()
                .one()
            )
            conn.execute(
                components.insert().values(
                    **{**first_component, "dataset_version": second}
                )
            )
            conn.execute(
                revisions.update()
                .where(revisions.c.id == second)
                .values(status="published")
            )
            owner_a, owner_b = uuid4(), uuid4()
            conn.execute(users.insert(), [{"id": owner_a}, {"id": owner_b}])
            pc_a = add_pc(conn, owner_a, "PC A")
            pc_b = add_pc(conn, owner_b, "PC B")
            add_line(conn, pc_a, "cpu", "P01", initial, 0)
            add_line(conn, pc_a, "cpu", "P01", second, 1)
            add_line(conn, pc_b, "cpu", "P01", initial, 0)
            add_line(conn, pc_b, "ram", "P05", initial, 1)

            usage = PCService(PCRepository(engine), None).count_component_usage()

            assert usage == {"P01": 2, "P05": 1}
            assert all(type(value) is int for value in usage.values())
            assert all(type(key) is str for key in usage)
            assert str(pc_a) not in repr(usage)
            assert str(pc_b) not in repr(usage)
        finally:
            transaction.rollback()
