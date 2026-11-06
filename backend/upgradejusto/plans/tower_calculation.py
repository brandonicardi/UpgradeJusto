"""Pure accumulated plan calculation over one already-resolved publication."""

from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid5

from upgradejusto.compatibility.tower_application import apply_tower_actions
from upgradejusto.compatibility.tower_contract import ESSENTIAL_REQUIRED
from upgradejusto.compatibility.tower_essential import evaluate_tower_essential
from upgradejusto.compatibility.tower_evidence import resolve_tower_evidence
from upgradejusto.compatibility.tower_http_models import TowerEvaluationResponse
from upgradejusto.recommendations.tower_cost import select_offer
from upgradejusto.recommendations.tower_references import (
    IDENTITY_VERSION,
    REFERENCE_VERSION,
    benefit,
)
from upgradejusto.recommendations.tower_service import (
    canonical_actions,
    material_dependencies,
)

CALCULATION_VERSION = "tower-plan-calculation-1"
LIMITATIONS = [
    "Saved plan never applies changes to the PC; every prefix requires validation.",
    "Quotes frozen at generation, not reservations or future stock/price guarantees.",
    "Shipping, financing and labor excluded; removed parts receive no resale credit.",
    "Reference scores are not FPS or guaranteed physical system performance.",
    "Unidentified installed stock cooler remains conditional, not proven installed.",
    "Unknown necessary tower evidence including T10 blocks ready; no policy bypass.",
]


def stock_key(offer):
    # An internal catalog alias must not mint a second retailer inventory pool.
    return (offer.store, offer.product_id, offer.variant_key)


def purchase_cost(before, after, catalog, condition, budget, now, consumed):
    previous = {line.line_id: line for line in before.lines}
    demand, missing, lines, quotes = {}, [], [], []
    subtotal = Decimal(0)
    for line in after.lines:
        if previous.get(line.line_id) == line:
            continue
        if line.component_id is None:
            missing.append("offer:unidentified_component")
        else:
            demand[line.component_id] = demand.get(line.component_id, 0) + line.quantity
    for identity, quantity in sorted(demand.items()):
        component = catalog.get(identity)
        offers = []
        binding = getattr(catalog, "retail_identities", {}).get(identity)
        for offer in component.offers if component else ():
            key = stock_key(offer)
            already = consumed.get(key, 0)
            candidate = SimpleNamespace(id=identity, offers=(offer,))
            if select_offer(candidate, condition, now, binding, quantity + already):
                offers.append(offer)
        quote = (
            min(offers, key=lambda o: (Decimal(o.amount), o.offer_id))
            if offers
            else None
        )
        if quote is None:
            missing.append(f"offer:{identity}:prefix_available_quantity")
            # Unfulfilled earlier demand still belongs to the plan prefix. Do
            # not let a later smaller stage reuse that known insufficient pool.
            pools = {stock_key(o) for o in component.offers} if component else set()
            for key in pools:
                consumed[key] = consumed.get(key, 0) + quantity
            continue
        key = stock_key(quote)
        consumed[key] = consumed.get(key, 0) + quantity
        amount = Decimal(quote.amount) * quantity
        subtotal += amount
        lines.append(
            {
                "component_id": identity,
                "quantity": quantity,
                "unit_amount_ars": quote.amount,
                "amount_ars": f"{amount:.2f}",
                "offer_id": quote.offer_id,
            }
        )
        quotes.append(quote.model_dump(mode="json"))
    return (
        {
            "total_ars": None if missing else f"{subtotal:.2f}",
            "known_subtotal_ars": f"{subtotal:.2f}",
            "within_budget": False if subtotal > budget else None if missing else True,
            "lines": lines,
            "missing_fields": missing,
            "excluded": ["shipping", "financing", "labor"],
        },
        quotes,
    )


def accumulate(costs, budget):
    subtotal = sum((Decimal(c["known_subtotal_ars"]) for c in costs), Decimal(0))
    missing = [
        f"stages.{position}.{field}"
        for position, cost in enumerate(costs, 1)
        for field in cost["missing_fields"]
    ]
    complete = all(cost["total_ars"] is not None for cost in costs)
    return {
        "total_ars": f"{subtotal:.2f}" if complete else None,
        "known_subtotal_ars": f"{subtotal:.2f}",
        "within_budget": False if subtotal > budget else True if complete else None,
        "lines": [line for cost in costs for line in cost["lines"]],
        "missing_fields": missing,
        "excluded": ["shipping", "financing", "labor"],
    }


def stage_configuration(before, actions, catalog, position):
    result = apply_tower_actions(before, actions, catalog)
    existing = {line.line_id for line in before.lines}
    for index, line in enumerate(result.lines):
        if line.line_id not in existing:
            line.line_id = uuid5(
                before.id,
                f"tower-plan:{before.revision}:{position}:{index}:{line.category}:{line.component_id}:{line.declared_model}:{line.quantity}",
            )
    return result


def compatible(evaluation):
    return (
        evaluation.verdict == "compatible"
        and evaluation.coverage.complete
        and not evaluation.missing_fields
        and {r.rule_id for r in evaluation.rule_results} == set(ESSENTIAL_REQUIRED)
        and all(r.state in ("pass", "not_applicable") for r in evaluation.rule_results)
    )


def iter_stages(base, request, catalog, version, now):
    """Yield full stages so the application can enforce its cooperative deadline."""
    current = base.model_copy(deep=True)
    costs, consumed = [], {}
    for position, stage in enumerate(request.stages, 1):
        after = stage_configuration(current, stage.actions, catalog, position)
        evidence = resolve_tower_evidence(after, catalog, version)
        result = evaluate_tower_essential(after, evidence)
        evaluation = TowerEvaluationResponse(
            **result.model_dump(), evaluated_configuration=after
        )
        cost, quotes = purchase_cost(
            current,
            after,
            catalog,
            request.price_condition,
            Decimal(stage.budget_ars),
            now,
            consumed,
        )
        dependencies = material_dependencies(current, after, evidence, stage)
        primary = {"general": "ram", "gaming": "gpu", "productivity": "cpu"}[
            request.objective
        ]
        extra = {
            candidate.component_id: action.category.value
            for action in stage.actions
            if action.category != primary
            for candidate in action.candidates
            if candidate.component_id is not None
        }
        for identity, category in sorted(extra.items()):
            paid = next(
                (line for line in cost["lines"] if line["component_id"] == identity),
                None,
            )
            dependencies.append(
                {
                    "kind": category,
                    "required": True,
                    "state": "priced" if paid else "missing",
                    "component_id": identity,
                    "offer_id": paid["offer_id"] if paid else None,
                    "amount_ars": paid["amount_ars"] if paid else None,
                    "source_refs": [
                        q["source_url"] for q in quotes if q["component_id"] == identity
                    ],
                    "reason": "Explicit paid stage action; not an implicit free platform dependency",
                }
            )
        for dependency in dependencies:
            if dependency["required"] and dependency["state"] == "missing":
                cost["missing_fields"].append("dependency:" + dependency["kind"])
                cost["total_ars"] = None
                if cost["within_budget"] is True:
                    cost["within_budget"] = None
        costs.append(cost)
        cumulative = accumulate(costs, Decimal(request.budget_ars))
        gain = benefit(current, after, catalog, request.objective, request.workload)
        if gain["status"] == "not_an_improvement" and not any(
            action.category == primary for action in stage.actions
        ):
            gain = {
                **gain,
                "label": "Dependency/preparation only; no independent performance benefit",
            }
        missing = list(result.missing_fields) + cost["missing_fields"]
        fail = result.verdict == "incompatible" or any(
            r.state == "fail" for r in result.rule_results
        )
        blocked = (
            fail
            or cost["within_budget"] is False
            or cumulative["within_budget"] is False
        )
        ready = (
            compatible(result)
            and cost["within_budget"] is True
            and cumulative["within_budget"] is True
        )
        yield {
            "position": position,
            "name": stage.name,
            "budget_ars": stage.budget_ars,
            "actions": canonical_actions(stage.actions),
            "materials": [m.model_dump(mode="json") for m in stage.materials],
            "evaluated_configuration": after.model_dump(mode="json"),
            "evaluation": evaluation.model_dump(mode="json"),
            "benefit": gain,
            "dependencies": dependencies,
            "offers": quotes,
            "cost": cost,
            "cumulative_cost": cumulative,
            "status": "blocked"
            if blocked
            else "ready"
            if ready
            else "requires_verification",
            "missing_fields": sorted(set(missing)),
            "warnings": list(result.warnings),
        }
        current = after


def finish_snapshot(base, request, catalog, version, now, stages):
    from upgradejusto.pcs.tower_models import Tower

    final = Tower.model_validate(stages[-1]["evaluated_configuration"])
    gain = benefit(base, final, catalog, request.objective, request.workload)
    cost = accumulate([stage["cost"] for stage in stages], Decimal(request.budget_ars))
    missing = [
        f"stages.{stage['position']}.{field}"
        for stage in stages
        for field in stage["missing_fields"]
    ]
    if gain["status"] != "supported":
        missing.append("benefit:final_applicable_reference_or_improvement")
    blocked = (
        any(s["status"] == "blocked" for s in stages) or cost["within_budget"] is False
    )
    blocked = blocked or gain["status"] == "not_an_improvement"
    ready = (
        all(s["status"] == "ready" for s in stages) and gain["status"] == "supported"
    )
    status = "blocked" if blocked else "ready" if ready else "requires_verification"
    evaluation = stages[-1]["evaluation"]
    scope = evaluation["scope"]
    return {
        "kind": "tower_plan",
        "schema_version": 2,
        "name": request.name,
        "generated_at": now.isoformat(),
        "pc_revision": base.revision,
        "base_configuration": base.model_dump(mode="json"),
        "objective": request.objective,
        "workload": request.workload,
        "budget_ars": request.budget_ars,
        "currency": "ARS",
        "price_condition": request.price_condition,
        "versions": {
            "catalog": version,
            "rules": evaluation["rules_version"],
            "policy": scope["policy_version"],
            "inventory": scope["inventory_version"],
            "scope": scope["id"],
            "references": REFERENCE_VERSION,
            "identity": IDENTITY_VERSION,
            "calculation": CALCULATION_VERSION,
        },
        "stages": stages,
        "cost": cost,
        "benefit": gain,
        "status": status,
        "label": "Plan bloqueado — no ejecutar"
        if blocked
        else "Plan listo dentro del alcance declarado"
        if ready
        else "Plan borrador — requiere verificación",
        "missing_fields": sorted(set(missing + cost["missing_fields"])),
        "limitations": LIMITATIONS,
    }
