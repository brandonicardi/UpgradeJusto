"""Scoped tool projection/policy checks; no provider or PG verification claim."""

import json

import pytest
from mcp.types import CallToolResult
from test_basic_stock_imported_ram import imported_catalog
from test_basic_stock_scenarios import base

from upgradejusto.assistant.graph import POLICY
from upgradejusto.assistant.tool_projection import MAX_TOOL_BYTES, project_tool_result
from upgradejusto.compatibility.application import evaluate_current
from upgradejusto.compatibility.http_models import EvaluationResponse


def test_assistant_policy_requires_scoped_conditioned_language_and_preserves_legacy():
    for clause in (
        "scope.label",
        "scope.assumptions",
        "warnings",
        "scope.excludes",
        "no lo presentes como compatibilidad física total",
        "certificación térmica/eléctrica",
        "legacy sin scope conserva su versión",
        "nunca",
        "nuevo alcance básico stock",
    ):
        assert clause in POLICY


@pytest.mark.parametrize("bios", ["P2.30", None])
@pytest.mark.parametrize("second", [False, True])
def test_scoped_projection_keeps_all_checks_missing_scope_and_warnings(bios, second):
    configuration = base(second, bios=bios)
    configuration.context.notes = "PRIVATE-DO-NOT-PROJECT"
    result = evaluate_current(configuration, imported_catalog(), 1, "unit-real-import")
    report = EvaluationResponse(
        **result.model_dump(), evaluated_configuration=configuration
    ).model_dump(mode="json")
    projection = project_tool_result(
        "evaluate_pc", CallToolResult(structured_content=report, content=[])
    )
    projected = json.loads(projection.text)["data"]
    assert projected["scope"] == report["scope"]
    assert projected["warnings"] == report["warnings"]
    assert projected["coverage"] == report["coverage"]
    assert projected["missing_fields"] == report["missing_fields"]
    assert projected["verdict"] == report["verdict"]
    assert len(projected["rule_results"]) == 7
    assert "PRIVATE-DO-NOT-PROJECT" not in projection.text
    assert projection.byte_count <= MAX_TOOL_BYTES
    for actual, original in zip(
        projected["additional_checks"], report["additional_checks"], strict=True
    ):
        assert {
            key: value for key, value in actual.items() if key != "evidence_refs"
        } == {key: value for key, value in original.items() if key != "evidence_refs"}
    if bios is None:
        assert projected["verdict"] == "requiere_verificacion"
        assert "cpu_support.installed_bios" in projected["missing_fields"]
