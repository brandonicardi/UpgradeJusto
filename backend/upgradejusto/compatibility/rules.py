"""Dos subreglas puras: no resuelven catálogos, rutas alternativas ni potencia."""

from .models import EvidenceRef, Fact, ResolvedConfiguration, RuleResult


def _result(rule_id, state, facts, evidence, conditions, missing=()):
    return RuleResult(
        rule_id=rule_id,
        family=rule_id.split(".", 1)[0],
        state=state,
        facts=tuple(facts),
        evidence=tuple(dict.fromkeys(evidence)),
        conditions=tuple(dict.fromkeys(conditions)),
        missing_fields=tuple(dict.fromkeys(missing)),
    )


def gpu_length(config: ResolvedConfiguration) -> RuleResult:
    rule_id = "R04.largo"
    data = config.gpu_length
    facts: list[Fact] = []
    refs: list[EvidenceRef] = []
    conditions = list(config.conditions)
    missing = []
    if data is None:
        return _result(rule_id, "unknown", facts, refs, conditions, ("gpu_length",))
    if data.mounting_id is None:
        missing.append("gpu_length.mounting_id")
    else:
        conditions.append(f"Montaje evaluado: {data.mounting_id}")
    for field in ("gpu_length", "effective_limit"):
        observation = getattr(data, field)
        path = f"gpu_length.{field}"
        if observation is None:
            missing.append(path)
            continue
        refs.extend(observation.evidence)
        facts.append(Fact(name=field, value=observation.value, unit=observation.unit))
        if observation.value is None:
            missing.append(f"{path}.value")
        if not observation.evidence:
            missing.append(f"{path}.evidence")
        if observation.status != "documented":
            missing.append(f"{path}.status")
    limit = data.effective_limit
    if limit is not None:
        conditions.extend(limit.conditions)
        if not limit.conditions:
            missing.append("gpu_length.effective_limit.conditions")
        if limit.mounting_id is None:
            missing.append("gpu_length.effective_limit.mounting_id")
        elif limit.mounting_id != data.mounting_id:
            missing.append("gpu_length.effective_limit.applicability")
    if missing:
        return _result(rule_id, "unknown", facts, refs, conditions, missing)
    excess = data.gpu_length.value - limit.value
    facts.append(Fact(name="excess_mm", value=excess, unit="mm"))
    return _result(rule_id, "fail" if excess > 0 else "pass", facts, refs, conditions)


def adapter_branches(config: ResolvedConfiguration) -> RuleResult:
    rule_id = "R06.ramales_adaptador"
    route = config.adapter_route
    facts: list[Fact] = []
    refs: list[EvidenceRef] = []
    conditions = list(config.conditions)
    missing = []
    if route is None:
        return _result(rule_id, "unknown", facts, refs, conditions, ("adapter_route",))
    conditions.extend(route.conditions)
    facts.append(Fact(name="route_mode", value=route.mode))
    adapter, inventory = route.adapter, route.inventory
    if adapter is not None:
        refs.extend(adapter.evidence)
        facts.extend(
            (
                Fact(name="required_inputs", value=len(adapter.input_ids)),
                Fact(name="independent_cables", value=adapter.independent_cables),
            )
        )
    if inventory is not None:
        refs.extend(inventory.evidence)
    refs.extend(route.alternatives_evidence)
    if route.mode != "pcie8_adapter":
        return _result(
            rule_id,
            "not_implemented",
            facts,
            refs,
            conditions,
            (f"implementation.{rule_id}.{route.mode}",),
        )
    if adapter is not None and (
        adapter.input_kind != "pcie8"
        or len(adapter.input_ids) != 2
        or adapter.independent_cables is False
    ):
        return _result(
            rule_id,
            "not_implemented",
            facts,
            refs,
            conditions,
            (f"implementation.{rule_id}.adapter_requirement",),
        )
    if route.status != "documented":
        missing.append("adapter_route.status")
    if not route.conditions:
        missing.append("adapter_route.conditions")
    if adapter is None:
        missing.append("adapter_route.adapter")
    else:
        if adapter.independent_cables is None:
            missing.append("adapter_route.adapter.independent_cables")
        if not adapter.evidence:
            missing.append("adapter_route.adapter.evidence")
        if adapter.status != "documented":
            missing.append("adapter_route.adapter.status")
    if inventory is None:
        missing.append("adapter_route.inventory")
    else:
        if inventory.complete is not True:
            missing.append("adapter_route.inventory.complete")
        if inventory.status != "documented":
            missing.append("adapter_route.inventory.status")
        if not inventory.evidence:
            missing.append("adapter_route.inventory.evidence")
        if inventory.connectors is None:
            missing.append("adapter_route.inventory.connectors")
        else:
            for connector in inventory.connectors:
                path = f"adapter_route.inventory.connectors.{connector.connector_id}"
                facts.append(
                    Fact(
                        name=f"{connector.connector_id}.branch_id",
                        value=connector.branch_id,
                    )
                )
                facts.append(
                    Fact(
                        name=f"{connector.connector_id}.availability",
                        value=connector.availability,
                    )
                )
                if connector.kind in ("pcie8", "pcie6+2"):
                    if connector.branch_id is None:
                        missing.append(f"{path}.branch_id")
                    if connector.availability == "unknown":
                        missing.append(f"{path}.availability")
    if missing:
        return _result(rule_id, "unknown", facts, refs, conditions, missing)
    free = {
        c.connector_id: c
        for c in inventory.connectors
        if c.kind in ("pcie8", "pcie6+2") and c.availability == "free"
    }
    branches = {c.branch_id for c in free.values()}
    facts.extend(
        (
            Fact(name="free_connectors", value=len(free)),
            Fact(name="available_independent_branches", value=len(branches)),
        )
    )
    if len(branches) < len(adapter.input_ids):
        # Una ruta imposible no prueba que NO exista otra; exige exclusión explícita.
        if route.alternatives_excluded is not True:
            missing.append("adapter_route.alternatives_excluded")
        if not route.alternatives_evidence:
            missing.append("adapter_route.alternatives_evidence")
        return _result(
            rule_id, "unknown" if missing else "fail", facts, refs, conditions, missing
        )
    assigned = {a.input_id: a.connector_id for a in route.assignments or ()}
    for input_id in adapter.input_ids:
        if input_id not in assigned:
            missing.append(f"adapter_route.assignments.{input_id}")
        elif assigned[input_id] not in free:
            missing.append(f"adapter_route.assignments.{input_id}.available_connector")
    if not missing:
        used_branches = {free[c].branch_id for c in assigned.values()}
        if len(used_branches) != len(adapter.input_ids):
            # Hay capacidad libre, pero no se resuelve automáticamente otro cableado.
            missing.append("adapter_route.assignments.independent_branches")
    return _result(
        rule_id, "unknown" if missing else "pass", facts, refs, conditions, missing
    )
