"""H: cada lectura pública consulta PG; no caché ni almacenamiento del bearer."""

from datetime import UTC, datetime
from uuid import uuid4

import sqlalchemy as sa

from upgradejusto.catalog.postgres import published_catalog_snapshot
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import plans, shares

from .models import ShareMetadata
from .projection import PublicCatalogContext


class ShareRepository:
    def __init__(self, engine):
        self.engine = engine

    @staticmethod
    def metadata(row):
        return ShareMetadata(
            **{
                key: row[key]
                for key in (
                    "id",
                    "plan_revision",
                    "title",
                    "created_at",
                    "revoked_at",
                )
            }
        )

    @staticmethod
    def owned_plan(conn, owner, identity):
        row = (
            conn.execute(
                sa.select(plans)
                .where(plans.c.id == identity, plans.c.owner_id == owner)
                .with_for_update(read=True)
            )
            .mappings()
            .first()
        )
        if row is None:
            raise PCError(404, "Plan not found")
        return row

    def publish(self, owner, identity, request, digest, project):
        with self.engine.begin() as conn:
            plan = self.owned_plan(conn, owner, identity)
            if plan["revision"] != request.expected_plan_revision:
                raise PCError(409, "Plan revision conflict")
            private = plan["snapshot"]
            versions = {
                stage["evaluation"]["data_revision"].partition("|")[0]
                for stage in private["stages"]
            }
            if len(versions) != 1:
                raise PCError(409, "Plan catalog revisions are inconsistent")
            catalog = published_catalog_snapshot(conn, versions.pop())
            context = PublicCatalogContext(
                catalog.components, catalog.support_rows, catalog.source_rows
            )
            snapshot = project(private, request.title, context)
            row = (
                conn.execute(
                    shares.insert()
                    .values(
                        id=uuid4(),
                        plan_id=identity,
                        owner_id=owner,
                        digest=digest,
                        plan_revision=plan["revision"],
                        title=request.title,
                        snapshot=snapshot,
                        created_at=datetime.now(UTC),
                        revoked_at=None,
                    )
                    .returning(shares)
                )
                .mappings()
                .one()
            )
            return self.metadata(row)

    def list(self, owner, identity):
        with self.engine.begin() as conn:
            self.owned_plan(conn, owner, identity)
            rows = (
                conn.execute(
                    sa.select(shares)
                    .where(shares.c.plan_id == identity, shares.c.owner_id == owner)
                    .order_by(shares.c.id)
                )
                .mappings()
                .all()
            )
            return [self.metadata(row) for row in rows]

    def revoke(self, owner, identity, share_id):
        with self.engine.begin() as conn:
            self.owned_plan(conn, owner, identity)
            found = conn.scalar(
                shares.update()
                .where(
                    shares.c.id == share_id,
                    shares.c.plan_id == identity,
                    shares.c.owner_id == owner,
                )
                .values(
                    revoked_at=sa.func.coalesce(shares.c.revoked_at, datetime.now(UTC))
                )
                .returning(shares.c.id)
            )
            if found is None:
                raise PCError(404, "Share not found")

    def purge(self, conn, owner):
        """Baja de cuenta: publicaciones del dueño; los enlaces dejan de existir."""
        conn.execute(sa.delete(shares).where(shares.c.owner_id == owner))

    def public(self, digest):
        with self.engine.connect() as conn:
            row = (
                conn.execute(
                    sa.select(
                        shares.c.snapshot, shares.c.created_at, shares.c.plan_revision
                    )
                    .select_from(
                        shares.join(
                            plans,
                            sa.and_(
                                shares.c.plan_id == plans.c.id,
                                shares.c.owner_id == plans.c.owner_id,
                            ),
                        )
                    )
                    .where(shares.c.digest == digest, shares.c.revoked_at.is_(None))
                )
                .mappings()
                .first()
            )
            if row is None:
                return None
            return {
                **row["snapshot"],
                "published_at": row["created_at"].isoformat(),
                "plan_revision": row["plan_revision"],
            }
