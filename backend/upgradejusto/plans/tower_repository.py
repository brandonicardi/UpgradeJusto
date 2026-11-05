"""PG transactions/CAS/idempotency for tower plans, never legacy plan writes."""

import hashlib
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert

from upgradejusto.administration.tables import active
from upgradejusto.catalog.postgres import published_catalog_snapshot
from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_repository import TowerRepository
from upgradejusto.recommendations.tower_repository import (
    TowerRecommendationCatalog,
    published_identities,
)

from .tower_progress import snapshot_keys
from .tower_tables import headers, progress, revisions

MAX_STORED_REVISION = 2147483647  # PostgreSQL INTEGER, not the API route limit.


class TowerPlanRepository:
    def __init__(self, engine):
        self.engine = engine

    @staticmethod
    def bounds(conn):
        conn.exec_driver_sql("SET LOCAL statement_timeout = '3000ms'")
        conn.exec_driver_sql("SET LOCAL lock_timeout = '1000ms'")

    def pc_row(self, conn, owner, request):
        row = TowerRepository(self.engine, request.expected_catalog_version)._header(
            conn, owner, request.pc_id
        )
        if row is None:
            raise PCError(404, "PC not found")
        return row

    @staticmethod
    def owned(conn, owner, identity, *, write=False):
        row = (
            conn.execute(
                sa.select(headers)
                .where(
                    headers.c.id == identity,
                    headers.c.owner_id == owner,
                    headers.c.deleted_at.is_(None),
                )
                .with_for_update(read=not write)
            )
            .mappings()
            .first()
        )
        if row is None:
            raise PCError(404, "Plan not found")
        return row

    @staticmethod
    def historical(conn, header, revision):
        # Called only after owner-scoped header lookup (including save/replay).
        # Larger contract-valid numbers cannot exist in this storage type; avoid
        # binding them as INTEGER and turning a missing history row into503.
        if type(revision) is not int or not 1 <= revision <= MAX_STORED_REVISION:
            raise PCError(404, "Plan revision not found")
        row = (
            conn.execute(
                sa.select(revisions).where(
                    revisions.c.plan_id == header["id"],
                    revisions.c.revision == revision,
                )
            )
            .mappings()
            .first()
        )
        if row is None:
            raise PCError(404, "Plan revision not found")
        keys = snapshot_keys(row["snapshot"])
        return {
            "kind": "tower_plan",
            "schema_version": 2,
            "id": header["id"],
            "name": row["snapshot"]["name"],
            "revision": revision,
            "pc_id": header["pc_id"],
            "created_at": header["created_at"],
            "updated_at": row["created_at"],
            "snapshot": row["snapshot"],
            # Derived per read, never stored: one key per stage of this exact
            # snapshot, aligned by index, plus only the marks of those keys.
            "stage_keys": list(keys),
            "progress": TowerPlanRepository.progress_for(
                conn, header["id"], row["snapshot"]
            ),
        }

    def get(self, owner, identity, revision=None):
        with self.engine.begin() as conn:
            self.bounds(conn)
            header = self.owned(conn, owner, identity)
            selected = header["current_revision"] if revision is None else revision
            return self.historical(conn, header, selected)

    def list(self, owner, page, page_size):
        with self.engine.begin() as conn:
            self.bounds(conn)
            where = (headers.c.owner_id == owner, headers.c.deleted_at.is_(None))
            count = conn.scalar(
                sa.select(sa.func.count()).select_from(headers).where(*where)
            )
            rows = (
                conn.execute(
                    sa.select(headers, revisions.c.snapshot)
                    .join(
                        revisions,
                        sa.and_(
                            revisions.c.plan_id == headers.c.id,
                            revisions.c.revision == headers.c.current_revision,
                        ),
                    )
                    .where(*where)
                    .order_by(headers.c.updated_at.desc(), headers.c.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
                .mappings()
                .all()
            )
            items = [
                {
                    "kind": "tower_plan",
                    "schema_version": 2,
                    "id": row["id"],
                    "name": row["snapshot"]["name"],
                    "revision": row["current_revision"],
                    **{
                        key: row["snapshot"][key]
                        for key in ("status", "label", "objective", "budget_ars")
                    },
                    "total_ars": row["snapshot"]["cost"]["total_ars"],
                    "updated_at": row["updated_at"],
                }
                for row in rows
            ]
            return {
                "kind": "tower_plan",
                "schema_version": 2,
                "items": items,
                "total": count,
                "page": page,
                "page_size": page_size,
            }

    def save(self, owner, request, digest, generation, identity=None):
        with self.engine.begin() as conn:
            self.bounds(conn)
            generation.check()
            header = None
            if identity is None:
                # Only trusted server owner + opaque operation UUID choose the lock.
                lock = int.from_bytes(
                    hashlib.sha256(
                        f"tower-plan-create:{owner}:{request.client_request_id}".encode()
                    ).digest()[:8],
                    "big",
                    signed=True,
                )
                conn.execute(sa.select(sa.func.pg_advisory_xact_lock(lock)))
                header = (
                    conn.execute(
                        sa.select(headers)
                        .where(
                            headers.c.owner_id == owner,
                            headers.c.create_request_id == request.client_request_id,
                        )
                        .with_for_update()
                    )
                    .mappings()
                    .first()
                )
                if header is not None:
                    if header["deleted_at"] is not None:
                        raise PCError(404, "Plan not found")
                    if header["create_request_hash"] != digest:
                        self.pc_row(conn, owner, request)
                        raise PCError(409, "Idempotency key conflict")
                    return self.historical(conn, header, 1), True
            else:
                header = self.owned(conn, owner, identity, write=True)
                previous = (
                    conn.execute(
                        sa.select(revisions.c.revision, revisions.c.request_hash).where(
                            revisions.c.plan_id == identity,
                            revisions.c.operation_id == request.client_request_id,
                        )
                    )
                    .mappings()
                    .first()
                )
                if previous is not None:
                    if previous["request_hash"] != digest:
                        self.pc_row(conn, owner, request)
                        raise PCError(409, "Idempotency key conflict")
                    return self.historical(conn, header, previous["revision"]), True
            # Owner-scoped PC lookup precedes CAS/catalog details, not model claims.
            pc_repo = TowerRepository(self.engine, request.expected_catalog_version)
            pc = self.pc_row(conn, owner, request)
            if header is not None and header["pc_id"] != request.pc_id:
                raise PCError(409, "Plan source PC conflict")
            if (
                header is not None
                and header["current_revision"] != request.expected_plan_revision
            ):
                raise PCError(409, "Plan revision conflict")
            if pc["revision"] != request.expected_pc_revision:
                raise PCError(409, "PC revision conflict")
            version = conn.scalar(
                sa.select(active.c.version)
                .where(active.c.singleton == 1)
                .with_for_update(read=True)
            )
            if version != request.expected_catalog_version:
                raise PCError(409, "Catalog revision conflict")
            snapshot = published_catalog_snapshot(conn, version)
            catalog = TowerRecommendationCatalog(
                snapshot, published_identities(conn, version, snapshot.components)
            )
            tower = pc_repo._public(conn, pc)
            if any(
                line.component_id is not None
                and (
                    line.component_id not in catalog
                    or catalog[line.component_id].category != line.category
                )
                for line in tower.lines
            ):
                raise PCError(409, "Catalog revision conflict; review selection")
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            document = generation.calculate(tower, catalog, version, now)
            generation.before_commit(
                document, conn.scalar(sa.select(sa.func.clock_timestamp()))
            )
            number = header["current_revision"] + 1 if header else 1
            if header is None:
                identity = uuid4()
                header = (
                    conn.execute(
                        headers.insert()
                        .values(
                            id=identity,
                            owner_id=owner,
                            pc_id=request.pc_id,
                            current_revision=number,
                            create_request_id=request.client_request_id,
                            create_request_hash=digest,
                            created_at=now,
                            updated_at=now,
                        )
                        .returning(headers)
                    )
                    .mappings()
                    .one()
                )
            else:
                header = (
                    conn.execute(
                        headers.update()
                        .where(
                            headers.c.id == identity,
                            headers.c.owner_id == owner,
                            headers.c.current_revision
                            == request.expected_plan_revision,
                            headers.c.deleted_at.is_(None),
                        )
                        .values(current_revision=number, updated_at=now)
                        .returning(headers)
                    )
                    .mappings()
                    .one()
                )
            conn.execute(
                revisions.insert().values(
                    plan_id=identity,
                    revision=number,
                    operation_id=request.client_request_id,
                    request_hash=digest,
                    snapshot=document,
                    created_at=now,
                )
            )
            result = self.historical(conn, header, number)
            generation.before_commit(
                document, conn.scalar(sa.select(sa.func.clock_timestamp()))
            )
            return result, False

    def delete(self, owner, identity, expected_revision):
        with self.engine.begin() as conn:
            self.bounds(conn)
            header = self.owned(conn, owner, identity, write=True)
            if header["current_revision"] != expected_revision:
                raise PCError(409, "Plan revision conflict")
            conn.execute(
                headers.update()
                .where(
                    headers.c.id == identity,
                    headers.c.owner_id == owner,
                    headers.c.current_revision == expected_revision,
                )
                .values(deleted_at=sa.func.clock_timestamp())
            )

    @staticmethod
    def progress_for(conn, plan_id, snapshot):
        """Return ``{stage_key: completed_at ISO}`` for marks still in ``snapshot``.

        Marks whose stage key is no longer in the current snapshot are kept in
        the table for history but never returned: an edited, removed or
        reordered stage does not silently inherit a previous mark.
        """
        keys = snapshot_keys(snapshot)
        if not keys:
            return {}
        rows = conn.execute(
            sa.select(progress.c.stage_key, progress.c.completed_at).where(
                progress.c.plan_id == plan_id,
                progress.c.stage_key.in_(list(keys)),
            )
        ).all()
        return {key: completed_at.isoformat() for key, completed_at in rows}

    def set_progress(self, owner, identity, stage_key, completed):
        """Mark or unmark one stage as bought; return revision and live progress.

        Idempotent in both directions: marking twice inserts one row, unmarking
        twice deletes nothing. It never writes ``tower_plans`` or
        ``tower_plan_revisions``, so the current revision, its prices and its
        verdicts stay frozen. Returns ``{"revision": current_revision,
        "progress": {stage_key: ISO completed_at}}`` read in this same
        transaction, so a concurrent recalculation cannot make the caller report
        a revision it did not modify; ``progress`` is limited to stages of that
        revision's snapshot.
        """
        with self.engine.begin() as conn:
            self.bounds(conn)
            header = self.owned(conn, owner, identity, write=True)
            snapshot = conn.scalar(
                sa.select(revisions.c.snapshot).where(
                    revisions.c.plan_id == header["id"],
                    revisions.c.revision == header["current_revision"],
                )
            )
            if snapshot is None or stage_key not in snapshot_keys(snapshot):
                raise PCError(404, "Plan stage not found")
            if completed:
                conn.execute(
                    pg_insert(progress)
                    .values(
                        plan_id=header["id"],
                        stage_key=stage_key,
                        completed_at=conn.scalar(sa.select(sa.func.clock_timestamp())),
                    )
                    .on_conflict_do_nothing(
                        index_elements=[progress.c.plan_id, progress.c.stage_key]
                    )
                )
            else:
                conn.execute(
                    progress.delete().where(
                        progress.c.plan_id == header["id"],
                        progress.c.stage_key == stage_key,
                    )
                )
            return {
                "revision": header["current_revision"],
                "progress": self.progress_for(conn, header["id"], snapshot),
            }
