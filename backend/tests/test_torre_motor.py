"""SYNTHETIC algorithm proofs only: not hardware/retail certification."""

from copy import deepcopy
from uuid import UUID

import pytest

from upgradejusto.compatibility.basic_specs import BasicSpecs
from upgradejusto.compatibility.models import (
    CpuSupportInput,
    CpuSupportRow,
    TextObservation,
)
from upgradejusto.compatibility.observations import EvidenceRef
from upgradejusto.compatibility.tower_contract import (
    REQUIRED,
    TowerComponentEvidence,
    TowerTechnicalEvidenceDTO,
)
from upgradejusto.compatibility.tower_engine import evaluate_tower
from upgradejusto.pcs.tower_models import TowerCreate, TowerLine

REF = EvidenceRef(
    source_id="synthetic-algorithm-only",
    url="https://example.org/synthetic-tower38",
    locator="Invented test facts, NOT manufacturer evidence",
    consulted_on="2026-10-26",
)


def fixture():
    fields = {
        "cpu": dict(
            socket="S",
            memory_type="DDR4",
            jedec_mts=[3200],
            cpu_platform="AM4",
            cpu_tdp_class_w=65,
            cpu_stock_family="Ryzen5000",
        ),
        "motherboard": dict(
            socket="S",
            memory_type="DDR4",
            module_type="UDIMM",
            slots=4,
            max_total_gb=64,
            jedec_mts=[3200],
            ecc=False,
            buffered=False,
            pcie_slot="PCIe x16",
            atx24_count=1,
            eps8_count=1,
            form_factor="ATX",
            shared_limits=[],
            tower_ports=[
                dict(resource_id="m2", kind="M2-NVMe", accepts=("2280",)),
                dict(resource_id="pcie", kind="PCIe", accepts=("x16",)),
            ],
            fan_headers=[
                dict(
                    resource_id=f"h{i}",
                    kind="fan",
                    accepts=("4pin",),
                    voltage_mv=12000,
                    max_current_ma=1000,
                )
                for i in range(3)
            ],
        ),
        "ram": dict(
            memory_type="DDR4",
            module_type="UDIMM",
            capacity_gb=8,
            jedec_mts=[3200],
            ecc=False,
            buffered=False,
        ),
        "gpu": dict(
            pcie_interface="PCIe x16",
            pcie_backward_compatible=True,
            length_mm=200,
            recommended_psu_w=500,
            nvidia_recommended_psu_w=500,
            psu_reference_platform="AM4",
            psu_reference_cpu_tdp_class_w=105,
            psu_recommendation_basis="manufacturer_whole_system_minimum",
            psu_reference_system="Synthetic reference",
            gpu_power_kind="PCIe8",
            gpu_power_count=1,
            tower_port_kind="PCIe",
            tower_port_form="x16",
        ),
        "psu": dict(
            continuous_power_w=600,
            atx24_count=1,
            eps8_count=1,
            pcie8_count=1,
            form_factor="ATX",
            length_mm=150,
            sata_power_count=2,
        ),
        "case": dict(
            gpu_limit_mm=300,
            psu_limit_mm=200,
            board_formats=["ATX"],
            psu_formats=["ATX"],
            storage_bays=[],
            cooler_height_limit_mm=160,
            fan_positions=2,
        ),
        "storage": dict(
            storage_interface="M2-NVMe", storage_form="2280", sata_power_count=0
        ),
        "cooler": dict(
            cooler_sockets=["S"],
            cooler_type="air",
            cooler_height_mm=150,
            fan_count=1,
            fan_voltage_mv=12000,
            fan_current_ma=200,
            fan_connector="4pin",
        ),
        "fan": dict(fan_voltage_mv=12000, fan_current_ma=200, fan_connector="4pin"),
    }
    tower = TowerCreate.model_validate(
        dict(
            schema_version=2,
            name="SYNTHETIC ONLY",
            category_status={key: "present" for key in fields},
            lines=[
                dict(
                    line_id=UUID(int=index),
                    category=key,
                    component_id=key,
                    quantity=2 if key in ("ram", "fan") else 1,
                )
                for index, key in enumerate(fields, 1)
            ],
            context=dict(bios_version="EXACT", notes=None),
        )
    )
    fields["motherboard"]["fan_total_current_ma"] = 3000
    fields["case"]["fan_supported_sizes_mm"] = [120]
    fields["fan"]["fan_size_mm"] = 120
    observation = TextObservation(value="S", evidence=(REF,))
    support = CpuSupportInput(
        cpu_instance_id=str(tower.lines[0].line_id),
        motherboard_instance_id=str(tower.lines[1].line_id),
        cpu_socket=observation,
        motherboard_socket=observation,
        applicable_revision=TextObservation(value="rev", evidence=(REF,)),
        support_rows=(
            CpuSupportRow(
                cpu_model="cpu",
                motherboard_model="motherboard",
                applicable_revision="rev",
                minimum_bios="EXACT",
                earlier_bios=("OLD",),
                evidence=(REF,),
            ),
        ),
    )
    return tower, fields, support


def evaluate(tower, fields, support):
    return evaluate_tower(
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


def test_synthetic_full_positive_fixed_coverage_and_versions():
    tower, fields, support = fixture()
    original = deepcopy(tower.model_dump())
    result = evaluate(tower, fields, support)
    assert result.verdict == "compatible"
    assert result.coverage.required == REQUIRED
    assert result.coverage.evaluated == REQUIRED
    assert result.coverage.complete
    assert result.scope.id == "cu05-tower-stock-1"
    assert result.rules_version == "cu05-tower-stock-engine-1"
    assert result.data_revision == "synthetic-publication-1"
    assert result.warnings
    assert tower.model_dump() == original
    assert result == evaluate(tower, fields, support)


def test_missing_blocks_green_and_failure_retains_missing():
    tower, fields, support = fixture()
    del fields["fan"]["fan_current_ma"]
    assert evaluate(tower, fields, support).verdict == "requiere_verificacion"
    fields["gpu"]["length_mm"] = 400
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert "T04" in result.coverage.failed
    assert result.missing_fields
    assert not result.coverage.complete


@pytest.mark.parametrize("category", ["storage", "fan"])
def test_quantity_consumes_distinct_nominal_resources(category):
    tower, fields, support = fixture()
    for line in tower.lines:
        if line.category == category:
            line.quantity = 4
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert ("T08" if category == "storage" else "T10") in result.coverage.failed


def test_gpu_storage_exclusion_is_not_ignored():
    tower, fields, support = fixture()
    fields["motherboard"]["tower_ports"][0]["excludes"] = ("pcie",)
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert "T12" in result.coverage.failed


def test_shared_budget_is_summed_across_gpu_and_disk():
    tower, fields, support = fixture()
    for port in fields["motherboard"]["tower_ports"]:
        port.update(group="lanes", cost=4)
    fields["motherboard"]["shared_limits"] = [dict(group="lanes", capacity=4)]
    assert "T12" in evaluate(tower, fields, support).coverage.failed


def test_declared_and_unvalidated_catalog_remain_unknown():
    tower, fields, support = fixture()
    tower.lines[-1].component_id = None
    tower.lines[-1].declared_model = "4pin 12V 200mA (must not parse)"
    result = evaluate(tower, fields, support)
    assert result.verdict == "requiere_verificacion"
    assert "T11" in result.coverage.unknown
    fields = {key: {} for key in fields}
    assert evaluate(tower, fields, None).verdict == "requiere_verificacion"


def test_bios_relation_uses_declaration_not_stale_evidence():
    tower, fields, support = fixture()
    tower.context.bios_version = "OLD"
    assert "T01" in evaluate(tower, fields, support).coverage.failed
    tower.context.bios_version = "EXACT-plus"
    assert "T01" in evaluate(tower, fields, support).coverage.unknown


def test_no_pending_switch_or_id_whitelist():
    tower, fields, support = fixture()
    for line in tower.lines:
        fields["renamed-" + line.component_id] = fields.pop(line.component_id)
        line.component_id = "renamed-" + line.component_id
    # Models remain exact via explicit evidence, independent of arbitrary IDs.
    evidence = TowerTechnicalEvidenceDTO(
        data_revision="renamed",
        components={
            key: TowerComponentEvidence(
                key.removeprefix("renamed-"),
                key.removeprefix("renamed-"),
                "renamed",
                BasicSpecs(value, {name: (REF,) for name in value}, frozenset()),
            )
            for key, value in fields.items()
        },
        cpu_support=support,
    )
    assert evaluate_tower(tower, evidence).verdict == "compatible"
    with pytest.raises(TypeError):
        evaluate_tower(tower, evidence, disable_pending=True)


def test_fan_current_sum_failure_keeps_other_missing():
    tower, fields, support = fixture()
    fields["motherboard"]["fan_total_current_ma"] = 500
    del fields["cooler"]["cooler_height_mm"]
    result = evaluate(tower, fields, support)
    assert "T10" in result.coverage.failed
    assert result.missing_fields
    assert result.verdict == "incompatible"


def test_multiple_sata_drives_consume_ports_bays_and_power():
    tower, fields, support = fixture()
    line = next(line for line in tower.lines if line.category == "storage")
    line.quantity = 2
    fields["storage"] = dict(
        storage_interface="SATA", storage_form="2.5", sata_power_count=1
    )
    fields["motherboard"]["tower_ports"] = [
        dict(resource_id="pcie", kind="PCIe", accepts=("x16",)),
        dict(resource_id="sata1", kind="SATA", accepts=("2.5",)),
        dict(resource_id="sata2", kind="SATA", accepts=("2.5",)),
    ]
    fields["case"]["storage_bays"] = [
        dict(resource_id=f"bay{i}", kind="bay", accepts=("2.5",)) for i in range(2)
    ]
    result = evaluate(tower, fields, support)
    assert "T08" in result.coverage.passed
    assert result.verdict == "requiere_verificacion"  # expanded PSU envelope
    fields["psu"]["sata_power_count"] = 1
    assert "T08" in evaluate(tower, fields, support).coverage.failed


def test_unknown_presence_and_absent_gpu_do_not_become_passes():
    tower, fields, support = fixture()
    tower.lines = [line for line in tower.lines if line.category != "gpu"]
    tower.category_status["gpu"] = "absent"
    result = evaluate(tower, fields, support)
    assert result.verdict == "requiere_verificacion"
    assert "T11" in result.coverage.unknown


def test_unsourced_and_cross_revision_facts_are_not_evidence():
    tower, fields, support = fixture()
    components = {
        key: TowerComponentEvidence(
            key, key, "wrong-revision", BasicSpecs(value, {}, frozenset())
        )
        for key, value in fields.items()
    }
    result = evaluate_tower(
        tower, TowerTechnicalEvidenceDTO("pinned", components, support)
    )
    assert result.verdict == "requiere_verificacion"
    assert not result.coverage.complete
    unsourced = {
        key: TowerComponentEvidence(
            key, key, "pinned", BasicSpecs(value, {}, frozenset())
        )
        for key, value in fields.items()
    }
    assert (
        evaluate_tower(
            tower, TowerTechnicalEvidenceDTO("pinned", unsourced, support)
        ).verdict
        == "requiere_verificacion"
    )


def test_distinct_drive_lines_share_one_finite_inventory():
    tower, fields, support = fixture()
    tower.lines.append(
        TowerLine(
            line_id=UUID(int=99),
            category="storage",
            component_id="second-drive",
            quantity=1,
        )
    )
    components = {
        key: TowerComponentEvidence(
            key,
            key,
            "pinned",
            BasicSpecs(value, {name: (REF,) for name in value}, frozenset()),
        )
        for key, value in fields.items()
    }
    components["second-drive"] = TowerComponentEvidence(
        "storage",
        "Distinct synthetic drive",
        "pinned",
        BasicSpecs(
            fields["storage"],
            {name: (REF,) for name in fields["storage"]},
            frozenset(),
        ),
    )
    result = evaluate_tower(
        tower, TowerTechnicalEvidenceDTO("pinned", components, support)
    )
    assert "T08" in result.coverage.failed
    assert "T12" in result.coverage.failed


def test_shared_budget_failure_survives_independent_storage_unknown():
    tower, fields, support = fixture()
    for port in fields["motherboard"]["tower_ports"]:
        port.update(group="lanes", cost=4)
    fields["motherboard"]["shared_limits"] = [dict(group="lanes", capacity=4)]
    assert "T12" in evaluate(tower, fields, support).coverage.failed
    del fields["storage"]["sata_power_count"]
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert "T12" in result.coverage.failed
    assert any(path.endswith(".sata_power_count") for path in result.missing_fields)


def test_header_matching_failure_survives_independent_unknown():
    tower, fields, support = fixture()
    headers = fields["motherboard"]["fan_headers"]
    headers[1]["accepts"] = ("other",)
    headers[2]["accepts"] = ("other",)
    # Three loads, three headers, but only one usable route: not a count shortcut.
    assert "T10" in evaluate(tower, fields, support).coverage.failed
    del fields["case"]["fan_supported_sizes_mm"]
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert "T10" in result.coverage.failed
    assert "case.fan_supported_sizes_mm" in result.missing_fields


@pytest.mark.parametrize("invalid", ["NOT-SUPPORTED", {"S": True}, True, ["S", 1]])
def test_cooler_socket_collection_is_strict_not_substring(invalid):
    tower, fields, support = fixture()
    fields["cooler"]["cooler_sockets"] = invalid
    result = evaluate(tower, fields, support)
    assert result.verdict == "requiere_verificacion"
    assert "T09" in result.coverage.unknown
    assert "cooler.cooler_sockets" in result.missing_fields
    fields["gpu"]["length_mm"] = 400
    result = evaluate(tower, fields, support)
    assert result.verdict == "incompatible"
    assert "cooler.cooler_sockets" in result.missing_fields


@pytest.mark.parametrize(
    "category,key",
    [
        ("motherboard", "tower_ports"),
        ("motherboard", "fan_headers"),
        ("motherboard", "shared_limits"),
        ("case", "storage_bays"),
        ("case", "fan_supported_sizes_mm"),
        ("case", "board_formats"),
        ("ram", "jedec_mts"),
    ],
)
@pytest.mark.parametrize("invalid", ["S", {}, True, ["S", 1]])
def test_source_backed_malformed_collections_never_approve(category, key, invalid):
    tower, fields, support = fixture()
    fields[category][key] = invalid
    result = evaluate(tower, fields, support)
    assert result.verdict == "requiere_verificacion"
    assert result.missing_fields
    assert not result.coverage.complete


@pytest.mark.parametrize("key", ["tower_ports", "fan_headers", "shared_limits"])
def test_documented_empty_inventory_differs_from_malformed(key):
    tower, fields, support = fixture()
    fields["motherboard"][key] = []
    result = evaluate(tower, fields, support)
    if key == "shared_limits":
        assert result.verdict == "compatible"  # explicitly no shared groups
    else:
        assert result.verdict == "incompatible"  # proven lack of required resources


def test_typed_tuple_collections_are_supported_without_mutation():
    tower, fields, support = fixture()
    fields["cooler"]["cooler_sockets"] = ("S",)
    fields["case"]["board_formats"] = ("ATX",)
    fields["ram"]["jedec_mts"] = (3200,)
    original = deepcopy(fields)
    assert evaluate(tower, fields, support).verdict == "compatible"
    assert fields == original
