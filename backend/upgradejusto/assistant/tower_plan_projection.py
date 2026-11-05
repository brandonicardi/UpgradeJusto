"""Explicit public-to-owner snapshot allowlist, frozen commercial observations."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, StrictInt, StrictStr

from upgradejusto.compatibility.tower_http_models import TowerEvaluationResponse
from upgradejusto.pcs.tower_models import Tower
from upgradejusto.plans.tower_models import TowerPlanRead

OUTER_KEYS = frozenset(
    {
        "kind",
        "schema_version",
        "id",
        "name",
        "revision",
        "pc_id",
        "created_at",
        "updated_at",
        "snapshot",
    }
)
SNAPSHOT_KEYS = frozenset(
    {
        "generated_at",
        "pc_revision",
        "base_configuration",
        "objective",
        "workload",
        "budget_ars",
        "currency",
        "price_condition",
        "versions",
        "stages",
        "cost",
        "benefit",
        "status",
        "label",
        "missing_fields",
        "limitations",
        "scope",
    }
)
STAGE_KEYS = frozenset(
    {
        "position",
        "name",
        "budget_ars",
        "actions",
        "materials",
        "evaluated_configuration",
        "evaluation",
        "benefit",
        "dependencies",
        "offers",
        "cost",
        "cumulative_cost",
        "status",
        "missing_fields",
        "warnings",
    }
)
VERSION_KEYS = frozenset(
    {
        "catalog",
        "rules",
        "policy",
        "inventory",
        "scope",
        "references",
        "identity",
        "calculation",
    }
)


class Closed(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Stage(Closed):
    position: StrictInt
    name: StrictStr
    budget_ars: StrictStr
    actions: list[dict]
    materials: list[dict]
    evaluated_configuration: Tower
    evaluation: TowerEvaluationResponse
    benefit: dict
    dependencies: list[dict]
    offers: list[dict]
    cost: dict
    cumulative_cost: dict | StrictStr | None
    status: StrictStr
    missing_fields: list[StrictStr]
    warnings: list[StrictStr]


class Snapshot(Closed):
    generated_at: StrictStr
    pc_revision: StrictInt
    base_configuration: Tower
    objective: Literal["general", "gaming", "productivity"]
    workload: Literal["blender-cpu"] | None
    budget_ars: StrictStr
    currency: Literal["ARS"]
    price_condition: Literal["cash", "list"]
    versions: dict[StrictStr, StrictStr]
    stages: list[Stage]
    cost: dict
    benefit: dict
    status: StrictStr
    label: StrictStr
    missing_fields: list[StrictStr]
    limitations: list[StrictStr]
    scope: dict | None = None


def strip_context_notes(value):
    if isinstance(value, dict):
        return {
            key: (
                {k: strip_context_notes(v) for k, v in item.items() if k != "notes"}
                if key == "context" and isinstance(item, dict)
                else strip_context_notes(item)
            )
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [strip_context_notes(item) for item in value]
    return value


def project_plan(raw):
    from .tool_projection import (
        MAX_PLAN_BYTES,
        Projection,
        ToolFailure,
        _evaluation,
        _json,
        _minimal_tower_configuration,
        _summarize_tower_stage_evaluation,
    )

    if set(raw) != {"configuration_schema", "data"}:
        raise ToolFailure("invalid_tool_output")
    validated = TowerPlanRead.model_validate_json(_json(raw["data"])).model_dump(
        mode="json"
    )
    wire = {key: value for key, value in validated.items() if key in OUTER_KEYS}
    snapshot = {
        key: value for key, value in wire["snapshot"].items() if key in SNAPSHOT_KEYS
    }
    snapshot["versions"] = {
        key: value for key, value in snapshot["versions"].items() if key in VERSION_KEYS
    }
    snapshot["stages"] = [
        {key: value for key, value in stage.items() if key in STAGE_KEYS}
        for stage in snapshot["stages"]
    ]
    snapshot = Snapshot.model_validate_json(_json(snapshot)).model_dump(mode="json")
    # Remove from plan-level missing_fields exact prefixed copies already present
    # in each stage. All other plan-level entries are preserved.
    plan_missing = set(snapshot.get("missing_fields", []))
    for stage in snapshot["stages"]:
        position = stage["position"]
        for path in stage.get("missing_fields", []):
            plan_missing.discard(f"stages.{position}.{path}")
    snapshot["missing_fields"] = sorted(plan_missing)
    evidence, urls = [], []
    snapshot["base_configuration"] = _minimal_tower_configuration(
        snapshot["base_configuration"]
    )
    plan_scope = None
    for stage in snapshot["stages"]:
        stage["evaluated_configuration"] = _minimal_tower_configuration(
            stage["evaluated_configuration"]
        )
        _evaluation(stage["evaluation"], evidence, urls)
        if plan_scope is None:
            plan_scope = stage["evaluation"].get("scope")
        stage["evaluation"] = _summarize_tower_stage_evaluation(stage["evaluation"])
    if plan_scope is not None:
        snapshot["scope"] = plan_scope
    wire["snapshot"] = strip_context_notes(snapshot)
    projected = {
        "projection_version": "2",
        "configuration_schema": 2,
        "tool": "get_plan",
        "data": wire,
    }
    text = _json(projected)
    size = len(text.encode("utf-8"))
    if size > MAX_PLAN_BYTES:
        raise ToolFailure("tool_output_limit_full_api_required")
    return Projection(text, size, ())
