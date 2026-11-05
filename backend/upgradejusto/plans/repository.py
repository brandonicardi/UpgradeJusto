"""G: una transacción por snapshot, con locks de plan y PC fuente."""

import json
from datetime import UTC, datetime
from uuid import uuid4

import sqlalchemy as sa

from upgradejusto.pcs.repository import PCRepository
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import plans

from .models import Plan, PlanPage, PlanSummary


class PlanRepository:
    def __init__(self, engine):
        self.engine = engine
        self.pcs = PCRepository(engine)

    @staticmethod
    def public(row):
        document = {
            **row["snapshot"],
            "id": str(row["id"]),
            "name": row["name"],
            "revision": row["revision"],
            "pc_id": str(row["pc_id"]) if row["pc_id"] is not None else None,
            "created_at": row["created_at"].isoformat(),
            "updated_at": row["updated_at"].isoformat(),
        }
        # JSONB devuelve arrays JSON, no tuplas Python. El modo JSON de Pydantic
        # conserva la validación estricta del dominio sin flexibilizar sus modelos.
        return Plan.model_validate_json(json.dumps(document, allow_nan=False))

    def get(self, owner, identity):
        with self.engine.connect() as conn:
            row = (
                conn.execute(
                    sa.select(plans).where(
                        plans.c.id == identity, plans.c.owner_id == owner
                    )
                )
                .mappings()
                .first()
            )
            return self.public(row) if row else None

    def list(self, owner, page, page_size):
        with self.engine.connect() as conn:
            total = conn.scalar(
                sa.select(sa.func.count())
                .select_from(plans)
                .where(plans.c.owner_id == owner)
            )
            rows = (
                conn.execute(
                    sa.select(plans)
                    .where(plans.c.owner_id == owner)
                    .order_by(plans.c.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
                .mappings()
                .all()
            )
            items = [
                PlanSummary(
                    id=row["id"],
                    name=row["name"],
                    revision=row["revision"],
                    updated_at=row["updated_at"],
                    **{
                        key: row["snapshot"][key]
                        for key in ("status", "objective", "budget_ars")
                    },
                    total_ars=row["snapshot"]["cost"]["total_ars"],
                )
                for row in rows
            ]
            return PlanPage(items=items, total=total, page=page, page_size=page_size)

    def save(self, owner, data, calculate, identity=None):
        with self.engine.begin() as conn:
            existing = None
            if identity is not None:
                existing = (
                    conn.execute(
                        sa.select(plans)
                        .where(plans.c.id == identity, plans.c.owner_id == owner)
                        .with_for_update()
                    )
                    .mappings()
                    .first()
                )
                if existing is None:
                    raise PCError(404, "Plan not found")
            pc = self.pcs.get_in_transaction(conn, owner, data.pc_id)
            if pc is None:
                raise PCError(404, "PC not found")
            # Ambas propiedades se resuelven antes de informar cualquier conflicto.
            if existing is not None and existing["revision"] != data.revision:
                raise PCError(409, "Plan revision conflict")
            if pc.revision != data.expected_pc_revision:
                raise PCError(409, "PC revision conflict")
            snapshot = calculate(pc).model_dump(mode="json")
            now = datetime.now(UTC)
            values = dict(
                pc_id=data.pc_id, name=data.name, snapshot=snapshot, updated_at=now
            )
            if existing is None:
                statement = plans.insert().values(
                    **values, id=uuid4(), owner_id=owner, revision=1, created_at=now
                )
            else:
                statement = (
                    plans.update()
                    .where(
                        plans.c.id == identity,
                        plans.c.owner_id == owner,
                        plans.c.revision == data.revision,
                    )
                    .values(**values, revision=data.revision + 1)
                )
            row = conn.execute(statement.returning(plans)).mappings().one()
            return self.public(row)

    def purge(self, conn, owner):
        """Baja de cuenta: los planes y sus enlaces caen en cascada."""
        conn.execute(plans.delete().where(plans.c.owner_id == owner))

    def delete(self, owner, identity):
        with self.engine.begin() as conn:
            return (
                conn.scalar(
                    plans.delete()
                    .where(plans.c.id == identity, plans.c.owner_id == owner)
                    .returning(plans.c.id)
                )
                is not None
            )
