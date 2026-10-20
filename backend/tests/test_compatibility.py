"""Expectativas sintéticas; los casos reales se prueban por separado."""

from copy import deepcopy

import pytest
from pydantic import ValidationError

from upgradejusto.compatibility.evaluation import (
    RULES_VERSION,
    _aggregate,
    evaluate,
)
from upgradejusto.compatibility.models import (
    AdapterRoute,
    AdapterSpec,
    Assignment,
    CableInventory,
    Connector,
    EffectiveLimit,
    EvidenceRef,
    GpuLengthInput,
    Measurement,
    PartInstance,
    ResolvedConfiguration,
    RuleResult,
    RuleSpec,
)


def evidence():
    return (
        EvidenceRef(
            source_id="TEST-SYNTHETIC",
            url="https://example.org/synthetic",
            locator="Fixture sintético, no fabricante",
            consulted_on="2026-10-20",
        ),
    )


def configuration(length=300, limit=315, branches=("b1", "b2")):
    return ResolvedConfiguration(
        pc_revision="synthetic-pc-1",
        data_revision="synthetic-data-1",
        parts=(
            PartInstance(instance_id="gpu", part_id="test-gpu", category="gpu"),
            PartInstance(instance_id="case", part_id="test-case", category="case"),
            PartInstance(instance_id="psu", part_id="test-psu", category="psu"),
        ),
        gpu_length=GpuLengthInput(
            gpu_instance_id="gpu",
            case_instance_id="case",
            mounting_id="horizontal-front-fans",
            gpu_length=Measurement(value=length, evidence=evidence()),
            effective_limit=EffectiveLimit(
                value=limit,
                evidence=evidence(),
                mounting_id="horizontal-front-fans",
                conditions=("Ventiladores delanteros, sin radiador",),
            ),
        ),
        adapter_route=AdapterRoute(
            gpu_instance_id="gpu",
            psu_instance_id="psu",
            mode="pcie8_adapter",
            adapter=AdapterSpec(
                input_ids=("input-1", "input-2"),
                independent_cables=True,
                evidence=evidence(),
            ),
            inventory=CableInventory(
                complete=True,
                evidence=evidence(),
                connectors=tuple(
                    Connector(
                        connector_id=f"c{i}",
                        branch_id=branch,
                        kind="pcie6+2",
                        availability="free",
                    )
                    for i, branch in enumerate(branches, 1)
                ),
            ),
            assignments=(
                Assignment(input_id="input-1", connector_id="c1"),
                Assignment(input_id="input-2", connector_id="c2"),
            ),
            conditions=("Ruta adaptada explícita para esta GPU",),
            alternatives_excluded=True,
            alternatives_evidence=evidence(),
        ),
    )


def changed(config, **updates):
    """Volver a validar, no usar model_copy para eludir el contrato."""
    return ResolvedConfiguration.model_validate(config.model_dump() | updates)


def result(config, rule_id):
    return next(r for r in evaluate(config).rule_results if r.rule_id == rule_id)


@pytest.mark.parametrize(
    "length,state,excess", [(300, "pass", -15), (315, "pass", 0), (329, "fail", 14)]
)
def test_length_boundary(length, state, excess):
    outcome = result(configuration(length=length), "R04.largo")
    assert outcome.state == state
    assert dict((f.name, f.value) for f in outcome.facts)["excess_mm"] == excess
    assert outcome.evidence == evidence()


@pytest.mark.parametrize(
    "value", [True, False, "329", -1, 0, float("nan"), float("inf"), -float("inf")]
)
def test_measurements_reject_invalid_values(value):
    with pytest.raises(ValidationError):
        Measurement(value=value, evidence=evidence())


@pytest.mark.parametrize("field,value", [("unit", "cm"), ("axis", "height")])
def test_units_and_axis_are_validated(field, value):
    with pytest.raises(ValidationError):
        Measurement(value=329, **{field: value})


@pytest.mark.parametrize(
    "field,value", [("value", None), ("evidence", ()), ("status", "conflict")]
)
def test_length_unknowns_have_concrete_paths(field, value):
    config = configuration()
    geometry = config.gpu_length.model_dump()
    geometry["gpu_length"][field] = value
    outcome = result(changed(config, gpu_length=geometry), "R04.largo")
    assert outcome.state == "unknown"
    assert any(p.startswith("gpu_length.gpu_length.") for p in outcome.missing_fields)


@pytest.mark.parametrize(
    "field,value", [("conditions", ()), ("mounting_id", None), ("mounting_id", "other")]
)
def test_effective_limit_requires_applicable_mounting(field, value):
    config = configuration()
    geometry = config.gpu_length.model_dump()
    geometry["effective_limit"][field] = value
    outcome = result(changed(config, gpu_length=geometry), "R04.largo")
    assert outcome.state == "unknown"
    assert outcome.missing_fields


def test_same_branch_fails_but_distinct_branches_pass_only_subrule():
    assert (
        result(configuration(branches=("b1", "b1")), "R06.ramales_adaptador").state
        == "fail"
    )
    config = configuration()
    assert result(config, "R06.ramales_adaptador").state == "pass"
    assert evaluate(config).verdict == "requiere_verificacion"


@pytest.mark.parametrize(
    "field,value",
    [
        ("connectors", None),
        ("complete", None),
        ("complete", False),
        ("evidence", ()),
        ("status", "conflict"),
    ],
)
def test_inventory_unknown_or_partial_cannot_pass(field, value):
    config = configuration()
    route = config.adapter_route.model_dump()
    route["inventory"][field] = value
    assert (
        result(changed(config, adapter_route=route), "R06.ramales_adaptador").state
        == "unknown"
    )


def test_empty_complete_inventory_proves_failure_not_unknown_topology():
    config = configuration()
    route = config.adapter_route.model_dump()
    route["inventory"]["connectors"] = ()
    route["assignments"] = None
    assert (
        result(changed(config, adapter_route=route), "R06.ramales_adaptador").state
        == "fail"
    )


@pytest.mark.parametrize(
    "availability,state", [("occupied", "fail"), ("unknown", "unknown")]
)
def test_occupied_or_unknown_connector_does_not_pass(availability, state):
    config = configuration()
    route = config.adapter_route.model_dump()
    route["inventory"]["connectors"][0]["availability"] = availability
    if availability == "occupied":
        route["inventory"]["connectors"][0]["occupied_by"] = "another-load"
    assert (
        result(changed(config, adapter_route=route), "R06.ramales_adaptador").state
        == state
    )


def test_missing_branch_or_assignments_is_not_a_pass():
    config = configuration()
    route = config.adapter_route.model_dump()
    route["inventory"]["connectors"][0]["branch_id"] = None
    assert (
        result(changed(config, adapter_route=route), "R06.ramales_adaptador").state
        == "unknown"
    )
    route = config.adapter_route.model_dump()
    route["assignments"] = None
    assert (
        result(changed(config, adapter_route=route), "R06.ramales_adaptador").state
        == "unknown"
    )


def test_insufficient_branch_failure_requires_excluding_other_routes():
    config = configuration(branches=("b1", "b1"))
    route = config.adapter_route.model_dump()
    route["alternatives_excluded"] = None
    assert (
        result(changed(config, adapter_route=route), "R06.ramales_adaptador").state
        == "unknown"
    )


@pytest.mark.parametrize("mode", ["native", "other"])
def test_unsupported_route_stays_pending(mode):
    config = configuration()
    route = config.adapter_route.model_dump() | {"mode": mode}
    assert (
        result(changed(config, adapter_route=route), "R06.ramales_adaptador").state
        == "not_implemented"
    )


@pytest.mark.parametrize(
    "field,value",
    [
        ("input_ids", ("a", "b", "c")),
        ("input_kind", "other"),
        ("independent_cables", False),
    ],
)
def test_unsupported_adapter_requirement_is_not_auto_approved(field, value):
    config = configuration()
    route = config.adapter_route.model_dump()
    route["adapter"][field] = value
    route["assignments"] = None
    assert (
        result(changed(config, adapter_route=route), "R06.ramales_adaptador").state
        == "not_implemented"
    )


def test_no_short_circuit_and_all_pending_families_visible():
    config = configuration(length=329)
    route = config.adapter_route.model_dump() | {"inventory": None}
    output = evaluate(changed(config, adapter_route=route))
    states = {r.rule_id: r.state for r in output.rule_results}
    assert output.verdict == "incompatible"
    assert states["R04.largo"] == "fail"
    assert states["R06.ramales_adaptador"] == "unknown"
    assert states["R05"] == "not_implemented"
    assert {r.family for r in output.rule_results} == {f"R{i:02}" for i in range(1, 11)}
    assert "adapter_route.inventory" in output.missing_fields
    assert "implementation.R05" in output.missing_fields
    assert not output.coverage.complete


def test_both_rules_can_fail_in_the_same_evaluation():
    output = evaluate(configuration(length=329, branches=("b1", "b1")))
    assert set(output.coverage.failed) == {"R04.largo", "R06.ramales_adaptador"}


def test_evidence_revision_determinism_and_immutability():
    config = configuration()
    before = deepcopy(config.model_dump())
    first = evaluate(config)
    assert first == evaluate(config)
    assert config.model_dump() == before
    assert (first.pc_revision, first.data_revision, first.rules_version) == (
        config.pc_revision,
        config.data_revision,
        RULES_VERSION,
    )
    assert first.rule_results[0].conditions or first.rule_results[0].missing_fields
    renamed = config.model_dump()
    renamed["parts"] = tuple(
        p | {"part_id": "unrelated-brand", "model": "renamed"} for p in renamed["parts"]
    )
    assert [r.state for r in evaluate(changed(config, **renamed)).rule_results] == [
        r.state for r in first.rule_results
    ]
    with pytest.raises(ValidationError):
        config.pc_revision = "changed"


@pytest.mark.parametrize("quantity", [True, "2", 0, -1, 1.5])
def test_quantity_validation(quantity):
    with pytest.raises(ValidationError):
        PartInstance(instance_id="x", part_id="x", category="gpu", quantity=quantity)


def test_duplicates_reuse_and_bad_references_are_input_errors():
    config = configuration()
    with pytest.raises(ValidationError):
        changed(config, parts=(config.parts[0], config.parts[0]))
    for target in ("connector", "input", "assignment", "branch-reference"):
        route = config.adapter_route.model_dump()
        if target == "connector":
            route["inventory"]["connectors"][1]["connector_id"] = "c1"
        elif target == "input":
            route["adapter"]["input_ids"] = ("input-1", "input-1")
        elif target == "assignment":
            route["assignments"][1]["connector_id"] = "c1"
        else:
            route["assignments"][1]["connector_id"] = "nonexistent"
        with pytest.raises(ValidationError):
            changed(config, adapter_route=route)


def test_extra_preapproved_results_or_inventory_are_rejected():
    config = configuration()
    with pytest.raises(ValidationError):
        changed(config, rule_results=(), inventory=())
    with pytest.raises(TypeError):
        evaluate(config, required_rules=())


def synthetic_inventory():
    return tuple(
        RuleSpec(rule_id=rule_id, family=f"R{i:02}")
        for i in range(1, 11)
        for rule_id in ((f"R{i:02}.a", f"R{i:02}.b") if i in (4, 6) else (f"R{i:02}",))
    )


def synthetic_passes(inventory):
    return tuple(
        RuleResult(
            rule_id=s.rule_id, family=s.family, state="pass", evidence=evidence()
        )
        for s in inventory
    )


def test_compatible_branch_only_with_complete_synthetic_internal_inventory():
    inventory = synthetic_inventory()
    output = _aggregate(configuration(), inventory, synthetic_passes(inventory))
    assert output.verdict == "compatible"
    assert output.coverage.complete
    # El evaluador público nunca recibe este inventario ni resultados del consumidor.
    assert evaluate(configuration()).verdict == "requiere_verificacion"


def test_empty_incomplete_inventory_or_results_never_become_compatible():
    inventory = synthetic_inventory()
    for required, results in (
        ((), ()),
        (inventory[:1], synthetic_passes(inventory[:1])),
        (inventory, ()),
        (inventory, synthetic_passes(inventory[:-1])),
    ):
        output = _aggregate(configuration(), required, results)
        assert output.verdict == "requiere_verificacion"
        assert not output.coverage.complete
        assert output.missing_fields


def test_result_cannot_claim_pass_or_fail_without_evidence():
    for state in ("pass", "fail"):
        with pytest.raises(ValidationError):
            RuleResult(rule_id="R04.largo", family="R04", state=state)


def test_aggregate_rejects_duplicate_results():
    inventory = synthetic_inventory()
    results = synthetic_passes(inventory)
    with pytest.raises(ValueError):
        _aggregate(configuration(), inventory, results + results[:1])


@pytest.mark.parametrize(
    "revision,value", [("pc_revision", ""), ("data_revision", " "), ("pc_revision", 1)]
)
def test_revisions_are_required_nonblank_strings(revision, value):
    with pytest.raises(ValidationError):
        changed(configuration(), **{revision: value})


def test_evaluator_revalidates_models_and_does_not_trust_model_copy():
    config = configuration()
    invalid = config.model_copy(update={"pc_revision": ""})
    with pytest.raises(ValidationError):
        evaluate(invalid)


def test_missing_evidence_and_conflicts_block_adapter_conclusions():
    config = configuration(branches=("b1", "b1"))
    for target, field, value in (
        ("adapter", "evidence", ()),
        ("adapter", "status", "conflict"),
        ("adapter", "independent_cables", None),
        (None, "conditions", ()),
        (None, "status", "conflict"),
        (None, "alternatives_evidence", ()),
    ):
        route = config.adapter_route.model_dump()
        if target is None:
            route[field] = value
        else:
            route[target][field] = value
        assert (
            result(changed(config, adapter_route=route), "R06.ramales_adaptador").state
            == "unknown"
        )


def test_incomplete_mapping_is_not_completed_automatically():
    config = configuration()
    route = config.adapter_route.model_dump()
    route["assignments"] = route["assignments"][:1]
    outcome = result(changed(config, adapter_route=route), "R06.ramales_adaptador")
    assert outcome.state == "unknown"
    assert "adapter_route.assignments.input-2" in outcome.missing_fields


def test_aggregate_preserves_unknowns_when_another_rule_fails():
    inventory = synthetic_inventory()
    results = list(synthetic_passes(inventory))
    results[0] = RuleResult(
        rule_id="R01", family="R01", state="fail", evidence=evidence()
    )
    results[1] = RuleResult(
        rule_id="R02", family="R02", state="unknown", missing_fields=("ram.type",)
    )
    results[2] = RuleResult(
        rule_id="R03",
        family="R03",
        state="not_implemented",
        missing_fields=("implementation.R03",),
    )
    output = _aggregate(configuration(), inventory, tuple(results))
    assert output.verdict == "incompatible"
    assert output.missing_fields == ("ram.type", "implementation.R03")


def test_not_applicable_needs_evidence_and_reason():
    with pytest.raises(ValidationError):
        RuleResult(rule_id="R01", family="R01", state="not_applicable")
    with pytest.raises(ValidationError):
        RuleResult(
            rule_id="R01", family="R01", state="not_applicable", evidence=evidence()
        )


def test_complete_coverage_is_not_the_same_as_compatible():
    inventory = synthetic_inventory()
    results = list(synthetic_passes(inventory))
    results[0] = RuleResult(
        rule_id="R01", family="R01", state="fail", evidence=evidence()
    )
    output = _aggregate(configuration(), inventory, tuple(results))
    assert output.verdict == "incompatible"
    assert output.coverage.complete


@pytest.mark.parametrize("value", ["true", 1, 0])
def test_booleans_are_not_coerced(value):
    config = configuration()
    route = config.adapter_route.model_dump()
    route["inventory"]["complete"] = value
    with pytest.raises(ValidationError):
        changed(config, adapter_route=route)


def test_renaming_instance_ids_with_consistent_references_keeps_technical_states():
    config = configuration()
    data = config.model_dump()
    mapping = {
        "gpu": "unrelated-gpu-id",
        "psu": "unrelated-psu-id",
        "case": "unrelated-case-id",
    }
    for part in data["parts"]:
        part["instance_id"] = mapping[part["instance_id"]]
    data["gpu_length"]["gpu_instance_id"] = mapping["gpu"]
    data["gpu_length"]["case_instance_id"] = mapping["case"]
    data["adapter_route"]["gpu_instance_id"] = mapping["gpu"]
    data["adapter_route"]["psu_instance_id"] = mapping["psu"]
    assert evaluate(changed(config, **data)) == evaluate(config)


def test_duplicate_input_assignment_and_wrong_instance_are_input_errors():
    config = configuration()
    route = config.adapter_route.model_dump()
    route["assignments"][1]["input_id"] = "input-1"
    with pytest.raises(ValidationError):
        changed(config, adapter_route=route)
    geometry = config.gpu_length.model_dump() | {"case_instance_id": "psu"}
    with pytest.raises(ValidationError):
        changed(config, gpu_length=geometry)
