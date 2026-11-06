"""CU10: writes serialized by revision and active-pointer PostgreSQL locks."""

import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from pydantic import ValidationError

from upgradejusto.administration.models import validate_data
from upgradejusto.administration.tables import (
    active,
    manual_price_changes,
    revisions,
    roles,
    rows,
)
from upgradejusto.administration.validation import materialize
from upgradejusto.catalog.postgres import published_catalog_snapshot
from upgradejusto.compatibility.basic_manufacturer import resolve_stock_specs
from upgradejusto.compatibility.tower_essential import ESSENTIAL_ATTRIBUTES
from upgradejusto.compatibility.tower_technical_resolver import (
    resolve_published_technical,
)
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import components, datasets
from upgradejusto.retail.models import LOWEST_OFFER_MAX_AGE
from upgradejusto.retail.tables import resources
from upgradejusto.retail.technical_validation import preserve_retail_resource


class AdministrationRepository:
    def __init__(self, engine):
        self.engine = engine

    @staticmethod
    def last_admin(conn, owner):
        """Bloquea las filas admin: True solo si ``owner`` es el último."""
        admins = list(
            conn.scalars(
                sa.select(roles.c.user_id)
                .where(roles.c.role == "admin")
                .with_for_update()
            )
        )
        return len(admins) == 1 and owner in admins

    def purge(self, conn, owner):
        """Baja de cuenta: el rol admin propio (la FK también cascadearía)."""
        conn.execute(roles.delete().where(roles.c.user_id == owner))

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

    def dashboard(self, owner, usage, limit, offset, now=None):
        """Four metrics and two paginated lists for the active revision only."""
        now = now or datetime.now(timezone.utc)
        with self.engine.begin() as conn:
            self._authorize(conn, owner)
            version = conn.scalar(
                sa.select(active.c.version).with_for_update(read=True)
            )
            snapshot = published_catalog_snapshot(conn, version)
            missing_items, old_items = [], []
            stores, without_recent = set(), 0
            for component in snapshot.components:
                category = component.category.value
                for offer in component.offers:
                    stores.add(offer.store)
                basic = resolve_stock_specs(component, snapshot)
                specs = resolve_published_technical(component, snapshot, basic).specs
                missing = sorted(
                    attribute
                    for attribute in ESSENTIAL_ATTRIBUTES.get(category, frozenset())
                    if specs.fact(attribute) is None
                )
                if missing:
                    missing_items.append(
                        {
                            "component_id": component.id,
                            "category": category,
                            "name": component.name,
                            "missing": missing,
                            "affected_pcs": usage.get(component.id, 0),
                        }
                    )
                priced = [
                    offer
                    for offer in component.offers
                    if offer.condition == "cash" and offer.amount is not None
                ]
                if not priced:
                    without_recent += 1
                    continue
                latest = max(
                    priced, key=lambda offer: (offer.observed_at, offer.offer_id)
                )
                age = now - latest.observed_at
                if age <= LOWEST_OFFER_MAX_AGE:
                    continue
                without_recent += 1
                old_items.append(
                    {
                        "component_id": component.id,
                        "category": category,
                        "name": component.name,
                        "amount": latest.amount,
                        "currency": latest.currency,
                        "store": latest.store,
                        "observed_at": latest.observed_at.isoformat(),
                        "days": max(age.days, 0),
                    }
                )
            missing_items.sort(key=lambda item: item["component_id"])
            old_items.sort(key=lambda item: (item["observed_at"], item["component_id"]))

            def page(items):
                return {
                    "items": items[offset : offset + limit],
                    "total": len(items),
                    "limit": limit,
                    "offset": offset,
                }

            return {
                "dataset_version": version,
                "metrics": {
                    "components": len(snapshot.components),
                    "missing_data": len(missing_items),
                    "without_recent_price": without_recent,
                    "stores": len(stores),
                },
                "missing_data": page(missing_items),
                "old_prices": page(old_items),
            }

    def record_manual_price(
        self,
        conn,
        owner,
        component_id,
        amount,
        observed_on,
        source_url,
        dataset_version,
        created_at,
    ):
        conn.execute(
            manual_price_changes.insert().values(
                id=uuid.uuid4(),
                admin_id=owner,
                component_id=component_id,
                amount=amount,
                currency="ARS",
                observed_on=observed_on,
                source_url=source_url,
                dataset_version=dataset_version,
                created_at=created_at,
            )
        )

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
            try:
                copied = [
                    dict(item, dataset_version=identity)
                    for item in inherited
                    if item["component_id"] in retained
                    and preserve_retail_resource(
                        item,
                        old_parts[item["component_id"]],
                        new_parts[item["component_id"]],
                    )
                ]
            except (ValueError, TypeError):
                raise PCError(
                    422, "Invalid technical retail identity binding"
                ) from None
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
