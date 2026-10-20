"""Inventario fijo del evaluador. El consumidor solo entrega datos resueltos."""

from .models import (
    Coverage,
    EvaluationResult,
    ResolvedConfiguration,
    RuleResult,
    RuleSpec,
    unique,
)
from .rules import adapter_branches, gpu_length

RULES_VERSION = "cu05-28.1"
_REQUIRED = tuple(
    RuleSpec(rule_id=rule_id, family=f"R{i:02}")
    for i in range(1, 11)
    for rule_id in (
        ("R04.largo", "R04.altura_espesor_slots_cable_interferencias")
        if i == 4
        else ("R06.ramales_adaptador", "R06.otros_conectores")
        if i == 6
        else (f"R{i:02}",)
    )
)


def _pending(spec: RuleSpec) -> RuleResult:
    return RuleResult(
        rule_id=spec.rule_id,
        family=spec.family,
        state="not_implemented",
        conditions=(
            "Comprobación necesaria aún sin implementar; no se presume aprobada",
        ),
        missing_fields=(f"implementation.{spec.rule_id}",),
    )


def _aggregate(
    config: ResolvedConfiguration,
    required: tuple[RuleSpec, ...],
    results: tuple[RuleResult, ...],
) -> EvaluationResult:
    """Auxiliar interno; los tests usan inventario sintético, nunca evaluate()."""
    unique(tuple(s.rule_id for s in required), "required")
    unique(tuple(r.rule_id for r in results), "rule_results")
    by_id = {r.rule_id: r for r in results}
    specs = {s.rule_id: s for s in required}
    if set(by_id) - set(specs):
        raise ValueError("Resultado no pertenece al inventario interno")
    if any(r.family != specs[r.rule_id].family for r in results):
        raise ValueError("Familia de resultado no corresponde al inventario")
    ordered = tuple(by_id.get(s.rule_id) or _pending(s) for s in required)
    families = {s.family for s in required}
    inventory_complete = families == {f"R{i:02}" for i in range(1, 11)} and all(
        sum(s.family == family for s in required) >= 2 for family in ("R04", "R06")
    )
    missing = tuple(dict.fromkeys(p for r in ordered for p in r.missing_fields))
    if not inventory_complete:
        missing += ("coverage.required_inventory",)
    complete = (
        inventory_complete
        and not missing
        and all(r.state in ("pass", "fail", "not_applicable") for r in ordered)
    )
    verdict = (
        "incompatible"
        if any(r.state == "fail" for r in ordered)
        else "compatible"
        if complete
        else "requiere_verificacion"
    )

    def ids(*states):
        return tuple(r.rule_id for r in ordered if r.state in states)

    return EvaluationResult(
        verdict=verdict,
        rule_results=ordered,
        missing_fields=missing,
        rules_version=RULES_VERSION,
        data_revision=config.data_revision,
        pc_revision=config.pc_revision,
        coverage=Coverage(
            required=tuple(s.rule_id for s in required),
            implemented=ids("pass", "fail", "unknown", "not_applicable"),
            evaluated=ids("pass", "fail", "unknown", "not_applicable"),
            passed=ids("pass"),
            failed=ids("fail"),
            unknown=ids("unknown"),
            not_applicable=ids("not_applicable"),
            not_implemented=ids("not_implemented"),
            complete=complete,
        ),
    )


def evaluate(config: ResolvedConfiguration) -> EvaluationResult:
    config = ResolvedConfiguration.model_validate(config)
    # Ambas se evalúan siempre, aunque la primera ya haya fallado.
    implemented = (gpu_length(config), adapter_branches(config))
    by_id = {r.rule_id: r for r in implemented}
    results = tuple(
        by_id[s.rule_id] if s.rule_id in by_id else _pending(s) for s in _REQUIRED
    )
    return _aggregate(config, _REQUIRED, results)
