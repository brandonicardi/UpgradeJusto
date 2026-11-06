"""Tower writes own transaction/header lock; catalog revisions remain pinned."""

from uuid import uuid4, uuid5

import sqlalchemy as sa

from upgradejusto.administration.tables import active
from upgradejusto.catalog.models import Category
from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_models import Tower, TowerPage
from upgradejusto.pcs.tower_tables import configurations, lines
from upgradejusto.persistence.schema import pc_groups, pcs


class TowerRepository:
    def __init__(self, engine, dataset_version):
        self.engine, self.dataset_version = engine, dataset_version

    def _header(self, conn, owner, identity, *, write=False):
        return (
            conn.execute(
                sa.select(pcs)
                .where(pcs.c.id == identity, pcs.c.owner_id == owner)
                .with_for_update(read=not write)
            )
            .mappings()
            .first()
        )

    def _public(self, conn, row):
        config = (
            conn.execute(
                sa.select(configurations).where(configurations.c.pc_id == row["id"])
            )
            .mappings()
            .first()
        )
        if config:
            selected = [
                dict(line)
                for line in conn.execute(
                    sa.select(
                        lines.c.line_id,
                        lines.c.category,
                        lines.c.component_id,
                        lines.c.declared_model,
                        lines.c.quantity,
                    )
                    .where(lines.c.pc_id == row["id"])
                    .order_by(lines.c.position)
                ).mappings()
            ]
            states, origin = config["category_status"], 2
        else:
            # Stable identities for the read-only adapter, NOT persisted by GET.
            selected = [
                {
                    "line_id": uuid5(row["id"], "legacy:" + group["category"]),
                    "category": group["category"],
                    "component_id": group["component_id"],
                    "declared_model": None,
                    "quantity": group["quantity"],
                }
                for group in conn.execute(
                    sa.select(pc_groups)
                    .where(pc_groups.c.pc_id == row["id"])
                    .order_by(pc_groups.c.category)
                ).mappings()
            ]
            present = {line["category"] for line in selected}
            states = {
                category.value: "present" if category in present else "unknown"
                for category in Category
            }
            origin = 1
        return Tower(
            schema_version=2,
            id=row["id"],
            name=row["name"],
            revision=row["revision"],
            origin_schema=origin,
            category_status=states,
            lines=selected,
            context={
                "bios_version": row["bios_version"],
                "notes": row["notes"],
                "assembly_state": row["assembly_state"],
            },
        )

    def get(self, owner, identity):
        with self.engine.begin() as conn:
            row = self._header(conn, owner, identity)
            return self._public(conn, row) if row else None

    def list(self, owner, page, page_size):
        with self.engine.begin() as conn:
            total = conn.scalar(
                sa.select(sa.func.count())
                .select_from(pcs)
                .where(pcs.c.owner_id == owner)
            )
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
            return TowerPage(
                items=[self._public(conn, row) for row in rows],
                total=total,
                page=page,
                page_size=page_size,
            )

    def _catalog_lock(self, conn):
        current = conn.scalar(sa.select(active.c.version).with_for_update(read=True))
        if current != self.dataset_version:
            raise PCError(409, "Catalog revision conflict; review selection")

    def _write_configuration(self, conn, identity, data):
        conn.execute(
            configurations.insert().values(
                pc_id=identity,
                schema_version=2,
                category_status={
                    key.value: value for key, value in data.category_status.items()
                },
            )
        )
        if data.lines:
            conn.execute(
                lines.insert(),
                [
                    {
                        "pc_id": identity,
                        "line_id": line.line_id or uuid4(),
                        "category": line.category.value,
                        "component_id": line.component_id,
                        "dataset_version": self.dataset_version
                        if line.component_id is not None
                        else None,
                        "declared_model": line.declared_model,
                        "quantity": line.quantity,
                        "position": position,
                    }
                    for position, line in enumerate(data.lines)
                ],
            )

    @staticmethod
    def _validate_line_ids(data, existing):
        own = (
            {line.line_id: line.category for line in existing.lines} if existing else {}
        )
        if any(
            line.line_id is not None and own.get(line.line_id) != line.category
            for line in data.lines
        ):
            raise PCError(422, "Invalid tower line identity")

    def create(self, owner, data):
        self._validate_line_ids(data, None)
        with self.engine.begin() as conn:
            self._catalog_lock(conn)
            identity = uuid4()
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
            self._write_configuration(conn, identity, data)
            return self._public(conn, row)

    def update(self, owner, identity, data):
        with self.engine.begin() as conn:
            self._catalog_lock(conn)
            row = self._header(conn, owner, identity, write=True)
            if row is None:
                raise PCError(404, "PC not found")
            if row["revision"] != data.revision:
                raise PCError(409, "PC revision conflict")
            self._validate_line_ids(data, self._public(conn, row))
            # Do NOT delete legacy pc_groups: preserved as historical projection.
            conn.execute(
                configurations.delete().where(configurations.c.pc_id == identity)
            )
            self._write_configuration(conn, identity, data)
            updated = (
                conn.execute(
                    pcs.update()
                    .where(pcs.c.id == identity)
                    .values(
                        name=data.name,
                        revision=data.revision + 1,
                        **data.context.model_dump(),
                    )
                    .returning(pcs)
                )
                .mappings()
                .one()
            )
            return self._public(conn, updated)

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
