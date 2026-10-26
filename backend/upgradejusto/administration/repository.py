"""CU10: writes serialized by revision and active-pointer PostgreSQL locks."""

import uuid

import sqlalchemy as sa
from pydantic import ValidationError

from upgradejusto.administration.models import validate_data
from upgradejusto.administration.tables import active, revisions, roles, rows
from upgradejusto.administration.validation import materialize
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import components, datasets
from upgradejusto.retail.tables import resources


class AdministrationRepository:
    def __init__(self, engine):
        self.engine = engine

    def _authorize(self, conn, owner):
        if not conn.scalar(
            sa.select(roles.c.user_id)
            .where(roles.c.user_id == owner, roles.c.role == "admin")
            .with_for_update(read=True)
        ):
            raise PCError(403, "Administrator required")

    def authorize(self, owner):
        with self.engine.begin() as conn:
            self._authorize(conn, owner)

    def _revision(self, conn, identity, draft=False):
        row = (
            conn.execute(
                sa.select(revisions).where(revisions.c.id == identity).with_for_update()
            )
            .mappings()
            .first()
        )
        if not row:
            raise PCError(404, "Revision not found")
        if draft and row["status"] != "draft":
            raise PCError(409, "Published revision is immutable")
        return row

    def _entries(self, conn, identity):
        return (
            conn.execute(
                sa.select(rows)
                .where(rows.c.revision_id == identity)
                .order_by(rows.c.collection, rows.c.id)
            )
            .mappings()
            .all()
        )

    def list(self, owner, identity, collection, limit, offset):
        with self.engine.begin() as conn:
            self._authorize(conn, owner)
            version = conn.scalar(sa.select(active.c.version))
            if identity is None:
                result = [
                    dict(row, active=row["id"] == version)
                    for row in conn.execute(
                        sa.select(revisions).order_by(revisions.c.id)
                    ).mappings()
                ]
            else:
                self._revision(conn, identity)
                result = [
                    {"id": r["id"], "data": r["data"]}
                    for r in self._entries(conn, identity)
                    if r["collection"] == collection
                ]
            return {
                "items": result[offset : offset + limit],
                "total": len(result),
                "limit": limit,
                "offset": offset,
            }

    def create(self, owner, base):
        with self.engine.begin() as conn:
            self._authorize(conn, owner)
            current = conn.scalar(sa.select(active.c.version).with_for_update())
            if current != base:
                raise PCError(409, "Active revision conflict")
            identity = "revision-" + uuid.uuid4().hex
            conn.execute(
                revisions.insert().values(
                    id=identity, base_version=base, status="draft"
                )
            )
            entries = self._entries(conn, base)
            if entries:
                conn.execute(
                    rows.insert(),
                    [{**dict(entry), "revision_id": identity} for entry in entries],
                )
            return {"id": identity, "base_version": base, "status": "draft"}

    def write(self, owner, identity, collection, data=None, row_id=None, delete=False):
        with self.engine.begin() as conn:
            self._authorize(conn, owner)
            self._revision(conn, identity, draft=True)
            predicate = (
                rows.c.revision_id == identity,
                rows.c.collection == collection,
                rows.c.id == row_id,
            )
            previous = (
                conn.execute(
                    sa.select(rows.c.data).where(*predicate)
                ).scalar_one_or_none()
                if row_id
                else None
            )
            if row_id and previous is None:
                raise PCError(404, "Row not found")
            if delete:
                conn.execute(rows.delete().where(*predicate))
                return None
            try:
                validated = validate_data(collection, {**(previous or {}), **data})
            except (ValidationError, ValueError, TypeError):
                raise PCError(422, "Invalid curation data") from None
            if row_id:
                conn.execute(rows.update().where(*predicate).values(data=validated))
            else:
                row_id = "row-" + uuid.uuid4().hex
                conn.execute(
                    rows.insert().values(
                        revision_id=identity,
                        collection=collection,
                        id=row_id,
                        data=validated,
                    )
                )
            return {"id": row_id, "data": validated}

    def publish(self, owner, identity, expected):
        with self.engine.begin() as conn:
            self._authorize(conn, owner)
            current = conn.scalar(sa.select(active.c.version).with_for_update())
            revision = self._revision(conn, identity, draft=True)
            if current != expected or revision["base_version"] != current:
                raise PCError(409, "Active revision conflict")
            try:
                materialized = materialize(self._entries(conn, identity))
            except (ValidationError, ValueError, TypeError):
                raise PCError(422, "Invalid revision references or data") from None
            conn.execute(datasets.insert().values(version=identity))
            conn.execute(
                components.insert(),
                [{"dataset_version": identity, **item} for item in materialized],
            )
            # Carry evidence forward without changing immutable historical rows.
            retained = {item["id"] for item in materialized}
            inherited = (
                conn.execute(
                    sa.select(resources).where(resources.c.dataset_version == current)
                )
                .mappings()
                .all()
            )
            old_parts = {
                item["id"]: item
                for item in conn.execute(
                    sa.select(components).where(components.c.dataset_version == current)
                ).mappings()
            }
            new_parts = {item["id"]: item for item in materialized}
            copied = [
                dict(item, dataset_version=identity)
                for item in inherited
                if item["component_id"] in retained
                and all(
                    old_parts[item["component_id"]][key]
                    == new_parts[item["component_id"]][key]
                    for key in ("category", "sources")
                )
                # Legacy retail names may contain boundary whitespace that CU10
                # canonicalizes. No case folding or model/variant fuzzy matching.
                and old_parts[item["component_id"]]["name"].strip()
                == new_parts[item["component_id"]]["name"].strip()
            ]
            if copied:
                conn.execute(resources.insert(), copied)
            conn.execute(
                revisions.update()
                .where(revisions.c.id == identity)
                .values(status="published")
            )
            conn.execute(
                active.update().where(active.c.singleton == 1).values(version=identity)
            )
            return {"dataset_version": identity, "status": "published"}
