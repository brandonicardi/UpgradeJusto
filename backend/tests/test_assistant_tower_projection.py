"""Tower projection regression tests for plan and preview trimming."""

import json
from uuid import uuid4

from test_tower38_assistant_pure import result, tower_and_evaluation

from upgradejusto.assistant.tool_projection import MAX_TOOL_BYTES, project_tool_result


def test_tower_plan_stage_missing_fields_reconstruct_exactly():
    tower, evaluation = tower_and_evaluation("unknown")
    stage_missing = ["stage.only.missing", "shared.missing"]
    plan_missing = [
        "plan.only.missing",
        "stages.1.shared.missing",
        "stages.1.stage.only.missing",
    ]
    raw = {
        "configuration_schema": 2,
        "data": {
            "kind": "tower_plan",
            "schema_version": 2,
            "id": str(uuid4()),
            "name": "Fixture plan",
            "revision": 1,
            "pc_id": str(tower.id),
            "created_at": "2026-10-25T00:00:00Z",
            "updated_at": "2026-10-25T00:00:00Z",
            "snapshot": {
                "generated_at": "2026-10-25T00:00:00Z",
                "pc_revision": tower.revision,
                "base_configuration": tower.model_dump(mode="json"),
                "objective": "general",
                "workload": None,
                "budget_ars": "1000.00",
                "currency": "ARS",
                "price_condition": "cash",
                "versions": {
                    "catalog": "v1",
                    "rules": "v1",
                    "policy": "v1",
                    "inventory": "v1",
                    "scope": "v1",
                    "references": "v1",
                    "identity": "v1",
                    "calculation": "v1",
                },
                "stages": [
                    {
                        "position": 1,
                        "name": "Etapa fixture",
                        "budget_ars": "500.00",
                        "actions": [],
                        "materials": [],
                        "evaluated_configuration": tower.model_dump(mode="json"),
                        "evaluation": evaluation.model_dump(mode="json"),
                        "benefit": {"status": "unknown"},
                        "dependencies": [],
                        "offers": [],
                        "cost": {"total_ars": None},
                        "cumulative_cost": {"total_ars": None},
                        "status": "blocked",
                        "missing_fields": stage_missing,
                        "warnings": ["stage.warning"],
                    }
                ],
                "cost": {"total_ars": None},
                "benefit": {"status": "unknown"},
                "status": "blocked",
                "label": "fixture",
                "missing_fields": plan_missing,
                "limitations": [],
                "scope": evaluation.scope.model_dump(mode="json"),
            },
        },
    }
    projected = project_tool_result("get_plan", result(raw))
    data = json.loads(projected.text)["data"]
    stage = data["snapshot"]["stages"][0]
    assert stage["missing_fields"] == stage_missing
    reconstructed = set(data["snapshot"]["missing_fields"]) | {
        f"stages.{stage['position']}.{path}" for path in stage["missing_fields"]
    }
    assert reconstructed == set(plan_missing)
    assert projected.byte_count <= 8000


def test_tower_preview_orders_incompatible_first_and_trims_whole_items():
    from upgradejusto.compatibility.models import Coverage
    from upgradejusto.compatibility.observations import EvidenceRef
    from upgradejusto.compatibility.tower_contract import TowerRuleResult, TowerScope
    from upgradejusto.compatibility.tower_http_models import TowerEvaluationResponse

    tower, _ = tower_and_evaluation("pass")
    ref = EvidenceRef(
        source_id="synthetic",
        url="https://example.org/synthetic",
        locator="x",
        consulted_on="2026-10-25",
    )

    def make_evaluation(verdict):
        if verdict == "compatible":
            rules = (
                TowerRuleResult(
                    rule_id="T01", family="T01", state="pass", evidence=(ref,)
                ),
            )
            coverage = Coverage(
                required=("T01",),
                implemented=("T01",),
                evaluated=("T01",),
                passed=("T01",),
                failed=(),
                unknown=(),
                not_applicable=(),
                not_implemented=(),
                complete=True,
            )
        elif verdict == "incompatible":
            rules = (
                TowerRuleResult(
                    rule_id="T01", family="T01", state="fail", evidence=(ref,)
                ),
            )
            coverage = Coverage(
                required=("T01",),
                implemented=("T01",),
                evaluated=("T01",),
                passed=(),
                failed=("T01",),
                unknown=(),
                not_applicable=(),
                not_implemented=(),
                complete=False,
            )
        else:
            rules = (
                TowerRuleResult(
                    rule_id="T01",
                    family="T01",
                    state="unknown",
                    missing_fields=("price",),
                ),
            )
            coverage = Coverage(
                required=("T01",),
                implemented=("T01",),
                evaluated=("T01",),
                passed=(),
                failed=(),
                unknown=("T01",),
                not_applicable=(),
                not_implemented=(),
                complete=False,
            )
        return TowerEvaluationResponse(
            verdict=verdict,
            rule_results=rules,
            missing_fields=(),
            rules_version="cu05-tower-stock-engine-1",
            data_revision="synthetic",
            pc_revision="1",
            scope=TowerScope(),
            coverage=coverage,
            additional_checks=(),
            warnings=(),
            evaluated_configuration=tower,
        )

    def make_item(key, evaluation, verdict):
        return {
            "key": key,
            "actions": [],
            "evaluation": evaluation.model_dump(mode="json"),
            "benefit": {"status": "unknown"},
            "cost": {"total_ars": None},
            "dependencies": [],
            "offers": [],
            "versions": {},
            "status": "recommended" if verdict == "compatible" else "rejected",
            "missing_fields": ["price.unknown"],
        }

    items = [
        make_item("compatible-1", make_evaluation("compatible"), "compatible"),
        make_item("incompatible-1", make_evaluation("incompatible"), "incompatible"),
        make_item("compatible-2", make_evaluation("compatible"), "compatible"),
        make_item("incompatible-2", make_evaluation("incompatible"), "incompatible"),
        make_item(
            "unknown-1",
            make_evaluation("requiere_verificacion"),
            "requiere_verificacion",
        ),
        make_item("compatible-3", make_evaluation("compatible"), "compatible"),
    ]
    payload = {
        "pc_id": str(tower.id),
        "pc_revision": tower.revision,
        "objective": "general",
        "budget_ars": "1000.00",
        "mode": "manual_comparison",
        "items": items,
        "missing_fields": [],
        "limitations": ["Order fixture"],
    }
    projected = project_tool_result(
        "preview_recommendations", result({"configuration_schema": 2, "data": payload})
    )
    data = json.loads(projected.text)["data"]
    assert projected.byte_count <= MAX_TOOL_BYTES
    verdicts = [item["evaluation"]["verdict"] for item in data["items"]]
    assert verdicts[0] == "incompatible"
    assert verdicts[1] == "incompatible"
    assert data["mas_resultados"] == len(items) - len(data["items"])
