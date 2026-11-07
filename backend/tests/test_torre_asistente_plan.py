"""Synthetic frozen plan projection; not a fake production plan service."""

import json
from copy import deepcopy
from uuid import uuid4

import pytest
from test_tower38_assistant_pure import result, tower_and_evaluation

from upgradejusto.assistant.tool_projection import ToolFailure, project_tool_result


def synthetic_plan():
    tower, evaluation = tower_and_evaluation("unknown")
    configuration = tower.model_dump(mode="json")
    quote = {
        "offer_id": "SYNTHETIC-FROZEN",
        "store": "compragamer",
        "product_id": "synthetic",
        "component_id": "synthetic",
        "variant_key": "synthetic",
        "amount": "123.45",
        "currency": "ARS",
        "condition": "cash",
        "availability": "unknown",
        "stock_quantity": None,
        "source_url": "https://example.org/synthetic-frozen-quote",
        "observed_at": "2025-01-01T00:00:00Z",
        "expires_at": "2025-01-02T00:00:00Z",
        "status": "fresh",
    }
    stage = {
        "position": 1,
        "name": "SYNTHETIC ONLY",
        "budget_ars": "1000.00",
        "actions": [],
        "materials": [],
        "evaluated_configuration": configuration,
        "evaluation": evaluation.model_dump(mode="json"),
        "benefit": {"status": "unknown"},
        "dependencies": [],
        "offers": [quote],
        "cost": {"total_ars": "123.45"},
        "cumulative_cost": {"total_ars": "123.45"},
        "status": "requires_verification",
        "missing_fields": ["SYNTHETIC unknown"],
        "warnings": ["SYNTHETIC ONLY"],
        "private_future_field": "PRIVATE-PLAN-NORMALIZED-INPUT",
    }
    snapshot = {
        "generated_at": "2025-01-01T00:00:00Z",
        "pc_revision": 1,
        "base_configuration": configuration,
        "objective": "general",
        "workload": None,
        "budget_ars": "1000.00",
        "currency": "ARS",
        "price_condition": "cash",
        "versions": {
            "catalog": "synthetic-frozen-old",
            "rules": evaluation.rules_version,
            "policy": "synthetic",
            "inventory": "synthetic",
            "scope": "synthetic",
            "references": "synthetic",
            "identity": "synthetic",
            "calculation": "synthetic",
            "private_future_version": "PRIVATE-PLAN-NORMALIZED-INPUT",
        },
        "stages": [stage],
        "cost": {"total_ars": "123.45"},
        "benefit": {"status": "unknown"},
        "status": "requires_verification",
        "label": "SYNTHETIC not ready",
        "missing_fields": ["SYNTHETIC unknown"],
        "limitations": ["SYNTHETIC ONLY"],
        "normalized_input": {"context": {"notes": "PRIVATE-PLAN-NORMALIZED-INPUT"}},
    }
    return {
        "kind": "tower_plan",
        "schema_version": 2,
        "id": str(uuid4()),
        "name": "SYNTHETIC frozen private plan",
        "revision": 1,
        "pc_id": str(tower.id),
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "snapshot": snapshot,
    }


def test_plan_allowlist_all_three_notes_paths_and_frozen_quotes():
    plan = synthetic_plan()
    before = deepcopy(plan)
    projected = project_tool_result(
        "get_plan", result({"configuration_schema": 2, "data": plan})
    )
    decoded = json.loads(projected.text)
    snapshot = decoded["data"]["snapshot"]
    assert decoded["projection_version"] == "2"
    assert decoded["data"]["kind"] == "tower_plan"
    assert "PRIVATE-CONTEXT" not in projected.text
    assert "PRIVATE-PLAN-NORMALIZED-INPUT" not in projected.text
    assert "normalized_input" not in snapshot
    assert "private_future_field" not in snapshot["stages"][0]
    assert "notes" not in snapshot["base_configuration"]["context"]
    assert "notes" not in snapshot["stages"][0]["evaluated_configuration"]["context"]
    assert "evaluated_configuration" not in snapshot["stages"][0]["evaluation"]
    assert snapshot["stages"][0]["offers"] == before["snapshot"]["stages"][0]["offers"]
    assert snapshot["stages"][0]["evaluation"]["verdict"] == "requiere_verificacion"
    assert snapshot["stages"][0]["missing_fields"]
    assert snapshot["scope"] == before["snapshot"]["stages"][0]["evaluation"]["scope"]
    evaluation = snapshot["stages"][0]["evaluation"]
    assert evaluation["reglas_ok"] == sum(
        1
        for r in before["snapshot"]["stages"][0]["evaluation"]["rule_results"]
        if r["state"] == "pass"
    )
    assert len(evaluation["rule_results"]) == sum(
        1
        for r in before["snapshot"]["stages"][0]["evaluation"]["rule_results"]
        if r["state"] in ("fail", "unknown")
    )
    for rule in evaluation["rule_results"]:
        if rule["state"] == "fail":
            source = next(
                r
                for r in before["snapshot"]["stages"][0]["evaluation"]["rule_results"]
                if r["rule_id"] == rule["rule_id"]
            )
            assert rule == {k: v for k, v in source.items() if k != "evidence"}
        else:
            assert rule == {"rule_id": rule["rule_id"], "state": rule["state"]}
    assert snapshot["versions"]["catalog"] == "synthetic-frozen-old"
    assert plan == before


def test_plan_stages_are_not_silently_sliced_to_fit_projection():
    plan = synthetic_plan()
    plan["snapshot"]["stages"] = [
        deepcopy(plan["snapshot"]["stages"][0]) for _ in range(8)
    ]
    with pytest.raises(ToolFailure, match="tool_output_limit_full_api_required"):
        project_tool_result(
            "get_plan", result({"configuration_schema": 2, "data": plan})
        )
