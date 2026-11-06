"""Deterministic bounded search over a COMPLETE pinned server snapshot."""

from datetime import UTC, datetime
from decimal import Decimal
from itertools import product
from types import SimpleNamespace
from uuid import uuid5

from upgradejusto.compatibility.tower_application import apply_tower_actions
from upgradejusto.compatibility.tower_essential import evaluate_tower_essential
from upgradejusto.compatibility.tower_evidence import resolve_tower_evidence
from upgradejusto.compatibility.tower_http_models import (
    TowerAction,
    TowerEvaluationResponse,
)
from upgradejusto.pcs.service import PCError

from .advisor import advise
from .tower_cost import classify, incremental_cost, select_offer
from .tower_models import TowerPreviewItem, TowerPreviewResponse
from .tower_references import (
    IDENTITY_VERSION,
    REFERENCE_VERSION,
    benefit,
    line_specs,
)

SEARCH_VERSION = "tower-recommend-search-2"
# Below this, the change is not worth the money or the work of installing it.
MIN_GAIN_PERCENT = Decimal(10)
MAX_REJECTED_SHOWN = 6
MAX_EVALUATIONS = 128
DEPENDENCY_OPTIONS = 2
LIMITATIONS = [
    "Reference scores are not FPS or guaranteed performance of your PC.",
    "General objective measures RAM capacity, not universal performance.",
    "Unknown identity, compatibility, benefit or full cost never means recommended.",
    "Shipping, financing and labor excluded; installed parts receive no resale credit.",
    "No physical thermal/electrical certification; see motor warnings and scope.",
    "Thermal compound is required only with sourced operation evidence, never universally.",
    "Complete catalog scanned; bounded search128 evaluations, two cheapest fresh options per dependency category; not exhaustive optimum.",
]


def gain_percent(score):
    if score.get("status") != "supported":
        return None
    before, after = Decimal(str(score["before"])), Decimal(str(score["after"]))
    return (after - before) / before * 100 if before > 0 else None


def value_score(gain, price, budget):
    """Gain weighted by the share of budget it uses: explainable, not a black box.

    The square root keeps a big upgrade ahead of a tiny cheap one, while two
    similar gains still resolve in favor of the one that costs less.
    """
    if gain is None or price is None or price <= 0 or budget <= 0:
        return Decimal(0)
    return gain / (price / budget).sqrt()


def replacement(component, quantity=1):
    return TowerAction(
        action="replace_category",
        category=component.category,
        line_id=None,
        candidates=[{"component_id": component.id, "quantity": quantity}],
    )


def canonical_actions(actions):
    """Reusable wire selections: omit inapplicable nulls, retain required IDs.

    A supplied motherboard context retains its required BIOS field, including
    explicit null (unknown). Only absent optional contexts are omitted.
    """
    result = []
    for action in actions:
        wire = action.model_dump(mode="json", exclude_none=True)
        if action.candidate_context is not None:
            wire["candidate_context"] = action.candidate_context.model_dump(mode="json")
        result.append(wire)
    return result


def simulate(tower, actions, catalog):
    result = apply_tower_actions(tower, actions, catalog)
    existing = {line.line_id for line in tower.lines}
    # Stable IDs make repeated previews reproducible; never stored.
    for position, line in enumerate(result.lines):
        if line.line_id not in existing:
            line.line_id = uuid5(
                tower.id,
                f"preview:{position}:{line.category}:{line.component_id}:{line.declared_model}:{line.quantity}",
            )
    return result


def too_many_modules(component, quantity, catalog):
    """Two kits of four sticks is never a home PC, whatever the board says."""
    line = SimpleNamespace(
        category=component.category, component_id=component.id, declared_model=None
    )
    return (line_specs(line, catalog).fact("kit_modules") or 1) * quantity > 4


def cheapest_per_wattage(options, catalog):
    """A bigger PSU is the usual extra: the two cheapest of one size never help."""
    seen, selected = set(), []
    for option in options:
        line = SimpleNamespace(
            category=option[2].category, component_id=option[1], declared_model=None
        )
        watts = line_specs(line, catalog).fact("continuous_power_w")
        if watts is not None and watts >= 550 and watts not in seen:
            seen.add(watts)
            selected.append(option)
    return selected[:3] or options


def automatic_actions(tower, catalog, request, now):
    category = {"general": "ram", "gaming": "gpu", "productivity": "cpu"}[
        request.objective
    ]
    primary = []
    budget = Decimal(request.budget_ars)
    # Scan ALL records before applying evaluation bound; no first50/60 truncation.
    for component in sorted(catalog.values(), key=lambda c: c.id):
        if component.category != category:
            continue
        for quantity in (1, 2, 4) if category == "ram" else (1,):
            if category == "ram" and too_many_modules(component, quantity, catalog):
                continue
            actions = [replacement(component, quantity)]
            try:
                after = simulate(tower, actions, catalog)
            except PCError as exc:
                if exc.status != 422:
                    raise
                continue
            score = benefit(tower, after, catalog, request.objective, request.workload)
            if score["status"] != "supported":
                continue
            offer = select_offer(
                component,
                request.price_condition,
                now,
                getattr(catalog, "retail_identities", {}).get(component.id),
                quantity=quantity,
            )
            price = Decimal(offer.amount) * quantity if offer else Decimal("Infinity")
            value = value_score(gain_percent(score), price, budget)
            primary.append((price > budget, -value, price, component.id, actions))
    primary.sort(key=lambda item: item[:4])
    # Preserve coverage of distinct primaries before spending budget on bundles.
    for *_, actions in primary:
        yield actions
    # Dependencies are explicit paid replacement actions, never implicit freebies.
    groups = []
    for dependency in ("motherboard", "ram", "psu", "cooler"):
        if dependency == category:
            continue
        options = []
        for component in catalog.values():
            if component.category != dependency:
                continue
            offer = select_offer(
                component,
                request.price_condition,
                now,
                getattr(catalog, "retail_identities", {}).get(component.id),
            )
            if offer:
                options.append((Decimal(offer.amount), component.id, component))
        options.sort(key=lambda item: item[:2])
        if dependency == "psu":
            options = cheapest_per_wattage(options, catalog)
        groups.append(
            [None] + [replacement(p) for _, _, p in options[:DEPENDENCY_OPTIONS]]
        )
    # Fewest changed dependencies first, then deterministic catalog/price order.
    bundles = sorted(
        product(*groups),
        key=lambda group: (
            sum(a is not None for a in group),
            tuple(a.candidates[0].component_id if a else "" for a in group),
        ),
    )
    for group in bundles:
        extras = [action for action in group if action is not None]
        if not extras:
            continue
        for *_, actions in primary:
            yield actions + extras


def material_dependencies(before, after, evidence, request):
    thermal_categories = ("cpu", "motherboard", "cooler")
    old = {
        (line.line_id, line.category, line.component_id, line.declared_model)
        for line in before.lines
        if line.category in thermal_categories
    }
    current = {
        (line.line_id, line.category, line.component_id, line.declared_model)
        for line in after.lines
        if line.category in thermal_categories
    }
    if old == current:
        return []
    old_line_ids = {line.line_id for line in before.lines}
    old_coolers = {
        line.component_id for line in before.lines if line.category == "cooler"
    }
    old_cpus = {line.component_id for line in before.lines if line.category == "cpu"}
    cooler_lines = [line for line in after.lines if line.category == "cooler"]
    candidates = [(line, old_coolers, False) for line in cooler_lines]
    if not cooler_lines and not any(line.category == "cooler" for line in before.lines):
        # A documented stock package is relevant to a new acquisition OR a
        # conditional remount. Inclusion never proves which cooler is installed.
        candidates.extend(
            (line, old_cpus, True) for line in after.lines if line.category == "cpu"
        )
    dependencies = []
    for line, previous_parts, stock_package in candidates:
        item = evidence.components.get(line.component_id)
        if item is None:
            continue
        specs = item.specs
        acquired = (
            line.line_id not in old_line_ids
            and line.component_id not in previous_parts
            and line.component_id is not None
        )
        if stock_package and specs.fact("stock_cooler_included") is not True:
            continue
        required = specs.fact("thermal_compound_required_on_remount")
        if required is not True:
            continue
        # Package inclusion is not a claim about leftovers from installed parts.
        # Reselecting the same catalog part remains conservative reuse, even if
        # the simulation assigns a fresh line ID and costs a replacement unit.
        included = acquired and specs.fact("thermal_compound_included") is True
        available = any(m.confirmed is True for m in request.materials)
        state = (
            "included"
            if included
            else "available_confirmed"
            if available
            else "missing"
        )
        source_keys = (
            "thermal_compound_required_on_remount",
            "thermal_compound_included",
        )
        if stock_package:
            source_keys += ("stock_cooler_included",)
        dependencies.append(
            {
                "kind": "thermal_compound",
                "required": True,
                "state": state,
                "component_id": None,
                "offer_id": None,
                "amount_ars": None,
                "source_refs": [
                    r.model_dump(mode="json") for r in specs.evidence(*source_keys)
                ],
                "reason": (
                    "Conditional stock-cooler remount requirement from documented package/operation; actual cooler installation is unknown, and original package inclusion does not prove available compound"
                    if stock_package and not acquired
                    else "Documented operation requires compound; inclusion applies only to this newly acquired package"
                    if acquired
                    else "Documented remount requires compound; installed cooler package inclusion does not prove available leftovers"
                ),
            }
        )
    return dependencies


def preview_snapshot(tower, catalog, version, request, now):
    items = []
    candidates = (
        ((a.key, a.actions) for a in request.alternatives)
        if request.mode == "manual_comparison"
        else (
            (f"automatic-{i:04}", actions)
            for i, actions in enumerate(
                automatic_actions(tower, catalog, request, now), 1
            )
        )
    )
    truncated = False
    # A paid extra is offered only when the primary alone does not fit already.
    settled = set()
    for key, actions in candidates:
        if len(actions) > 1 and actions[0].model_dump_json() in settled:
            continue
        if len(items) >= MAX_EVALUATIONS:
            truncated = True
            break
        after = simulate(tower, actions, catalog)
        evidence = resolve_tower_evidence(after, catalog, version)
        result = evaluate_tower_essential(after, evidence)
        evaluation = TowerEvaluationResponse(
            **result.model_dump(), evaluated_configuration=after
        )
        gain = benefit(tower, after, catalog, request.objective, request.workload)
        cost, offers = incremental_cost(
            tower,
            after,
            catalog,
            request.price_condition,
            Decimal(request.budget_ars),
            now,
        )
        dependencies = material_dependencies(tower, after, evidence, request)
        primary_category = {
            "general": "ram",
            "gaming": "gpu",
            "productivity": "cpu",
        }[request.objective]
        for action in actions:
            if action.category == primary_category or action.action == "remove_line":
                continue
            for candidate in action.candidates:
                quote = next(
                    (
                        line
                        for line in cost["lines"]
                        if line["component_id"] == candidate.component_id
                    ),
                    None,
                )
                dependencies.append(
                    {
                        "kind": action.category.value,
                        "required": True,
                        "state": "priced" if quote else "missing",
                        "component_id": candidate.component_id,
                        "offer_id": quote["offer_id"] if quote else None,
                        "amount_ars": quote["amount_ars"] if quote else None,
                        "source_refs": [
                            offer["source_url"]
                            for offer in offers
                            if offer.get("component_id") == candidate.component_id
                            and "source_url" in offer
                        ],
                        "reason": "Explicit additional replacement action; its full cost is mandatory, not assumed included",
                    }
                )
        missing = list(result.missing_fields) + cost["missing_fields"]
        if gain["status"] == "unknown":
            missing.append("benefit:applicable_curated_reference_or_identity")
        if any(d["state"] == "missing" for d in dependencies):
            missing.extend(
                "dependency:" + d["kind"]
                for d in dependencies
                if d["state"] == "missing"
            )
            cost["total_ars"] = None
            if cost["within_budget"] is True:
                cost["within_budget"] = None
        if (
            request.mode != "manual_comparison"
            and len(actions) == 1
            and result.verdict == "compatible"
        ):
            settled.add(actions[0].model_dump_json())
        items.append(
            TowerPreviewItem(
                key=key,
                actions=canonical_actions(actions),
                evaluation=evaluation,
                benefit=gain,
                cost=cost,
                dependencies=dependencies,
                offers=offers,
                versions={
                    "catalog": version,
                    "rules": result.rules_version,
                    "references": REFERENCE_VERSION,
                    "identity": IDENTITY_VERSION,
                    "search": SEARCH_VERSION,
                },
                status=classify(evaluation, gain, cost, dependencies),
                missing_fields=sorted(set(missing)),
            )
        )
    budget = Decimal(request.budget_ars)

    def rank(item):
        gain = gain_percent(item.benefit)
        price = Decimal(item.cost["total_ars"] or "Infinity")
        value = value_score(gain, price if price.is_finite() else None, budget)
        minor = gain is None or gain < MIN_GAIN_PERCENT
        status = {"recommended": 0, "requires_verification": 1, "rejected": 2}
        if item.status == "rejected":
            # What fits but costs a bit more is the useful thing to show first.
            fits = item.evaluation.verdict != "incompatible"
            return (2, not fits, False, price, price, item.key)
        return (status[item.status], minor, False, -value, price, item.key)

    items.sort(key=rank)
    if request.mode == "automatic":
        # Without a current price nothing can be proposed: rule 5, no guessing.
        priced = [item for item in items if item.cost["total_ars"] is not None]
        items = priced or items
        rejected = [item for item in items if item.status == "rejected"]
        items = [item for item in items if item.status != "rejected"]
        items.extend(rejected[:MAX_REJECTED_SHOWN])
    missing = (
        [] if items else ["benefit:no_applicable_curated_reference_or_exact_identity"]
    )
    if truncated:
        missing.append("search:bounded_not_exhaustive")
    return TowerPreviewResponse(
        pc_id=tower.id,
        pc_revision=tower.revision,
        objective=request.objective,
        budget_ars=request.budget_ars,
        mode=request.mode,
        items=items,
        missing_fields=missing,
        limitations=LIMITATIONS,
    )


def advice_options(result, catalog):
    """Verified proposals only, one per performance level: real alternatives."""
    options, seen = [], set()
    for item in result.items:
        gain = gain_percent(item.benefit)
        level = item.benefit.get("after")
        if item.status != "recommended" or gain is None or level in seen:
            continue
        seen.add(level)
        component_id = item.actions[0]["candidates"][0]["component_id"]
        options.append(
            {
                "key": item.key,
                "name": catalog[component_id].name,
                "price": str(int(Decimal(item.cost["total_ars"]))),
                "gain": str(round(gain)),
            }
        )
    return options


class TowerRecommendationService:
    def __init__(self, repository, clock=None):
        self.repository = repository
        self.clock = clock or (lambda: datetime.now(UTC))

    def advice(self, owner, identity, request):
        """Same server preview, then the model outside any database lock."""
        if request.mode != "automatic":
            raise PCError(422, "Advice applies to automatic proposals")
        options = self.repository.preview(
            owner,
            identity,
            request.expected_pc_revision,
            lambda tower, catalog, version: advice_options(
                preview_snapshot(tower, catalog, version, request, self.clock()),
                catalog,
            ),
        )
        chosen = advise(options, request.objective, request.budget_ars)
        return chosen or {"key": None, "reason": None, "source": "rules"}

    def preview(self, owner, identity, request):
        if request.workload is not None and request.objective != "productivity":
            raise PCError(422, "Workload does not apply to objective")
        return self.repository.preview(
            owner,
            identity,
            request.expected_pc_revision,
            lambda tower, catalog, version: preview_snapshot(
                tower, catalog, version, request, self.clock()
            ),
        )
