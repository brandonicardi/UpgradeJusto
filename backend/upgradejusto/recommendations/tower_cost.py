"""Incremental Decimal offers only, no historical price or resale fallback."""

import re
from decimal import Decimal

from upgradejusto.compatibility.tower_contract import REQUIRED
from upgradejusto.retail.models import REFERENCE_PRICE_VALIDITY


def select_offer(component, condition, now, identity=None, quantity=1):
    valid = []
    for offer in component.offers:
        stock = getattr(offer, "stock_quantity", None)
        if stock is not None and (type(stock) is not int or stock < quantity):
            continue
        if identity is not None and (
            not isinstance(identity, dict)
            or any(
                getattr(offer, key, None) != identity.get(key)
                for key in ("store", "product_id", "variant_key", "source_url")
            )
        ):
            continue
        if (
            offer.component_id != component.id
            or not offer.variant_key
            or offer.condition != condition
            or offer.availability != "in_stock"
            or offer.status != "fresh"
            or offer.amount is None
            or not re.fullmatch(r"(?:0|[1-9][0-9]*)\.[0-9]{2}", offer.amount)
            or not offer.observed_at <= now < offer.expires_at
            or offer.expires_at > offer.observed_at + REFERENCE_PRICE_VALIDITY
            or Decimal(offer.amount) <= 0
        ):
            continue
        valid.append(offer)
    return min(valid, key=lambda o: (Decimal(o.amount), o.offer_id)) if valid else None


def incremental_cost(before, after, catalog, condition, budget, now):
    previous = {line.line_id: line for line in before.lines}
    lines, offers, missing = [], [], []
    subtotal = Decimal(0)
    demand = {}
    for line in after.lines:
        if line.line_id in previous and line == previous[line.line_id]:
            continue
        if line.component_id is None:
            missing.append("offer:" + str(line.declared_model))
            continue
        demand[line.component_id] = demand.get(line.component_id, 0) + line.quantity
    # One quote must cover the full incremental demand, including distinct lines
    # or actions for the same part. Installed, unchanged units consume no stock.
    for component_id, quantity in sorted(demand.items()):
        component = catalog.get(component_id)
        identity = getattr(catalog, "retail_identities", {}).get(component_id)
        offer = (
            select_offer(component, condition, now, identity, quantity)
            if component
            else None
        )
        if offer is None:
            missing.append(f"offer:{component_id}:available_quantity:{quantity}")
            continue
        amount = Decimal(offer.amount) * quantity
        subtotal += amount
        offers.append(offer.model_dump(mode="json"))
        lines.append(
            {
                "component_id": component.id,
                "quantity": quantity,
                "unit_amount_ars": offer.amount,
                "amount_ars": f"{amount:.2f}",
                "offer_id": offer.offer_id,
            }
        )
    return (
        {
            "total_ars": None if missing else f"{subtotal:.2f}",
            "known_subtotal_ars": f"{subtotal:.2f}",
            "within_budget": False
            if subtotal > budget
            else (None if missing else True),
            "lines": lines,
            "missing_fields": missing,
            "excluded": ["shipping", "financing", "labor"],
        },
        offers,
    )


def classify(evaluation, benefit, cost, dependencies):
    if (
        evaluation.verdict == "incompatible"
        or any(r.state == "fail" for r in evaluation.rule_results)
        or cost["within_budget"] is False
        or benefit["status"] == "not_an_improvement"
    ):
        return "rejected"
    green = (
        evaluation.verdict == "compatible"
        and not evaluation.missing_fields
        and {r.rule_id for r in evaluation.rule_results} == set(REQUIRED)
        and all(r.state == "pass" for r in evaluation.rule_results)
    )
    if (
        green
        and benefit["status"] == "supported"
        and cost["total_ars"] is not None
        and cost["within_budget"] is True
        and not any(d["required"] and d["state"] == "missing" for d in dependencies)
    ):
        return "recommended"
    return "requires_verification"
