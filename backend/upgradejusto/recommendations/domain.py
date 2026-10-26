"""Cálculo determinístico sin HTTP, BD, red ni LLM."""

from decimal import Decimal

from upgradejusto.compatibility.basic_manufacturer import resolve_stock_specs
from upgradejusto.compatibility.platform_curation import references

from .models import Benefit, Cost, CostLine

LIMITATIONS = [
    "Compatibilidad limitada al scope/version del resultado; cobertura pendiente no equivale a compatible.",
    "Precios históricos documentados, no cotización ni disponibilidad actual.",
    "Presupuesto ARS de componentes; excluye envío, financiación y mano de obra.",
    "Sin evidencia comparativa curada no se presume beneficio ni rendimiento.",
    "Solo alternativas y dependencias explícitas; no búsqueda universal.",
]


def acquisition_cost(replacements, catalog, budget):
    lines, missing = [], []
    subtotal = Decimal(0)
    for replacement in replacements:
        # HARDWARE_DEMO condiciones C y costes: desmontar CPU/placa requiere pasta
        # renovada, sin referencia/precio de catálogo. No comprarla implícitamente.
        if replacement.category in ("cpu", "motherboard"):
            missing.append(
                f"dependencies.{replacement.category}.thermal_compound.price_ARS"
            )
        for candidate in replacement.candidates:
            component = catalog.get(candidate.component_id)
            prices = (
                [p for p in component.prices if p.currency == "ARS"]
                if component
                else []
            )
            if not prices:
                missing.append(f"prices.{candidate.component_id}.ARS")
                continue
            price = min(
                prices,
                key=lambda p: (-p.date.toordinal(), Decimal(p.amount), p.source),
            )
            subtotal += Decimal(price.amount) * candidate.quantity
            lines.append(
                CostLine(
                    component_id=candidate.component_id,
                    quantity=candidate.quantity,
                    unit_amount=price.amount,
                    date=price.date.isoformat(),
                    source=price.source,
                )
            )
    amount = format(subtotal, "f")
    return Cost(
        total_ars=None if missing else amount,
        known_subtotal_ars=amount,
        within_budget=None if missing else subtotal <= budget,
        lines=lines,
        missing_fields=missing,
    )


def comparative_benefit(before, after, catalog=None, objective=None):
    def identity(configuration):
        return sorted(
            (g.category.value, g.component_id, g.quantity)
            for g in configuration.components
        )

    # Capacity is not a performance index. All other categories must be unchanged.
    def other_parts(configuration):
        return sorted(
            (g.category.value, g.component_id, g.quantity)
            for g in configuration.components
            if g.category != "ram"
        )

    def capacity(configuration):
        total, refs = 0, []
        groups = [g for g in configuration.components if g.category == "ram"]
        if not groups:
            return None, ()
        for group in groups:
            component = catalog.get(group.component_id)
            if component is None:
                return None, ()
            normalized = resolve_stock_specs(component, catalog)
            amount = normalized.fact("capacity_gb")
            evidence = normalized.evidence("capacity_gb")
            if amount is None:
                # Reproduction of existing curated evidence only; no free-text
                # numeric parsing and no inference from price/name/part ID.
                evidence = references(component, catalog)
                amount = (
                    {"8 GB": 8, "16 GB": 16}.get(
                        component.attributes.get("capacity_per_module")
                    )
                    if evidence
                    else None
                )
            if type(amount) is not int or amount <= 0 or not evidence:
                return None, ()
            total += amount * group.quantity
            refs.extend(evidence)
        return total, tuple(dict.fromkeys(refs))

    if (
        objective == "general"
        and catalog is not None
        and other_parts(before) == other_parts(after)
    ):
        old_total, old_refs = capacity(before)
        new_total, new_refs = capacity(after)
        if old_total is not None and new_total is not None and new_total > old_total:
            return Benefit(
                status="supported",
                evidence=[
                    {
                        **ref.model_dump(),
                        "scope": f"general: capacidad RAM {old_total}→{new_total} GB; no FPS ni rendimiento; compatibilidad separada",
                    }
                    for ref in dict.fromkeys((*old_refs, *new_refs))
                ],
            )

    def non_graphics(configuration):
        return sorted(
            (group.category.value, group.component_id, group.quantity)
            for group in configuration.components
            if group.category not in ("gpu", "psu")
        )

    def vram(configuration):
        groups = [
            group for group in configuration.components if group.category == "gpu"
        ]
        if len(groups) != 1 or groups[0].quantity != 1:
            return None, ()
        component = catalog.get(groups[0].component_id)
        if component is None:
            return None, ()
        spec = resolve_stock_specs(component, catalog)
        value = spec.fact("vram_gb")
        return (
            (value, spec.evidence("vram_gb"))
            if type(value) is int and value > 0
            else (None, ())
        )

    if (
        objective == "general"
        and catalog is not None
        and non_graphics(before) == non_graphics(after)
    ):
        old_vram, old_refs = vram(before)
        new_vram, new_refs = vram(after)
        if old_vram is not None and new_vram is not None and new_vram > old_vram:
            return Benefit(
                status="supported",
                evidence=[
                    {
                        **ref.model_dump(),
                        "scope": f"general: capacidad VRAM {old_vram}→{new_vram} GB; no FPS ni rendimiento; compatibilidad y PSU separadas",
                    }
                    for ref in dict.fromkeys((*old_refs, *new_refs))
                ],
            )
    # No índice curado de rendimiento implementado; nunca inferir por modelo/precio.
    return Benefit(
        status="not_an_improvement"
        if identity(before) == identity(after)
        else "unknown",
        evidence=[],
    )


def item_status(evaluation, cost, benefit, budget):
    if (
        evaluation.verdict == "incompatible"
        or Decimal(cost.known_subtotal_ars) > budget
        or benefit.status == "not_an_improvement"
    ):
        return "rejected"
    if (
        evaluation.verdict == "compatible"
        and evaluation.coverage.complete
        and cost.within_budget is True
        and not cost.missing_fields
        and benefit.status == "supported"
    ):
        return "recommended"
    return "requires_verification"


def ordered_items(items):
    order = {"recommended": 0, "requires_verification": 1, "rejected": 2}
    return sorted(
        items,
        key=lambda item: (
            order[item.status],
            item.cost.total_ars is None,
            Decimal(item.cost.total_ars or "0"),
            item.key,
        ),
    )
