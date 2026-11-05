"""REAL expired published quote + synthetic owned history, then real HTTP/PG shares.

Not an HTTP save at a false clock, real past plan emission or current-price claim.
Only the pure calculator receives a historical timestamp; published rows are read-only.
"""

import hashlib
import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from test_pcs_postgres import actors as actors
from test_tower38_share_mounted import PUBLISH, checked, signed
from test_tower38_share_mounted import share_context as share_context

from upgradejusto.administration.tables import active
from upgradejusto.administration.tables import revisions as catalog_revisions
from upgradejusto.catalog.postgres import published_catalog_snapshot
from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_repository import TowerRepository
from upgradejusto.persistence.schema import components
from upgradejusto.plans.tower_models import TowerPlanCreate
from upgradejusto.plans.tower_service import Generation, request_hash
from upgradejusto.plans.tower_tables import headers, revisions
from upgradejusto.recommendations.tower_cost import select_offer
from upgradejusto.recommendations.tower_repository import TowerRecommendationCatalog
from upgradejusto.retail.models import (
    REFERENCE_PRICE_VALIDITY,
    Offer,
    retail_url,
)
from upgradejusto.retail.tables import resources
from upgradejusto.shares.tower_sources import PublicSources


class ExistingExpiredQuoteUnavailable(Exception):
    pass


def require(value):
    if not value:
        pytest.fail(
            "Expired-quote HTTP assertion failed (details withheld)", pytrace=False
        )


def fingerprint(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=True, allow_nan=False).encode()
    ).digest()


def catalog_state(conn):
    point = conn.scalar(sa.select(active.c.version).where(active.c.singleton == 1))
    return (
        point,
        conn.scalar(
            sa.select(sa.func.count())
            .select_from(components)
            .where(components.c.dataset_version == point)
        ),
        conn.scalar(sa.select(sa.func.count()).select_from(components)),
        conn.scalar(sa.select(sa.func.count()).select_from(resources)),
        conn.scalar(sa.select(sa.func.count()).select_from(catalog_revisions)),
    )


def source_metadata(quote, refs):
    indexed = {ref["ref"]: ref for ref in refs}
    return [
        {
            key: indexed[identity][key]
            for key in ("class", "url", "consulted_on", "locator")
        }
        for identity in quote["references"]
    ]


def existing_expired_quote(conn):
    now = conn.scalar(sa.select(sa.func.clock_timestamp()))
    versions = conn.scalars(
        sa.select(catalog_revisions.c.id)
        .where(catalog_revisions.c.status == "published")
        .order_by(catalog_revisions.c.id)
    ).all()
    # All published versions/resources, not first-page catalog or hardware-ID lists.
    for version in versions:
        raw_rows = (
            conn.execute(
                sa.select(resources)
                .where(resources.c.dataset_version == version)
                .order_by(resources.c.component_id)
            )
            .mappings()
            .all()
        )
        if not raw_rows:
            continue
        snapshot = published_catalog_snapshot(conn, version)
        indexed = {row["component_id"]: row for row in raw_rows}
        # Undo only read-time freshness decoration by restoring the EXACT RAW Offer
        # objects. No field/status/date/price is synthesized or persisted here.
        parts = tuple(
            part.model_copy(
                update={
                    "offers": tuple(
                        Offer.model_validate(raw) for raw in indexed[part.id]["offers"]
                    )
                }
            )
            if part.id in indexed
            else part
            for part in snapshot.components
        )
        catalog = TowerRecommendationCatalog(
            replace(snapshot, components=parts),
            {identity: row["identity"] for identity, row in indexed.items()},
        )
        for row in raw_rows:
            part = catalog.get(row["component_id"])
            if part is None or row["identity"].get("category") != part.category.value:
                continue
            for raw in sorted(row["offers"], key=lambda item: item["offer_id"]):
                try:
                    quote = Offer.model_validate(raw)
                    if (
                        quote.observed_at.tzinfo is None
                        or quote.expires_at.tzinfo is None
                        or quote.expires_at >= now
                        or quote.expires_at
                        != quote.observed_at + REFERENCE_PRICE_VALIDITY
                        or quote.store not in ("compragamer", "venex")
                    ):
                        continue
                    retail_url(quote.source_url, quote.store)
                    historic_now = (
                        quote.observed_at + (quote.expires_at - quote.observed_at) / 2
                    )
                    selected = select_offer(
                        part, quote.condition, historic_now, row["identity"], 1
                    )
                    if selected is None or selected.offer_id != quote.offer_id:
                        continue
                    sources = PublicSources(catalog, version, raw_rows)
                    public_quote = sources.quote(raw)
                    evidence = source_metadata(public_quote, sources.public_refs)
                    if not any(
                        ref["class"] == "retail_product"
                        and ref["url"] == quote.source_url
                        for ref in evidence
                    ):
                        continue
                except (PCError, ValueError, KeyError, TypeError):
                    # Ineligible/unpublishable evidence is not turned into a price.
                    continue
                return SimpleNamespace(
                    version=version,
                    catalog=catalog,
                    part=part,
                    raw=deepcopy(raw),
                    quote=quote,
                    historic_now=historic_now,
                    expected_quote=public_quote,
                    expected_evidence=evidence,
                    resource=deepcopy(dict(row)),
                )
    raise ExistingExpiredQuoteUnavailable


def test_existing_expired_raw_quote_published_and_read_frozen_over_http(
    share_context, pg_engine
):
    ctx = share_context
    phase = "select_existing_expired_quote"
    try:
        with pg_engine.begin() as conn:
            original_catalog = catalog_state(conn)
            selection = existing_expired_quote(conn)
        phase = "calculate_synthetic_history"
        repo = TowerRepository(pg_engine, selection.version)
        base = repo.get(ctx.a[2], UUID(ctx.saved["id"]))
        require(base is not None and base.revision == ctx.saved["revision"])
        original_pc = fingerprint(base.model_dump(mode="json"))
        request = TowerPlanCreate.model_validate(
            {
                "kind": "tower_plan",
                "schema_version": 2,
                "client_request_id": str(uuid4()),
                "name": "Synthetic historical quote fixture, not past emission",
                "pc_id": str(base.id),
                "expected_pc_revision": base.revision,
                "expected_catalog_version": selection.version,
                "objective": "general",
                "workload": None,
                "budget_ars": selection.quote.amount,
                "price_condition": selection.quote.condition,
                "stages": [
                    {
                        "name": "Synthetic historically calculated purchase",
                        "budget_ars": selection.quote.amount,
                        "materials": [],
                        "actions": [
                            {
                                "action": "replace_category",
                                "category": selection.part.category.value,
                                "candidates": [
                                    {"component_id": selection.part.id, "quantity": 1}
                                ],
                            }
                        ],
                    }
                ],
            }
        )
        snapshot = Generation(request).calculate(
            base, selection.catalog, selection.version, selection.historic_now
        )
        # No clock patch, before_commit override or HTTP-save bypass presented as
        # real creation. This INSERT is explicitly synthetic OWN historical fixture.
        require(snapshot["stages"][0]["offers"] == [selection.raw])
        require(snapshot["status"] in ("blocked", "requires_verification"))
        require(
            snapshot["stages"][0]["cost"]["known_subtotal_ars"]
            == selection.quote.amount
        )
        original_history = fingerprint(snapshot)
        identity = uuid4()
        phase = "insert_owned_synthetic_history"
        with pg_engine.begin() as conn:
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            require(selection.quote.expires_at < now)
            conn.execute(
                headers.insert().values(
                    id=identity,
                    owner_id=ctx.a[2],
                    pc_id=base.id,
                    current_revision=1,
                    create_request_id=request.client_request_id,
                    create_request_hash=request_hash(request),
                    created_at=now,
                    updated_at=now,
                )
            )
            conn.execute(
                revisions.insert().values(
                    plan_id=identity,
                    revision=1,
                    operation_id=request.client_request_id,
                    request_hash=request_hash(request),
                    snapshot=snapshot,
                    created_at=now,
                )
            )
        phase = "publish_http_at_real_now"
        path = f"/api/tower-plans/{identity}/shares"
        created = checked(
            ctx.a[0].post(path, headers=signed("POST", path, ctx.a), json=PUBLISH), 201
        ).json()
        phase = "public_expired_quote_http"
        public_path = "/api/shared-tower-plans/" + created["token"]
        first = checked(
            ctx.a[0].get(public_path, headers=signed("GET", public_path, ctx.a)), 200
        )
        public = first.json()
        require(public["versions"]["catalog"] == selection.version)
        require(public["generated_at"] == selection.historic_now.isoformat())
        require(public["status"] == snapshot["status"])
        stage = public["stages"][0]
        require(len(stage["offers"]) == 1)
        quote = stage["offers"][0]
        for key, value in selection.expected_quote.items():
            if key != "references":
                require(quote[key] == value)
        require(datetime.fromisoformat(quote["expires_at"]) < datetime.now(UTC))
        require(
            source_metadata(quote, public["references"]) == selection.expected_evidence
        )
        private_stage = snapshot["stages"][0]
        require(stage["status"] == private_stage["status"])
        require(
            stage["evaluation"]["verdict"] == private_stage["evaluation"]["verdict"]
        )
        require(
            stage["evaluation"]["coverage"] == private_stage["evaluation"]["coverage"]
        )
        require(bool(stage["missing_fields"]) == bool(private_stage["missing_fields"]))
        for public_cost, private_cost in (
            (stage["cost"], snapshot["stages"][0]["cost"]),
            (stage["cumulative_cost"], snapshot["stages"][0]["cumulative_cost"]),
            (public["cost"], snapshot["cost"]),
        ):
            for key in ("total_ars", "known_subtotal_ars", "within_budget", "excluded"):
                require(public_cost[key] == private_cost[key])
            require(len(public_cost["lines"]) == 1)
            line = public_cost["lines"][0]
            require(line["quantity"] == 1)
            require(line["component_ref"] == quote["component_ref"])
            require(line["quote_ref"] == quote["quote_ref"])
            require(line["unit_amount_ars"] == selection.quote.amount)
            require(line["amount_ars"] == selection.quote.amount)
        phase = "repeat_http_and_preservation"
        second = checked(
            ctx.a[0].get(public_path, headers=signed("GET", public_path, ctx.a)), 200
        )
        require(first.content == second.content)
        require(
            original_pc
            == fingerprint(repo.get(ctx.a[2], base.id).model_dump(mode="json"))
        )
        with pg_engine.begin() as conn:
            require(catalog_state(conn) == original_catalog)
            stored = conn.scalar(
                sa.select(revisions.c.snapshot).where(
                    revisions.c.plan_id == identity, revisions.c.revision == 1
                )
            )
            require(fingerprint(stored) == original_history)
            require(
                conn.scalar(
                    sa.select(headers.c.current_revision).where(
                        headers.c.id == identity
                    )
                )
                == 1
            )
            retained = (
                conn.execute(
                    sa.select(resources).where(
                        resources.c.dataset_version == selection.version,
                        resources.c.component_id == selection.part.id,
                    )
                )
                .mappings()
                .one()
            )
            require(dict(retained) == selection.resource)
    except ExistingExpiredQuoteUnavailable:
        pytest.fail("existing expired quote unavailable", pytrace=False)
    except (Exception, pytest.fail.Exception):
        pytest.fail(f"Expired-quote HTTP gate failed [phase={phase}]", pytrace=False)
