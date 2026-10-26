"""PG transaction locks serialize turns and deletion, never a memory substitute."""

from datetime import UTC, datetime
from uuid import uuid4

import sqlalchemy as sa
from fastapi import HTTPException

from upgradejusto.auth.provider_budget import ProviderBudget

from .tables import conversations as c
from .tables import messages as m


def now():
    return datetime.now(UTC)


class Repository:
    def __init__(self, engine):
        self.engine = engine

    def owned(self, conn, owner, identity, lock=False):
        query = sa.select(c).where(c.c.id == identity, c.c.owner_id == owner)
        row = (
            conn.execute(query.with_for_update() if lock else query).mappings().first()
        )
        if row is None:
            raise HTTPException(404, "Conversation not found")
        return dict(row)

    def create(self, owner, title):
        row = dict(
            id=uuid4(), owner_id=owner, title=title, created_at=now(), updated_at=now()
        )
        with self.engine.begin() as conn:
            conn.execute(c.insert().values(**row))
        row.pop("owner_id")
        return row

    def get(self, owner, identity):
        with self.engine.connect() as conn:
            row = self.owned(conn, owner, identity)
        row.pop("owner_id")
        return row

    def page(self, owner, page, page_size, identity=None):
        with self.engine.connect() as conn:
            if identity is not None:
                self.owned(conn, owner, identity)
            table = c if identity is None else m
            condition = (
                c.c.owner_id == owner
                if identity is None
                else m.c.conversation_id == identity
            )
            columns = [
                col
                for col in table.c
                if col.name not in {"owner_id", "request_id", "conversation_id"}
            ]
            order = c.c.created_at if identity is None else m.c.sequence
            total = conn.scalar(
                sa.select(sa.func.count()).select_from(table).where(condition)
            )
            rows = (
                conn.execute(
                    sa.select(*columns)
                    .where(condition)
                    .order_by(order, table.c.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
                .mappings()
                .all()
            )
        return dict(
            items=[dict(r) for r in rows], total=total, page=page, page_size=page_size
        )

    def begin(
        self, owner, identity, data, include_history=False, reserve_provider=False
    ):
        with self.engine.begin() as conn:
            self.owned(conn, owner, identity, True)
            previous = conn.scalar(
                sa.select(m.c.id).where(
                    m.c.conversation_id == identity,
                    m.c.request_id == data.client_request_id,
                    m.c.role == "assistant",
                )
            )
            if previous:
                raise HTTPException(
                    409, {"code": "duplicate_request", "message_id": str(previous)}
                )
            self.idle(conn, identity)
            sequence = conn.scalar(
                sa.select(sa.func.coalesce(sa.func.max(m.c.sequence), 0)).where(
                    m.c.conversation_id == identity
                )
            )
            assistant_id = uuid4()
            if reserve_provider:
                ProviderBudget(self.engine).acquire_in(conn, owner, assistant_id)
            for offset, role, content, status, mid in [
                (1, "user", data.content, "completed", uuid4()),
                (2, "assistant", "", "pending", assistant_id),
            ]:
                conn.execute(
                    m.insert().values(
                        id=mid,
                        conversation_id=identity,
                        sequence=sequence + offset,
                        request_id=data.client_request_id,
                        role=role,
                        content=content,
                        status=status,
                        citations=[],
                        created_at=now(),
                    )
                )
            conn.execute(c.update().where(c.c.id == identity).values(updated_at=now()))
            history = (
                self.history_in_transaction(conn, identity) if include_history else None
            )
        return (assistant_id, history) if include_history else assistant_id

    def release_provider(self, owner, message_id):
        ProviderBudget(self.engine).release(owner, message_id)

    def idle(self, conn, identity):
        if conn.scalar(
            sa.select(m.c.id).where(
                m.c.conversation_id == identity, m.c.status == "pending"
            )
        ):
            raise HTTPException(409, "Generation active")

    def finish(self, owner, identity, message_id, content, status, citations):
        with self.engine.begin() as conn:
            self.owned(conn, owner, identity, True)
            result = conn.execute(
                m.update()
                .where(
                    m.c.id == message_id,
                    m.c.conversation_id == identity,
                    m.c.status == "pending",
                )
                .values(content=content, status=status, citations=citations)
            )
            if result.rowcount != 1:
                raise HTTPException(409, "Generation no longer active")
            conn.execute(c.update().where(c.c.id == identity).values(updated_at=now()))

    def delete(self, owner, identity):
        with self.engine.begin() as conn:
            self.owned(conn, owner, identity, True)
            self.idle(conn, identity)
            conn.execute(c.delete().where(c.c.id == identity))

    def interrupt_pending(self, owner, identity, message_id, content, citations):
        """Owner-scoped, bounded, idempotent cleanup; never overwrite a terminal row.

        The caller bounds waiting for the worker thread separately. These fixed
        PostgreSQL transaction-local limits also bound statement/lock execution;
        a cancelled Python waiter cannot stop an already running DB thread.
        """
        with self.engine.begin() as conn:
            conn.exec_driver_sql("SET LOCAL statement_timeout = '2000ms'")
            conn.exec_driver_sql("SET LOCAL lock_timeout = '1000ms'")
            self.owned(conn, owner, identity, True)
            result = conn.execute(
                m.update()
                .where(
                    m.c.id == message_id,
                    m.c.conversation_id == identity,
                    m.c.role == "assistant",
                    m.c.status == "pending",
                )
                .values(content=content, status="interrupted", citations=citations)
            )
            if result.rowcount:
                conn.execute(
                    c.update().where(c.c.id == identity).values(updated_at=now())
                )
            return result.rowcount == 1

    def interrupt_abandoned(self):
        """Invoke only at exclusive process startup, never on each HTTP request."""
        with self.engine.begin() as conn:
            conn.execute(
                m.update().where(m.c.status == "pending").values(status="interrupted")
            )

    def history(self, owner, identity):
        with self.engine.connect() as conn:
            self.owned(conn, owner, identity)
            return self.history_in_transaction(conn, identity)

    def history_in_transaction(self, conn, identity):
        rows = (
            conn.execute(
                sa.select(m.c.role, m.c.content)
                .where(m.c.conversation_id == identity, m.c.status == "completed")
                .order_by(m.c.sequence.desc())
                .limit(20)
            )
            .mappings()
            .all()
        )
        return list(reversed([dict(r) for r in rows]))
