"""Atomic curation application service; no fetches, fuzzy matching or inferred specs."""

import hashlib
import json
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import sqlalchemy as sa

from upgradejusto.administration.repository import AdministrationRepository
from upgradejusto.administration.tables import active, revisions, rows
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import components, datasets
from upgradejusto.retail.models import (
    REFERENCE_PRICE_VALIDITY,
    VendorBatch,
    make_offer,
    retail_url,
)
from upgradejusto.retail.tables import publications, resources


def batch_key(batch):
    payload = json.dumps(
        batch.model_dump(mode="json"), sort_keys=True, separators=(",", ":")
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def suppress_failed_refresh(evidence, identity):
    """New publication cannot advertise a failed/conflicting refresh as current."""
    if identity not in evidence:
        return
    previous = evidence[identity]
    image = previous["image_evidence"]
    evidence[identity] = {
        **previous,
        "offers": [{**offer, "status": "unavailable"} for offer in previous["offers"]],
        "image_evidence": {**image, "status": "quarantined"} if image else None,
    }


class RetailRepository:
    def __init__(self, engine):
        self.engine = engine
        self.administration = AdministrationRepository(engine)

    def copy_revision(self, conn, current, version):
        """Shared copy of one published revision; batches keep identical behavior."""
        old_parts = (
            conn.execute(
                sa.select(components).where(components.c.dataset_version == current)
            )
            .mappings()
            .all()
        )
        parts = {r["id"]: dict(r, dataset_version=version) for r in old_parts}
        old_resources = (
            conn.execute(
                sa.select(resources).where(resources.c.dataset_version == current)
            )
            .mappings()
            .all()
        )
        evidence = {
            r["component_id"]: dict(r, dataset_version=version) for r in old_resources
        }
        entries = self.administration._entries(conn, current)
        entries = {
            (r["collection"], r["id"]): dict(r, revision_id=version) for r in entries
        }
        return parts, evidence, entries

    def publish(self, server_identity, batch: VendorBatch, expected_active):
        # Revalidate even when the caller used model_construct/model_copy.
        batch = VendorBatch.model_validate_json(batch.model_dump_json())
        if batch.observed_at > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise PCError(422, "Acquisition timestamp is in the future")
        key = batch_key(batch)
        with self.engine.begin() as conn:
            self.administration._authorize(conn, server_identity)
            current = conn.scalar(sa.select(active.c.version).with_for_update())
            previous = (
                conn.execute(
                    sa.select(publications).where(
                        publications.c.store == batch.store,
                        publications.c.source_version == batch.source_version,
                    )
                )
                .mappings()
                .first()
            )
            if previous:
                if previous["batch_key"] != key:
                    raise PCError(409, "Source version already has different content")
                return {
                    "dataset_version": previous["dataset_version"],
                    "idempotent": True,
                    "quarantine": previous["quarantine"],
                }
            if not current or current != expected_active:
                raise PCError(409, "Active revision conflict")
            version = "retail-" + key
            parts, evidence, entries = self.copy_revision(conn, current, version)
            quarantine = []
            prefix = "cg" if batch.store == "compragamer" else "venex"
            for record in batch.records:
                identity = f"{prefix}-{record.product_id}"
                previous_identity = evidence.get(identity, {}).get("identity")
                details = {
                    "store": batch.store,
                    "product_id": record.product_id,
                    "variant_key": record.variant_key,
                    "mpn": record.mpn,
                    "gtin": record.gtin,
                    "source_url": record.source_url,
                    "category": record.category,
                    "rights_note": record.rights_note,
                }
                conflict = previous_identity and any(
                    previous_identity.get(k) != details[k]
                    for k in ("variant_key", "mpn", "gtin", "category", "source_url")
                )
                if (
                    not record.identity_verified
                    or conflict
                    or (identity in parts and previous_identity is None)
                ):
                    suppress_failed_refresh(evidence, identity)
                    quarantine.append(
                        {
                            "product_id": record.product_id,
                            "reason": "identity_conflict_or_unverified",
                            "record": record.model_dump(mode="json"),
                        }
                    )
                    continue
                # Ambiguous primary conditions never become current offers.
                if any(
                    not item.condition_verified and item.amount
                    for item in record.offers
                ):
                    suppress_failed_refresh(evidence, identity)
                    quarantine.append(
                        {
                            "product_id": record.product_id,
                            "reason": "ambiguous_price_condition",
                            "record": record.model_dump(mode="json"),
                        }
                    )
                    continue
                source_id = f"retail-{identity}"
                # A commercial refresh is not a technical reconciliation. Existing
                # components and CU10 entries, including provenance, stay untouched.
                if identity not in parts:
                    part_data = {
                        "category": record.category,
                        "name": record.name,
                        "attributes": {},
                        "sources": [{"id": source_id, "url": record.source_url}],
                    }
                    parts[identity] = {
                        "dataset_version": version,
                        "id": identity,
                        **part_data,
                        "prices": [],
                        "image": None,
                    }
                    entries[("components", identity)] = {
                        "revision_id": version,
                        "collection": "components",
                        "id": identity,
                        "data": part_data,
                    }
                    entries[("sources", source_id)] = {
                        "revision_id": version,
                        "collection": "sources",
                        "id": source_id,
                        "data": {
                            "source_id": source_id,
                            "url": record.source_url,
                            "consulted_on": batch.observed_at.date().isoformat(),
                            "locator": "Exact vendor product identity; no technical inference",
                        },
                    }
                evidence[identity] = {
                    "dataset_version": version,
                    "component_id": identity,
                    "identity": details,
                    "image_evidence": record.image.model_dump(mode="json")
                    if record.image
                    else None,
                    "offers": [
                        make_offer(batch, record, o, identity).model_dump(mode="json")
                        for o in record.offers
                    ],
                }
            conn.execute(
                revisions.insert().values(
                    id=version,
                    base_version=current,
                    status="draft",
                )
            )
            conn.execute(datasets.insert().values(version=version))
            conn.execute(components.insert(), list(parts.values()))
            if entries:
                conn.execute(rows.insert(), list(entries.values()))
            if evidence:
                conn.execute(resources.insert(), list(evidence.values()))
            conn.execute(
                publications.insert().values(
                    batch_key=key,
                    dataset_version=version,
                    store=batch.store,
                    source_version=batch.source_version,
                    raw_sha256=batch.raw_sha256,
                    observed_at=batch.observed_at,
                    partial_batch=batch.partial_batch,
                    pagination_complete=batch.pagination_complete,
                    quarantine=quarantine,
                )
            )
            conn.execute(
                revisions.update()
                .where(revisions.c.id == version)
                .values(status="published")
            )
            conn.execute(
                active.update().where(active.c.singleton == 1).values(version=version)
            )
            return {
                "dataset_version": version,
                "idempotent": False,
                "quarantine": quarantine,
                "total": len(parts),
            }

    def publish_manual_price(
        self,
        server_identity,
        component_id,
        amount,
        observed_on,
        source_url,
        expected_active,
        now=None,
    ):
        """Replace only the cash offer of a store component in a new revision."""
        now = now or datetime.now(timezone.utc)
        argentina = timezone(timedelta(hours=-3))
        today = now.astimezone(argentina).date()
        if component_id.startswith("cg-"):
            store = "compragamer"
        elif component_id.startswith("venex-"):
            store = "venex"
        else:
            raise PCError(422, "Component has no store")
        try:
            value = Decimal(str(amount))
        except (ArithmeticError, ValueError):
            raise PCError(422, "Invalid amount") from None
        if (
            value <= 0
            or value > Decimal("999999999999.99")
            or value != value.quantize(Decimal("0.01"))
        ):
            raise PCError(422, "Invalid amount")
        if observed_on > today or (today - observed_on).days > 30:
            raise PCError(422, "Invalid observed date")
        try:
            retail_url(source_url, store)
        except ValueError:
            raise PCError(422, "Invalid store URL") from None
        observed_at = (
            now
            if observed_on == today
            else datetime.combine(
                observed_on, time(12, 0), tzinfo=argentina
            ).astimezone(timezone.utc)
        )
        payload = json.dumps(
            {
                "component_id": component_id,
                "amount": f"{value:.2f}",
                "observed_on": observed_on.isoformat(),
                "source_url": source_url,
                "expected_active": expected_active,
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        digest = hashlib.sha256(payload.encode()).hexdigest()
        version = "retail-" + digest
        source_version = "manual-" + uuid4().hex
        with self.engine.begin() as conn:
            self.administration._authorize(conn, server_identity)
            current = conn.scalar(sa.select(active.c.version).with_for_update())
            if not current or current != expected_active:
                raise PCError(409, "Active revision conflict")
            if (
                conn.scalar(
                    sa.select(components.c.id).where(
                        components.c.dataset_version == current,
                        components.c.id == component_id,
                    )
                )
                is None
            ):
                raise PCError(404, "Component not found")
            parts, evidence, entries = self.copy_revision(conn, current, version)
            row = evidence.get(component_id)
            if row is None:
                raise PCError(422, "Component has no retail evidence")
            offers = [dict(item) for item in row["offers"]]
            previous = next(
                (item for item in offers if item.get("condition") == "cash"), None
            )
            identity = row.get("identity") or {}
            offers = [item for item in offers if item is not previous]
            offers.append(
                {
                    "offer_id": f"{component_id}:{source_version}:cash",
                    "store": store,
                    "product_id": (previous or {}).get("product_id")
                    or str(
                        identity.get("product_id") or component_id.split("-", 1)[-1]
                    ),
                    "component_id": component_id,
                    "variant_key": (previous or {}).get("variant_key")
                    or str(identity.get("variant_key") or component_id),
                    "amount": f"{value:.2f}",
                    "currency": "ARS",
                    "condition": "cash",
                    "availability": (previous or {}).get("availability", "unknown"),
                    "stock_quantity": (previous or {}).get("stock_quantity"),
                    "source_url": source_url,
                    "observed_at": observed_at.isoformat(),
                    "expires_at": (observed_at + REFERENCE_PRICE_VALIDITY).isoformat(),
                    "status": "fresh",
                }
            )
            evidence[component_id] = {**row, "offers": offers}
            conn.execute(
                revisions.insert().values(
                    id=version,
                    base_version=current,
                    status="draft",
                )
            )
            conn.execute(datasets.insert().values(version=version))
            conn.execute(components.insert(), list(parts.values()))
            if entries:
                conn.execute(rows.insert(), list(entries.values()))
            conn.execute(resources.insert(), list(evidence.values()))
            conn.execute(
                publications.insert().values(
                    batch_key=digest,
                    dataset_version=version,
                    store=store,
                    source_version=source_version,
                    raw_sha256=digest,
                    observed_at=observed_at,
                    partial_batch=True,
                    pagination_complete=False,
                    quarantine=[],
                )
            )
            conn.execute(
                revisions.update()
                .where(revisions.c.id == version)
                .values(status="published")
            )
            conn.execute(
                active.update().where(active.c.singleton == 1).values(version=version)
            )
            self.administration.record_manual_price(
                conn,
                server_identity,
                component_id,
                value,
                observed_on,
                source_url,
                version,
                now,
            )
            return {
                "dataset_version": version,
                "component_id": component_id,
                "store": store,
                "amount": f"{value:.2f}",
                "observed_at": observed_at.isoformat(),
            }
