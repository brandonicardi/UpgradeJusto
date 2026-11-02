"""Capability transactions on PG; never mutates plans, PCs or catalog."""

import math
from datetime import timedelta
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert

from upgradejusto.catalog.postgres import published_catalog_snapshot
from upgradejusto.pcs.service import PCError
from upgradejusto.plans.tower_repository import TowerPlanRepository
from upgradejusto.plans.tower_tables import headers
from upgradejusto.recommendations.tower_repository import TowerRecommendationCatalog
from upgradejusto.retail.tables import resources

from .tower_registry import PROJECTION_VERSION
from .tower_sources import PublicSources
from .tower_tables import budgets, shares


def share_metadata(row):
    return {
        key: row[key]
        for key in (
            "id",
            "plan_revision",
            "title",
            "projection_version",
            "created_at",
            "revoked_at",
        )
    }


class TowerShareRepository:
    def __init__(self, engine):
        self.engine = engine

    @staticmethod
    def owned(conn, owner, identity):
        # Deliberately includes soft-deleted plans for listing/revocation.
        row = (
            conn.execute(
                sa.select(headers)
                .where(headers.c.id == identity, headers.c.owner_id == owner)
                .with_for_update()
            )
            .mappings()
            .first()
        )
        if row is None:
            raise PCError(404, "Plan not found")
        return row

    def publish(self, owner, identity, request, digest, generation):
        with self.engine.begin() as conn:
            TowerPlanRepository.bounds(conn)
            generation.check()
            header = self.owned(conn, owner, identity)
            if header["deleted_at"] is not None:
                raise PCError(404, "Plan not found")
            if header["current_revision"] != request.expected_plan_revision:
                raise PCError(409, "Plan revision conflict")
            # Header lock serializes emissions including previously revoked ones.
            count = conn.scalar(
                sa.select(sa.func.count())
                .select_from(shares)
                .where(shares.c.plan_id == identity)
            )
            if count >= 100:
                raise PCError(409, "Share emission limit reached")
            document = TowerPlanRepository.historical(
                conn, header, header["current_revision"]
            )["snapshot"]
            version = document["versions"]["catalog"]
            snapshot = published_catalog_snapshot(conn, version)
            raw = (
                conn.execute(
                    sa.select(resources).where(resources.c.dataset_version == version)
                )
                .mappings()
                .all()
            )
            catalog = TowerRecommendationCatalog(
                snapshot, {row["component_id"]: row["identity"] for row in raw}
            )
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            public = generation.project(
                document,
                request.title,
                PublicSources(catalog, version, raw),
                header["current_revision"],
                now,
            )
            row = (
                conn.execute(
                    shares.insert()
                    .values(
                        id=uuid4(),
                        plan_id=identity,
                        plan_revision=header["current_revision"],
                        token_digest=digest,
                        title=request.title,
                        projection_version=PROJECTION_VERSION,
                        snapshot=public,
                        created_at=now,
                    )
                    .returning(*shares.c)
                )
                .mappings()
                .one()
            )
            generation.check()
            result = share_metadata(row)
        # Caller receives metadata only after transaction commit succeeds.
        return result

    def list(self, owner, identity):
        with self.engine.begin() as conn:
            TowerPlanRepository.bounds(conn)
            header = self.owned(conn, owner, identity)
            return {
                "items": [
                    {
                        **share_metadata(row),
                        "effective_state": "revoked"
                        if row["revoked_at"] is not None
                        else "disabled_plan_deleted"
                        if header["deleted_at"] is not None
                        else "active",
                    }
                    for row in conn.execute(
                        sa.select(shares)
                        .where(shares.c.plan_id == identity)
                        .order_by(shares.c.created_at, shares.c.id)
                    ).mappings()
                ]
            }

    def revoke(self, owner, identity, share_id, captured_revision):
        with self.engine.begin() as conn:
            TowerPlanRepository.bounds(conn)
            self.owned(conn, owner, identity)
            row = (
                conn.execute(
                    sa.select(shares)
                    .where(shares.c.id == share_id, shares.c.plan_id == identity)
                    .with_for_update()
                )
                .mappings()
                .first()
            )
            if row is None:
                raise PCError(404, "Share not found")
            if row["plan_revision"] != captured_revision:
                raise PCError(409, "Share revision conflict")
            if row["revoked_at"] is None:
                conn.execute(
                    shares.update()
                    .where(shares.c.id == share_id)
                    .values(revoked_at=sa.func.clock_timestamp())
                )

    def consume_read(self, key_digest):
        # Separate committed transaction, including attempts which become429/404.
        with self.engine.begin() as conn:
            TowerPlanRepository.bounds(conn)
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            inserted = conn.scalar(
                insert(budgets)
                .values(key_digest=key_digest, started_at=now, count=1)
                .on_conflict_do_nothing(index_elements=[budgets.c.key_digest])
                .returning(budgets.c.key_digest)
            )
            row = (
                conn.execute(
                    sa.select(budgets)
                    .where(budgets.c.key_digest == key_digest)
                    .with_for_update()
                )
                .mappings()
                .one()
            )
            # Read clock after waiting for the lock, not before contention.
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            start, count = row["started_at"], row["count"]
            if now >= start + timedelta(seconds=60):
                start, count = now, 1
            elif inserted is None:
                count = min(count + 1, 61)
            conn.execute(
                budgets.update()
                .where(budgets.c.key_digest == key_digest)
                .values(started_at=start, count=count)
            )
            retry = max(
                1, math.ceil((start + timedelta(seconds=60) - now).total_seconds())
            )
            result = (count <= 60, retry)
        return result

    def public(self, digest):
        with self.engine.begin() as conn:
            TowerPlanRepository.bounds(conn)
            value = conn.scalar(
                sa.select(shares.c.snapshot)
                .join(headers, headers.c.id == shares.c.plan_id)
                .where(
                    shares.c.token_digest == digest,
                    shares.c.revoked_at.is_(None),
                    headers.c.deleted_at.is_(None),
                )
            )
            if value is None:
                raise PCError(404, "Shared plan not found")
            return value
