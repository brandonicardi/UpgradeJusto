"""Essential policy proofs on synthetic facts: not hardware certification."""

from copy import deepcopy

import pytest
from test_tower38_engine import REF, fixture

from upgradejusto.compatibility.basic_specs import BasicSpecs
from upgradejusto.compatibility.tower_contract import (
    ESSENTIAL_REQUIRED,
    TowerComponentEvidence,
    TowerTechnicalEvidenceDTO,
)
from upgradejusto.compatibility.tower_essential import evaluate_tower_essential


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
    assert result.scope.id == "cu05-tower-essential-1"
    assert result.rules_version == "cu05-tower-essential-engine-1"
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
        ("gpu", "length_mm", "T04"),
        ("case", "gpu_limit_mm", "T04"),
        ("psu", "continuous_power_w", "T05"),
        ("gpu", "gpu_power_kind", "T06"),
        ("gpu", "gpu_power_count", "T06"),
        ("psu", "pcie8_count", "T06"),
        ("motherboard", "form_factor", "T07"),
        ("case", "board_formats", "T07"),
        ("psu", "form_factor", "T07"),
        ("case", "psu_formats", "T07"),
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


def test_bios_relation_is_kept():
    tower, fields, support = fixture()
    tower.context.bios_version = "OLD"
    assert state(evaluate(tower, fields, support), "T01") == "fail"
    tower.context.bios_version = None
    result = evaluate(tower, fields, support)
    assert result.verdict == "requiere_verificacion"
    assert "cpu_support.installed_bios" in result.missing_fields


def test_failure_dominates_and_keeps_missing():
    tower, fields, support = fixture()
    fields["ram"]["memory_type"] = "DDR5"
    del fields["gpu"]["length_mm"]
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert "gpu.length_mm" in result.missing_fields


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


def test_absent_gpu_is_not_proof_of_integrated_video():
    tower, fields, support = fixture()
    tower.lines = [line for line in tower.lines if line.category != "gpu"]
    tower.category_status["gpu"] = "absent"
    result = evaluate(tower, fields, support)
    assert result.verdict == "requiere_verificacion"
    assert state(result, "T11") == "unknown"
