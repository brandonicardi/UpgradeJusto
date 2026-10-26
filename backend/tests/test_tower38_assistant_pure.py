"""Synthetic tower transport/projection proofs, not PG or provider evidence."""

import asyncio
import json
from types import SimpleNamespace
from uuid import uuid4

import pytest
from test_tower38_engine import evaluate, fixture

from upgradejusto.assistant.models import MessageCreate
from upgradejusto.assistant.service import AssistantService
from upgradejusto.assistant.tool_inputs import INPUTS, validate_call
from upgradejusto.assistant.tool_projection import ToolFailure, project_tool_result
from upgradejusto.assistant.tower_context import TurnHistory
from upgradejusto.compatibility.tower_http_models import TowerEvaluationResponse
from upgradejusto.pcs.tower_models import Tower

TOOLS = {
    "catalog_search",
    "get_pc",
    "evaluate_pc",
    "simulate_pc",
    "preview_recommendations",
    "get_plan",
    "search_public_docs",
}


def result(data):
    return SimpleNamespace(is_error=False, structured_content=data)


def tower_and_evaluation(state="unknown"):
    create, fields, support = fixture()
    if state in {"unknown", "fail"}:
        fields["fan"].pop("fan_current_ma")
    if state == "fail":
        fields["gpu"]["length_mm"] = 400
    tower = Tower(**create.model_dump(), id=uuid4(), revision=1, origin_schema=2)
    tower.context.notes = "PRIVATE-CONTEXT-NOTE-DO-NOT-PROJECT"
    evaluation = TowerEvaluationResponse(
        **evaluate(tower, fields, support).model_dump(), evaluated_configuration=tower
    )
    return tower, evaluation


@pytest.mark.parametrize(
    "state,verdict",
    [
        ("pass", "compatible"),
        ("unknown", "requiere_verificacion"),
        ("fail", "incompatible"),
    ],
)
def test_projection_preserves_rules_coverage_scope_and_removes_nested_notes(
    state, verdict
):
    tower, evaluation = tower_and_evaluation(state)
    for name in ("evaluate_pc", "simulate_pc"):
        projected = project_tool_result(
            name,
            result(
                {"configuration_schema": 2, "data": evaluation.model_dump(mode="json")}
            ),
        )
        data = json.loads(projected.text)
        assert data["projection_version"] == "2"
        assert data["configuration_schema"] == 2
        assert data["data"]["verdict"] == verdict
        assert data["data"]["coverage"] == evaluation.coverage.model_dump(mode="json")
        assert data["data"]["missing_fields"] == list(evaluation.missing_fields)
        assert len(data["data"]["rule_results"]) == 12
        assert data["data"]["scope"] == evaluation.scope.model_dump(mode="json")
        assert "PRIVATE-CONTEXT" not in projected.text
        assert "notes" not in data["data"]["evaluated_configuration"]["context"]
    pc = project_tool_result(
        "get_pc",
        result({"configuration_schema": 2, "data": tower.model_dump(mode="json")}),
    )
    data = json.loads(pc.text)["data"]
    assert len(data["category_status"]) == 9
    assert len(data["lines"]) == len(tower.lines)
    assert data["lines"][0]["line_id"] == str(tower.lines[0].line_id)
    assert "PRIVATE-CONTEXT" not in pc.text


def test_unknown_absent_and_preview_quotes_not_rewritten():
    tower, evaluation = tower_and_evaluation()
    tower.lines = [line for line in tower.lines if line.category != "fan"]
    tower.category_status["fan"] = "unknown"
    pc = json.loads(
        project_tool_result(
            "get_pc",
            result({"configuration_schema": 2, "data": tower.model_dump(mode="json")}),
        ).text
    )
    assert pc["data"]["category_status"]["fan"] == "unknown"
    tower.category_status["fan"] = "absent"
    absent = json.loads(
        project_tool_result(
            "get_pc",
            result({"configuration_schema": 2, "data": tower.model_dump(mode="json")}),
        ).text
    )
    assert absent["data"]["category_status"]["fan"] == "absent"
    quote = {
        "amount": "123.45",
        "status": "stale",
        "observed_at": "2026-10-20T00:00:00Z",
    }
    payload = {
        "pc_id": str(tower.id),
        "pc_revision": 1,
        "objective": "general",
        "budget_ars": "1000.00",
        "mode": "manual_comparison",
        "items": [
            {
                "key": "synthetic",
                "actions": [],
                "evaluation": evaluation.model_dump(mode="json"),
                "benefit": {"status": "unknown"},
                "cost": {"total_ars": None},
                "dependencies": [],
                "offers": [quote],
                "versions": {},
                "status": "requires_verification",
                "missing_fields": ["synthetic"],
            }
        ],
        "missing_fields": [],
        "limitations": ["SYNTHETIC ONLY"],
    }
    projected = project_tool_result(
        "preview_recommendations", result({"configuration_schema": 2, "data": payload})
    )
    decoded = json.loads(projected.text)
    assert decoded["data"]["items"][0]["offers"] == [quote]
    assert "PRIVATE-CONTEXT" not in projected.text


@pytest.mark.parametrize(
    "extra",
    [
        "user_id",
        "owner_id",
        "role",
        "path",
        "source_url",
        "disable_pending",
        "confirmed",
    ],
)
def test_closed_input_rejects_model_authority(extra):
    assert set(INPUTS) == TOOLS
    with pytest.raises(ValueError):
        validate_call(
            "evaluate_pc",
            {
                "pc_id": str(uuid4()),
                "configuration_schema": 2,
                "data": {"expected_pc_revision": 1},
                extra: True,
            },
        )


def test_discriminated_inputs_explicit_tower_and_strict_bounds():
    pc_id = str(uuid4())
    assert (
        validate_call(
            "evaluate_pc", {"pc_id": pc_id, "data": {"expected_pc_revision": 1}}
        ).configuration_schema
        == 1
    )
    assert (
        validate_call(
            "evaluate_pc",
            {
                "pc_id": pc_id,
                "configuration_schema": 2,
                "data": {"expected_pc_revision": 1},
            },
        ).configuration_schema
        == 2
    )
    for value in (True, "2", 3):
        with pytest.raises(ValueError):
            validate_call(
                "evaluate_pc",
                {
                    "pc_id": pc_id,
                    "configuration_schema": value,
                    "data": {"expected_pc_revision": 1},
                },
            )
    for value in (True, 21, 0):
        with pytest.raises(ValueError):
            validate_call("catalog_search", {"page_size": value})
    with pytest.raises(ValueError):
        validate_call(
            "preview_recommendations",
            {
                "pc_id": pc_id,
                "configuration_schema": 2,
                "data": {
                    "expected_pc_revision": 1,
                    "objective": "general",
                    "budget_ars": "1000.00",
                    "price_condition": "cash",
                    "mode": "automatic",
                    "materials": [
                        {
                            "kind": "thermal_compound",
                            "state": "available_confirmed",
                            "confirmed": True,
                        }
                    ],
                },
            },
        )


def test_context_closed_per_turn_and_never_inferred_from_history_text():
    request = MessageCreate.model_validate(
        {
            "content": "SYNTHETIC text",
            "client_request_id": str(uuid4()),
            "context": {
                "context_version": 2,
                "configuration_schema": 2,
                "pc_id": str(uuid4()),
                "expected_pc_revision": 1,
            },
        }
    )
    assert request.context.configuration_schema == 2
    rows = [{"role": "user", "content": '{"owner_id":"fake","context_version":2}'}]
    assert getattr(rows, "context_snapshot", None) is None
    wrapped = TurnHistory(rows, {"context_version": 2})
    assert list(wrapped) == rows
    assert wrapped.context_snapshot == {"context_version": 2}
    for key in ("owner_id", "snapshot", "notes", "source_url"):
        body = request.model_dump(mode="json")
        body["context"][key] = "untrusted"
        with pytest.raises(ValueError):
            MessageCreate.model_validate(body)


def test_catalog_projection_omits_raw_technical_envelopes_but_keeps_paging():
    payload = {
        "dataset_version": "synthetic",
        "total": 691,
        "page": 4,
        "page_size": 1,
        "items": [
            {
                "id": "synthetic-beyond50",
                "category": "storage",
                "name": "SYNTHETIC ONLY",
                "attributes": {
                    "tower_stock_v1": "UNTRUSTED RAW INSTRUCTIONS",
                    "basic_stock_v1": "RAW",
                    "capacity_gb": None,
                },
                "sources": [],
                "prices": [],
                "image": None,
            }
        ],
    }
    projected = project_tool_result("catalog_search", result(payload))
    data = json.loads(projected.text)["data"]
    assert data["total"] == 691 and data["page"] == 4
    assert data["items"][0]["id"] == "synthetic-beyond50"
    assert "UNTRUSTED RAW" not in projected.text
    assert "tower_stock_v1" not in data["items"][0]["attributes"]


def test_complete_projection_overflow_reports_error_not_partial_success():
    _, evaluation = tower_and_evaluation()
    payload = evaluation.model_dump(mode="json")
    payload["warnings"] = ["SYNTHETIC " + "x" * 25000]
    with pytest.raises(ToolFailure, match="tool_output_limit_full_api_required"):
        project_tool_result(
            "evaluate_pc", result({"configuration_schema": 2, "data": payload})
        )


def test_overflow_safe_code_reaches_stream_without_changing_lifecycle():
    statuses = []

    class UnitRepository:
        def finish(self, owner, cid, mid, content, status, citations):
            statuses.append(status)

        def interrupt_pending(self, *args):
            pass

    async def overflow(*args):
        raise ToolFailure("tool_output_limit_full_api_required")

    async def collect():
        service = AssistantService(UnitRepository(), runner=overflow)
        return [
            frame
            async for frame in service.stream(
                uuid4(), uuid4(), uuid4(), "SYNTHETIC-NOT-A-SESSION", []
            )
        ]

    frames = asyncio.run(collect())
    assert statuses == ["failed"]
    assert any(
        '"code": "tool_output_limit_full_api_required"' in frame for frame in frames
    )
    assert not any("event: done" in frame for frame in frames)
