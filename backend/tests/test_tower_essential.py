"""Essential policy proofs on synthetic facts: not hardware certification."""

from copy import deepcopy
from uuid import UUID

import pytest
from test_torre_motor import REF, fixture

from upgradejusto.compatibility.basic_specs import BasicSpecs
from upgradejusto.compatibility.tower_contract import (
    ESSENTIAL_REQUIRED,
    TowerComponentEvidence,
    TowerTechnicalEvidenceDTO,
)
from upgradejusto.compatibility.tower_essential import (
    PHYSICAL_SPACE_CHECK_ID,
    PHYSICAL_SPACE_NOT_EVALUATED,
    evaluate_tower_essential,
)


def evaluate(tower, fields, support):
    return evaluate_tower_essential(
        tower,
        TowerTechnicalEvidenceDTO(
            data_revision="synthetic-publication-1",
            components={
                key: TowerComponentEvidence(
                    key,
                    key,
                    "synthetic-publication-1",
                    BasicSpecs(value, {name: (REF,) for name in value}, frozenset()),
                )
                for key, value in fields.items()
            },
            cpu_support=support,
        ),
    )


def state(result, rule):
    return next(r.state for r in result.rule_results if r.rule_id == rule)


def test_full_positive_with_fixed_essential_coverage_and_versions():
    tower, fields, support = fixture()
    original = deepcopy(tower.model_dump())
    result = evaluate(tower, fields, support)
    assert result.verdict == "compatible"
    assert result.coverage.required == ESSENTIAL_REQUIRED
    assert result.coverage.evaluated == ESSENTIAL_REQUIRED
    assert [r.rule_id for r in result.rule_results] == list(ESSENTIAL_REQUIRED)
    assert result.scope.id == "cu05-tower-essential-2"
    assert result.scope.policy_version == "tower-essential-policy-2"
    assert result.scope.inventory_version == "tower-essential-inventory-1"
    assert result.rules_version == "cu05-tower-essential-engine-2"
    assert tower.model_dump() == original
    assert result == evaluate(tower, fields, support)


def test_compatible_declares_that_cooling_was_not_evaluated():
    result = evaluate(*fixture())
    assert result.verdict == "compatible"
    assert any("refrigeración" in warning for warning in result.warnings)
    assert all(check.status == "outside_scope" for check in result.additional_checks)


def test_cooling_and_fans_neither_block_nor_are_reported():
    tower, fields, support = fixture()
    fields["cooler"] = {}
    fields["fan"] = {}
    fields["cpu"]["jedec_mts"] = None
    del fields["motherboard"]["ecc"], fields["ram"]["ecc"]
    del fields["motherboard"]["fan_total_current_ma"]
    result = evaluate(tower, fields, support)
    assert result.verdict == "compatible"
    assert not {"T09", "T10", "T12"} & {r.rule_id for r in result.rule_results}


def test_unknown_cooler_presence_does_not_block_identification():
    tower, fields, support = fixture()
    tower.category_status["cooler"] = "unknown"
    tower.category_status["fan"] = "absent"
    assert evaluate(tower, fields, support).verdict == "compatible"


@pytest.mark.parametrize(
    ("category", "key", "rule"),
    [
        ("cpu", "memory_type", "T02"),
        ("motherboard", "memory_type", "T02"),
        ("motherboard", "slots", "T02"),
        ("motherboard", "max_total_gb", "T02"),
        ("ram", "memory_type", "T02"),
        ("ram", "capacity_gb", "T02"),
        ("motherboard", "pcie_slot", "T03"),
        ("psu", "continuous_power_w", "T05"),
        ("gpu", "gpu_power_kind", "T06"),
        ("gpu", "gpu_power_count", "T06"),
        ("psu", "pcie8_count", "T06"),
        ("motherboard", "tower_ports", "T08"),
        ("storage", "storage_interface", "T08"),
        ("storage", "storage_form", "T08"),
    ],
)
def test_missing_essential_fact_is_never_approved(category, key, rule):
    tower, fields, support = fixture()
    del fields[category][key]
    result = evaluate(tower, fields, support)
    assert result.verdict == "requiere_verificacion"
    assert state(result, rule) == "unknown"
    assert result.missing_fields


def test_psu_without_any_documented_recommendation_is_unknown_not_zero():
    tower, fields, support = fixture()
    del fields["gpu"]["recommended_psu_w"], fields["gpu"]["nvidia_recommended_psu_w"]
    fields["psu"]["continuous_power_w"] = 1
    result = evaluate(tower, fields, support)
    assert result.verdict == "requiere_verificacion"
    assert state(result, "T05") == "unknown"


def test_psu_uses_the_highest_documented_recommendation_on_any_platform():
    tower, fields, support = fixture()
    fields["cpu"].update(cpu_platform="AM5", cpu_stock_family="Ryzen9000")
    del fields["gpu"]["psu_reference_platform"]
    fields["gpu"].update(recommended_psu_w=550, nvidia_recommended_psu_w=600)
    fields["psu"]["continuous_power_w"] = 600
    assert evaluate(tower, fields, support).verdict == "compatible"
    fields["psu"]["continuous_power_w"] = 599
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert state(result, "T05") == "fail"


def test_one_documented_recommendation_is_enough():
    tower, fields, support = fixture()
    del fields["gpu"]["nvidia_recommended_psu_w"]
    assert evaluate(tower, fields, support).verdict == "compatible"


@pytest.mark.parametrize(
    ("change", "rule"),
    [
        (lambda f: f["ram"].update(memory_type="DDR5"), "T02"),
        (lambda f: f["cpu"].update(memory_type="DDR5"), "T02"),
        (lambda f: f["motherboard"].update(slots=1), "T02"),
        (lambda f: f["motherboard"].update(max_total_gb=8), "T02"),
        (lambda f: f["ram"].update(buffered=True), "T02"),
        (lambda f: f["gpu"].update(length_mm=301), "T04"),
        (lambda f: f["psu"].update(pcie8_count=0), "T06"),
        (lambda f: f["psu"].update(eps8_count=0), "T06"),
        (lambda f: f["case"].update(board_formats=["mATX"]), "T07"),
        (lambda f: f["case"].update(psu_formats=["SFX"]), "T07"),
        (lambda f: f["psu"].update(length_mm=201), "T07"),
        (lambda f: f["storage"].update(storage_form="22110"), "T08"),
    ],
)
def test_documented_conflict_is_incompatible(change, rule):
    tower, fields, support = fixture()
    change(fields)
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert state(result, rule) == "fail"


def test_different_documented_sockets_fail_without_a_support_row():
    tower, fields, _ = fixture()
    fields["cpu"]["socket"] = "OTHER"
    result = evaluate(tower, fields, None)
    assert result.verdict == "incompatible"
    assert state(result, "T01") == "fail"


def test_same_socket_is_not_enough_without_a_model_support_row():
    tower, fields, _ = fixture()
    result = evaluate(tower, fields, None)
    assert result.verdict == "requiere_verificacion"
    assert state(result, "T01") == "unknown"


def test_missing_or_earlier_bios_never_changes_the_new_verdict():
    tower, fields, support = fixture()
    for bios in (None, "OLD", "EXACT-plus"):
        tower.context.bios_version = bios
        result = evaluate(tower, fields, support)
        # The support row is exact; BIOS is a stored datum, not a decision input.
        assert result.verdict == "compatible"
        assert state(result, "T01") == "pass"
        assert not any("bios" in field.lower() for field in result.missing_fields)


def test_new_policy_emits_no_bios_fact_or_missing_field():
    tower, fields, support = fixture()
    for bios in (None, "OLD", "EXACT-plus"):
        tower.context.bios_version = bios
        result = evaluate(tower, fields, support)
        facts = [
            fact.name
            for rule in result.rule_results
            for fact in rule.facts
            if "bios" in fact.name.lower()
        ]
        missing = [
            field
            for rule in result.rule_results
            for field in rule.missing_fields
            if "bios" in field.lower()
        ]
        assert facts == [] and missing == []
        assert not [field for field in result.missing_fields if "bios" in field.lower()]


def test_scope_declares_bios_out_of_scope_without_claiming_validation():
    result = evaluate(*fixture())
    declared = " ".join(result.scope.excludes).casefold()
    assert "bios" in declared and "no se evalúa" in declared
    assert "validada" not in declared
    assert any(
        "BIOS" in warning and "no se evalúa" in warning for warning in result.warnings
    )


def test_failure_dominates_and_keeps_missing():
    tower, fields, support = fixture()
    fields["ram"]["memory_type"] = "DDR5"
    del fields["psu"]["continuous_power_w"]
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert "psu.continuous_power_w" in result.missing_fields


def test_nvme_does_not_need_sata_power_evidence():
    tower, fields, support = fixture()
    del fields["storage"]["sata_power_count"]
    del fields["psu"]["sata_power_count"]
    assert evaluate(tower, fields, support).verdict == "compatible"


def sata(fields):
    fields["storage"] = dict(
        storage_interface="SATA", storage_form="2.5-inch", sata_power_count=1
    )
    fields["motherboard"]["tower_ports"].append(
        dict(resource_id="s1", kind="SATA", accepts=("2.5-inch",))
    )
    fields["case"]["storage_bays"] = [
        dict(resource_id="b1", kind="storage-bay", accepts=("2.5-inch",))
    ]


def test_sata_drive_needs_port_bay_and_power_evidence():
    tower, fields, support = fixture()
    sata(fields)
    assert evaluate(tower, fields, support).verdict == "compatible"
    del fields["storage"]["sata_power_count"]
    assert evaluate(tower, fields, support).verdict == "requiere_verificacion"


@pytest.mark.parametrize(
    "change",
    [
        lambda f: f["case"].update(storage_bays=[]),
        lambda f: f["psu"].update(sata_power_count=0),
        lambda f: f["motherboard"].update(
            tower_ports=[dict(resource_id="m2", kind="M2-NVMe", accepts=("2280",))]
        ),
    ],
)
def test_sata_drive_without_room_fails(change):
    tower, fields, support = fixture()
    sata(fields)
    change(fields)
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert state(result, "T08") == "fail"


def test_documented_port_exclusion_is_enforced():
    tower, fields, support = fixture()
    tower.lines[6].quantity = 2
    fields["motherboard"]["tower_ports"] = [
        dict(resource_id="a", kind="M2-NVMe", accepts=("2280",), excludes=("b",)),
        dict(resource_id="b", kind="M2-NVMe", accepts=("2280",), excludes=("a",)),
    ]
    assert state(evaluate(tower, fields, support), "T08") == "fail"


def test_declared_absence_of_an_essential_category_fails():
    tower, fields, support = fixture()
    tower.category_status["psu"] = "absent"
    assert evaluate(tower, fields, support).verdict == "incompatible"


def with_unknown_case(assembly_state=None):
    tower, fields, support = fixture()
    tower.lines = [line for line in tower.lines if line.category != "case"]
    tower.category_status["case"] = "unknown"
    tower.context.assembly_state = assembly_state
    return tower, fields, support


def assembled_with_unknown_case():
    tower, fields, support = with_unknown_case("assembled")
    sata(fields)
    return tower, fields, support


def physical_notice(result):
    return [
        check
        for check in result.additional_checks
        if check.id == PHYSICAL_SPACE_CHECK_ID
    ]


def test_assembled_pc_with_unknown_case_leaves_physical_checks_unapplied():
    tower, fields, support = assembled_with_unknown_case()
    result = evaluate(tower, fields, support)
    assert result.verdict == "compatible"
    assert result.coverage.complete
    assert state(result, "T04") == "not_applicable"
    assert state(result, "T07") == "not_applicable"
    assert state(result, "T08") == "not_applicable"
    assert result.coverage.not_applicable == ("T04", "T07", "T08")
    assert result.coverage.evaluated == tuple(
        rule.rule_id for rule in result.rule_results if rule.state in ("pass", "fail")
    )
    assert not {"T04", "T07", "T08"} & set(result.coverage.evaluated)
    for rule in result.rule_results:
        if rule.rule_id in ("T04", "T07"):
            assert PHYSICAL_SPACE_NOT_EVALUATED in rule.conditions
        elif rule.rule_id == "T08":
            assert any(
                "ya está armada" in condition
                and "gabinete no se identificó" in condition
                for condition in rule.conditions
            )
    assert not [
        field
        for field in result.missing_fields
        if field.startswith(("case.", "gpu.length_mm", "case.gpu_limit_mm"))
    ]
    assert "case.presence" not in [
        missing for rule in result.rule_results for missing in rule.missing_fields
    ]
    assert PHYSICAL_SPACE_NOT_EVALUATED in result.warnings
    assert [check.reason for check in physical_notice(result)] == [
        PHYSICAL_SPACE_NOT_EVALUATED
    ]


def test_pc_without_declaration_also_leaves_physical_checks_unapplied():
    tower, fields, support = with_unknown_case()
    result = evaluate(tower, fields, support)
    assert result.verdict == "compatible"
    assert result.coverage.complete
    assert state(result, "T04") == "not_applicable"
    assert state(result, "T07") == "not_applicable"
    assert state(result, "T08") == "pass"
    assert result.coverage.not_applicable == ("T04", "T07")
    assert "case.presence" not in result.missing_fields
    assert PHYSICAL_SPACE_NOT_EVALUATED in result.warnings
    assert len(physical_notice(result)) == 1


def test_no_declaration_keeps_t08_unknown_when_it_depends_on_unknown_case():
    tower, fields, support = assembled_with_unknown_case()
    tower.context.assembly_state = None
    result = evaluate(tower, fields, support)
    assert result.verdict == "requiere_verificacion"
    assert not result.coverage.complete
    assert state(result, "T04") == "not_applicable"
    assert state(result, "T07") == "not_applicable"
    assert state(result, "T08") == "unknown"
    assert "case.presence" not in result.missing_fields


def test_future_gpu_does_not_inherit_assembled_declaration():
    from upgradejusto.compatibility.tower_application import apply_tower_actions
    from upgradejusto.compatibility.tower_http_models import TowerAction
    from upgradejusto.pcs.tower_models import Tower

    tower, fields, support = assembled_with_unknown_case()
    saved = Tower.model_validate(
        {
            **tower.model_dump(),
            "id": UUID(int=1),
            "revision": 1,
            "origin_schema": 2,
        }
    )
    action = TowerAction(
        action="replace_category",
        category="gpu",
        candidates=[{"declared_model": "Future synthetic GPU", "quantity": 1}],
    )
    changed = apply_tower_actions(saved, [action], {})
    assert changed.context.assembly_state == "new"
    result = evaluate(changed, fields, support)
    # T04/T07 are always disclosed as not evaluated without measurements; the
    # assembled-only T08 treatment is what must not be inherited.
    assert state(result, "T04") == "not_applicable"
    assert state(result, "T08") == "unknown"


def test_missing_gpu_measurement_does_not_block_t04():
    tower, fields, support = fixture()
    del fields["gpu"]["length_mm"]
    result = evaluate(tower, fields, support)
    assert result.verdict == "compatible"
    assert state(result, "T04") == "not_applicable"
    assert PHYSICAL_SPACE_NOT_EVALUATED in result.warnings


@pytest.mark.parametrize(
    ("change", "rule"),
    [
        (lambda fields: fields["gpu"].update(length_mm=400), "T04"),
        (lambda fields: fields["case"].update(board_formats=["mATX"]), "T07"),
    ],
)
def test_documented_physical_conflict_is_never_hidden(change, rule):
    tower, fields, support = fixture()
    change(fields)
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert state(result, rule) == "fail"
    assert not physical_notice(result)
    assert PHYSICAL_SPACE_NOT_EVALUATED not in result.warnings


def test_cooler_and_fans_stay_optional_on_an_assembled_pc():
    tower, fields, support = assembled_with_unknown_case()
    tower.category_status["cooler"] = "unknown"
    tower.category_status["fan"] = "absent"
    result = evaluate(tower, fields, support)
    assert result.verdict == "compatible"
    assert not [
        field for field in result.missing_fields if field.startswith(("cooler", "fan"))
    ]


def test_assembled_never_turns_a_documented_failure_into_not_applicable():
    tower, fields, support = fixture()
    tower.context.assembly_state = "assembled"
    fields["gpu"]["length_mm"] = 400
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert state(result, "T04") == "fail"


def test_absent_gpu_is_not_proof_of_integrated_video():
    tower, fields, support = fixture()
    tower.lines = [line for line in tower.lines if line.category != "gpu"]
    tower.category_status["gpu"] = "absent"
    result = evaluate(tower, fields, support)
    assert result.verdict == "requiere_verificacion"
    assert state(result, "T11") == "unknown"
