"""PCs dueño de sus escrituras; todo acceso se delimita por propietario."""

import uuid

import sqlalchemy as sa

from upgradejusto.administration.tables import active
from upgradejusto.catalog.dataset import DATASET_VERSION
from upgradejusto.pcs.models import PC, PCPage
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import pc_groups, pcs


class PCRepository:
    def __init__(self, engine, dataset_version=DATASET_VERSION):
        self.engine = engine
        self.dataset_version = dataset_version

    def _public(self, connection, row):
        groups = (
            connection.execute(
                sa.select(
                    pc_groups.c.category, pc_groups.c.component_id, pc_groups.c.quantity
                )
                .where(pc_groups.c.pc_id == row["id"])
                .order_by(pc_groups.c.category)
            )
            .mappings()
            .all()
        )
        return PC(
            id=row["id"],
            name=row["name"],
            revision=row["revision"],
            components=[dict(group) for group in groups],
            context={"bios_version": row["bios_version"], "notes": row["notes"]},
        )

    def get(self, owner, identity):
        with self.engine.begin() as conn:
            return self.get_in_transaction(conn, owner, identity)

    def get_in_transaction(self, conn, owner, identity):
        """Snapshot coherente para servicios: mantiene lock hasta cerrar transacción."""
        row = (
            conn.execute(
                sa.select(pcs)
                .where(pcs.c.id == identity, pcs.c.owner_id == owner)
                .with_for_update(read=True)
            )
            .mappings()
            .first()
        )
        return self._public(conn, row) if row else None

    def list(self, owner, page, page_size):
        with self.engine.connect() as conn:
            total = conn.scalar(
                sa.select(sa.func.count())
                .select_from(pcs)
                .where(pcs.c.owner_id == owner)
            )
            # Share-lock headers: grupos/contexto no pueden cambiar durante su lectura.
            rows = (
                conn.execute(
                    sa.select(pcs)
                    .where(pcs.c.owner_id == owner)
                    .order_by(pcs.c.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                    .with_for_update(read=True)
                )
                .mappings()
                .all()
            )
            return PCPage(
                items=[self._public(conn, row) for row in rows],
                total=total,
                page=page,
                page_size=page_size,
            )

    def _groups(self, conn, identity, groups):
        if groups:
            conn.execute(
                pc_groups.insert(),
                [
                    {
                        "pc_id": identity,
                        "dataset_version": self.dataset_version,
                        **group.model_dump(),
                    }
                    for group in groups
                ],
            )

    def create(self, owner, data):
        identity = uuid.uuid4()
        with self.engine.begin() as conn:
            current = conn.scalar(
                sa.select(active.c.version).with_for_update(read=True)
            )
            if current != self.dataset_version:
                raise PCError(409, "Catalog revision conflict; review selection")
            row = (
                conn.execute(
                    pcs.insert()
                    .values(
                        id=identity,
                        owner_id=owner,
                        name=data.name,
                        revision=1,
                        **data.context.model_dump(),
                    )
                    .returning(pcs)
                )
                .mappings()
                .one()
            )
            self._groups(conn, identity, data.components)
            return self._public(conn, row)

    def update(self, owner, identity, data):
        with self.engine.begin() as conn:
            current = conn.scalar(
                sa.select(active.c.version).with_for_update(read=True)
            )
            if current != self.dataset_version:
                raise PCError(409, "Catalog revision conflict; review selection")
            row = (
                conn.execute(
                    pcs.update()
                    .where(
                        pcs.c.id == identity,
                        pcs.c.owner_id == owner,
                        pcs.c.revision == data.revision,
                    )
                    .values(
                        name=data.name,
                        revision=pcs.c.revision + 1,
                        **data.context.model_dump(),
                    )
                    .returning(pcs)
                )
                .mappings()
                .first()
            )
            if not row:
                exists = conn.scalar(
                    sa.select(pcs.c.id).where(
                        pcs.c.id == identity, pcs.c.owner_id == owner
                    )
                )
                return None, bool(exists)
            conn.execute(pc_groups.delete().where(pc_groups.c.pc_id == row["id"]))
            self._groups(conn, row["id"], data.components)
            return self._public(conn, row), True

    def delete(self, owner, identity):
        with self.engine.begin() as conn:
            return (
                conn.scalar(
                    pcs.delete()
                    .where(pcs.c.id == identity, pcs.c.owner_id == owner)
                    .returning(pcs.c.id)
                )
                is not None
            )
