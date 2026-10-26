"""Cross-worker provider admission: one PG lock order, shared assistant/extraction.

Fixed advisory lock protects rate counters and leases in the SAME transaction.
No provider/HTTP/LLM chooses the authenticated owner or SQL.
"""

import asyncio
from contextlib import asynccontextmanager
from datetime import timedelta
from uuid import uuid4

import anyio
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert

from upgradejusto.auth.limits import setting
from upgradejusto.auth.security import digest
from upgradejusto.auth.service import AuthError
from upgradejusto.persistence.schema import attempts, metadata

leases = sa.Table(
    "provider_execution_leases",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column(
        "owner_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=False, index=True
    ),
    sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False, index=True),
)


class ProviderBudget:
    def __init__(self, engine):
        self.engine = engine

    @staticmethod
    def lock(conn):
        conn.exec_driver_sql("SET LOCAL statement_timeout = '3000ms'")
        conn.exec_driver_sql("SET LOCAL lock_timeout = '2000ms'")
        conn.execute(sa.select(sa.func.pg_advisory_xact_lock(370001)))

    def acquire_in(self, conn, owner, identity):
        if owner is None:
            raise AuthError(401, "Not authenticated")
        self.lock(conn)
        now = conn.scalar(sa.select(sa.func.clock_timestamp()))
        limits = (
            (None, setting("UJ_PROVIDER_GLOBAL_CONCURRENT", 4, 1, 32)),
            (owner, setting("UJ_PROVIDER_USER_CONCURRENT", 1, 1, 4)),
        )
        for principal, limit in limits:
            condition = leases.c.expires_at > now
            if principal is not None:
                condition = sa.and_(condition, leases.c.owner_id == principal)
            if (
                conn.scalar(
                    sa.select(sa.func.count()).select_from(leases).where(condition)
                )
                >= limit
            ):
                raise AuthError(429, "Provider capacity busy", 1)
        counters = (
            (
                digest("provider-global"),
                setting("UJ_PROVIDER_GLOBAL_PER_MINUTE", 20, 1, 300),
            ),
            (
                digest("provider-user:" + str(owner)),
                setting("UJ_PROVIDER_USER_PER_MINUTE", 5, 1, 60),
            ),
        )
        for key, limit in sorted(counters):
            previous = (
                conn.execute(sa.select(attempts).where(attempts.c.key == key))
                .mappings()
                .first()
            )
            if (
                previous
                and previous["started_at"] > now - timedelta(minutes=1)
                and previous["count"] >= limit
            ):
                retry = max(
                    1,
                    int(
                        (
                            previous["started_at"] + timedelta(minutes=1) - now
                        ).total_seconds()
                    )
                    + 1,
                )
                raise AuthError(429, "Provider request limit exceeded", retry)
        for key, _ in sorted(counters):
            expired = attempts.c.started_at <= now - timedelta(minutes=1)
            stmt = insert(attempts).values(key=key, started_at=now, count=1)
            conn.execute(
                stmt.on_conflict_do_update(
                    index_elements=[attempts.c.key],
                    set_={
                        "started_at": sa.case(
                            (expired, now), else_=attempts.c.started_at
                        ),
                        "count": sa.case((expired, 1), else_=attempts.c.count + 1),
                    },
                )
            )
        seconds = setting("UJ_PROVIDER_LEASE_SECONDS", 180, 150, 600)
        conn.execute(
            leases.insert().values(
                id=identity, owner_id=owner, expires_at=now + timedelta(seconds=seconds)
            )
        )

    def acquire(self, owner, identity):
        with self.engine.begin() as conn:
            self.acquire_in(conn, owner, identity)

    def release(self, owner, identity):
        with self.engine.begin() as conn:
            self.lock(conn)
            conn.execute(
                leases.delete().where(
                    leases.c.id == identity, leases.c.owner_id == owner
                )
            )

    @asynccontextmanager
    async def execution(self, owner):
        identity = uuid4()
        # Own the acquiring task even under raw asyncio cancellation, not just
        # AnyIO level cancellation; resolve its bounded PG transaction before
        # deciding whether a lease exists and needs release.
        acquiring = asyncio.create_task(
            asyncio.to_thread(self.acquire, owner, identity)
        )
        try:
            with anyio.CancelScope(shield=True):
                await asyncio.shield(acquiring)
        except BaseException:
            with anyio.CancelScope(shield=True):
                try:
                    await asyncio.shield(acquiring)
                except Exception:
                    pass
                else:
                    await anyio.to_thread.run_sync(self.release, owner, identity)
            raise
        try:
            yield
        finally:
            with anyio.CancelScope(shield=True):
                await anyio.to_thread.run_sync(self.release, owner, identity)
