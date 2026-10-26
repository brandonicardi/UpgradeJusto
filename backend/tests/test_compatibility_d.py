"""D dominio puro: extracto histórico, no integración PG ni compatibilidad global."""

from copy import deepcopy

import pytest

from upgradejusto.catalog.dataset import COMPONENTS, DATASET_VERSION
from upgradejusto.compatibility.application import resolve_configuration
from upgradejusto.compatibility.evaluation import evaluate_d
from upgradejusto.compatibility.http_models import EvaluatedConfiguration
from upgradejusto.compatibility.models import (
    EvidenceRef,
    ResolvedConfiguration,
    TextObservation,
)


def configuration(bios="P2.30", cpu="P01", board="P03"):
    selected = EvaluatedConfiguration(
        components=[
            {"category": "cpu", "component_id": cpu, "quantity": 1},
            {"category": "motherboard", "component_id": board, "quantity": 1},
        ],
        context={"bios_version": bios, "notes": None},
    )
    return resolve_configuration(
        selected, {c.id: c for c in COMPONENTS}, 3, DATASET_VERSION
    )


def r01(result):
    return next(rule for rule in result.rule_results if rule.rule_id == "R01")


@pytest.mark.parametrize("cpu", ["P01", "P02"])
@pytest.mark.parametrize(
    "bios,state",
    [
        ("P2.30", "pass"),
        ("P1.20", "fail"),
        (None, "unknown"),
        ("P2.31", "unknown"),
        ("2.30", "unknown"),
        ("P10.0", "unknown"),
    ],
)
def test_exact_bios_requirement_only(cpu, bios, state):
    config = configuration(bios, cpu)
    before = deepcopy(config.model_dump())
    result = evaluate_d(config)
    assert r01(result).state == state
    assert result == evaluate_d(config)
    assert config.model_dump() == before
    assert len(result.coverage.required) == 12
    assert len(result.coverage.not_implemented) == 3
    assert result.rules_version == "cu05-25-resources.1"
    assert result.verdict == (
        "incompatible" if state == "fail" else "requiere_verificacion"
    )
    assert not result.coverage.complete
    assert (
        "gpu_length" in result.missing_fields
        and "adapter_route" in result.missing_fields
    )
    assert {ref.source_id for ref in r01(result).evidence} >= {
        "F01" if cpu == "P01" else "F02",
        "F03",
        "F04",
    }


def test_socket_failure_keeps_unknown_bios_and_support_revision():
    config = configuration(None)
    data = config.model_dump()
    synthetic = EvidenceRef(
        source_id="TEST",
        url="https://example.org/synthetic",
        locator="socket sintético",
        consulted_on="2026-10-24",
    )
    data["cpu_support"]["motherboard_socket"] = TextObservation(
        value="AM5", evidence=(synthetic,)
    )
    data["cpu_support"]["applicable_revision"] = None
    result = evaluate_d(ResolvedConfiguration.model_validate(data))
    assert r01(result).state == "fail" and result.verdict == "incompatible"
    assert "cpu_support.installed_bios" in result.missing_fields
    assert "cpu_support.exact_support_row" in result.missing_fields
    assert "front.inventory" in result.missing_fields


@pytest.mark.parametrize(
    "field,value",
    [
        ("motherboard_model", "ASRock B550M Pro4 Pro SE"),
        ("cpu_model", "AMD Ryzen 5 5600G"),
        ("applicable_revision", "otra revisión"),
    ],
)
def test_no_approximate_identity_or_revision(field, value):
    data = configuration().model_dump()
    # Alterar la fila sintética no permite acreditar otra identidad del snapshot.
    data["cpu_support"]["support_rows"][0][field] = value
    assert (
        r01(evaluate_d(ResolvedConfiguration.model_validate(data))).state == "unknown"
    )


def test_other_motherboard_no_inferred_support():
    result = evaluate_d(configuration(board="P17"))
    assert r01(result).state == "unknown"
    assert "cpu_support.exact_support_row" in result.missing_fields
