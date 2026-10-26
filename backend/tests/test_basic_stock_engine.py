"""Synthetic resolved-fact unit fixtures, not evidence of PG or real hardware."""

import json

import pytest

from upgradejusto.compatibility.basic_contract import AdditionalCheck
from upgradejusto.compatibility.basic_evaluation import aggregate_basic, evaluate_basic
from upgradejusto.compatibility.basic_specs import BasicSpecs
from upgradejusto.compatibility.evaluation import evaluate_d
from upgradejusto.compatibility.models import (
    CpuSupportInput,
    CpuSupportRow,
    EvaluationResult,
    PartInstance,
    ResolvedConfiguration,
    TextObservation,
)
from upgradejusto.compatibility.observations import EvidenceRef

REF = EvidenceRef(
    source_id="unit-fixture",
    url="https://example.org/unit-only",
    locator="Synthetic facts; not PG/manufacturer verification",
    consulted_on="2026-10-25",
)


def spec(**facts):
    return BasicSpecs(facts, {key: (REF,) for key in facts}, frozenset())


def fixture():
    parts = tuple(
        PartInstance(
            instance_id=category + "-new",
            part_id=category + "-arbitrary-id",
            category=category,
            model=category + " exact synthetic model",
            quantity=2 if category == "ram" else 1,
        )
        for category in ("cpu", "motherboard", "ram", "gpu", "psu", "case")
    )

    def observation(value):
        return TextObservation(value=value, evidence=(REF,))

    config = ResolvedConfiguration(
        pc_revision="5",
        data_revision="synthetic-unit-publication",
        parts=parts,
        cpu_support=CpuSupportInput(
            cpu_instance_id="cpu-new",
            motherboard_instance_id="motherboard-new",
            cpu_socket=observation("AM4"),
            motherboard_socket=observation("AM4"),
            applicable_revision=observation("original"),
            installed_bios="P2.30",
            support_rows=(
                CpuSupportRow(
                    cpu_model="cpu exact synthetic model",
                    motherboard_model="motherboard exact synthetic model",
                    applicable_revision="original",
                    minimum_bios="P2.30",
                    earlier_bios=("P1.00",),
                    evidence=(REF,),
                ),
            ),
        ),
    )
    specs = {
        "cpu-new": spec(
            memory_type="DDR4",
            jedec_mts=[3200],
            cpu_platform="AM4",
            cpu_tdp_class_w=65,
            cpu_stock_family="Ryzen5000",
        ),
        "motherboard-new": spec(
            memory_type="DDR4",
            module_type="UDIMM",
            slots=4,
            max_total_gb=128,
            jedec_mts=[3200],
            ecc=False,
            buffered=False,
            pcie_slot="PCIe x16",
            atx24_count=1,
            eps8_count=1,
            form_factor="mATX",
        ),
        "ram-new": spec(
            memory_type="DDR4",
            module_type="UDIMM",
            capacity_gb=8,
            jedec_mts=[3200],
            ecc=False,
            buffered=False,
        ),
        "gpu-new": spec(
            pcie_interface="PCIe x16",
            pcie_backward_compatible=True,
            length_mm=227.2,
            recommended_psu_w=550,
            gpu_power_kind="PCIe8",
            gpu_power_count=1,
            nvidia_recommended_psu_w=550,
            psu_reference_platform="AM4",
            psu_reference_cpu_tdp_class_w=105,
            psu_recommendation_basis="manufacturer_whole_system_minimum",
            psu_reference_system="reference system",
        ),
        "psu-new": spec(
            continuous_power_w=550,
            atx24_count=1,
            eps8_count=1,
            pcie8_count=2,
            pcie8_independent_branches=1,
            native16_count=0,
            form_factor="ATX",
            length_mm=125,
        ),
        "case-new": spec(
            gpu_limit_mm=315,
            board_formats=["ATX", "mATX"],
            psu_formats=["ATX"],
            psu_limit_mm=175,
        ),
    }
    return config, specs


def change(specs, identity, **facts):
    specs[identity] = spec(**{**specs[identity].fields, **facts})


def test_core_positive_has_seven_checks_and_visible_additional_unknown():
    config, specs = fixture()
    result = evaluate_basic(config, specs)
    assert result.verdict == "compatible"
    assert result.coverage.complete
    assert result.coverage.required == tuple(f"B{i:02}" for i in range(1, 8))
    assert {check.id for check in result.additional_checks} >= {
        "B08",
        "B09",
        "stock_cooling",
    }
    assert any(check.status == "unknown" for check in result.additional_checks)
    assert EvaluationResult.model_validate_json(result.model_dump_json()) == result


def test_bios_null_never_green():
    config, specs = fixture()
    config = config.model_copy(
        update={
            "cpu_support": config.cpu_support.model_copy(
                update={"installed_bios": None}
            )
        }
    )
    assert evaluate_basic(config, specs).verdict == "requiere_verificacion"


def test_length_fail_dominates_missing_bios():
    config, specs = fixture()
    change(specs, "gpu-new", length_mm=329)
    config = config.model_copy(
        update={
            "cpu_support": config.cpu_support.model_copy(
                update={"installed_bios": None}
            )
        }
    )
    result = evaluate_basic(config, specs)
    assert result.verdict == "incompatible"
    assert "cpu_support.installed_bios" in result.missing_fields


def test_ram_five_modules_fail_even_with_unknown_capacity():
    config, specs = fixture()
    parts = tuple(
        part.model_copy(update={"quantity": 5}) if part.category == "ram" else part
        for part in config.parts
    )
    change(specs, "ram-new", capacity_gb=None)
    result = evaluate_basic(config.model_copy(update={"parts": parts}), specs)
    assert result.verdict == "incompatible"
    assert "ram.module_1.capacity_gb" in result.missing_fields


def test_nominal_faster_mhz_not_rejected_with_common_native_mode():
    config, specs = fixture()
    change(specs, "ram-new", nominal_mts=4000, jedec_mts=[3200, 4000])
    assert evaluate_basic(config, specs).verdict == "compatible"


@pytest.mark.parametrize(
    ("rating", "expected"),
    [(549, "incompatible"), (550, "compatible"), (750, "compatible")],
)
def test_manufacturer_whole_system_threshold_no_extra_margin(rating, expected):
    config, specs = fixture()
    change(specs, "psu-new", continuous_power_w=rating)
    assert evaluate_basic(config, specs).verdict == expected


@pytest.mark.parametrize(
    "facts",
    [{"cpu_tdp_class_w": 105}, {"cpu_platform": "AM5"}, {"cpu_tdp_class_w": None}],
)
def test_unsupported_cpu_class_platform_or_unknown_is_not_eligible(facts):
    config, specs = fixture()
    change(specs, "cpu-new", **facts)
    assert evaluate_basic(config, specs).verdict == "requiere_verificacion"


def test_adapter_two_connectors_on_one_branch_fails():
    config, specs = fixture()
    change(specs, "gpu-new", gpu_power_kind="16pin", adapter_pcie8_inputs=2)
    assert evaluate_basic(config, specs).verdict == "incompatible"
    change(specs, "psu-new", pcie8_independent_branches=2)
    assert evaluate_basic(config, specs).verdict == "compatible"


def test_native_route_does_not_need_unknown_spare_pcie_branches():
    config, specs = fixture()
    change(specs, "gpu-new", gpu_power_kind="16pin", adapter_pcie8_inputs=2)
    change(specs, "psu-new", native16_count=1, pcie8_independent_branches=None)
    assert evaluate_basic(config, specs).verdict == "compatible"


def test_known_additional_failure_blocks_without_forging_core_unknown():
    config, specs = fixture()
    base = evaluate_basic(config, specs)
    result = aggregate_basic(
        config,
        base.rule_results,
        (
            AdditionalCheck(
                id="B09",
                status="fail",
                reason="Synthetic documented function loss",
                evidence_refs=(REF,),
            ),
        ),
    )
    assert result.verdict == "incompatible" and result.coverage.complete


def test_mixed_inventory_or_scope_unknown_green_rejected():
    config, specs = fixture()
    data = json.loads(evaluate_basic(config, specs).model_dump_json())
    data["coverage"]["required"].append("B08")
    with pytest.raises(ValueError):
        EvaluationResult.model_validate_json(json.dumps(data))


def test_legacy_engine_remains_legacy_without_scope_keys():
    config, _ = fixture()
    data = evaluate_d(config).model_dump()
    assert len(data["coverage"]["required"]) == 12
    assert not {"scope", "additional_checks", "warnings"} & data.keys()
