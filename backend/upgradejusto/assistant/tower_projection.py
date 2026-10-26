"""Typed tower-only MCP projection; complete semantics or explicit size failure."""

from typing import Literal

from pydantic import BaseModel, ConfigDict

from upgradejusto.compatibility.tower_http_models import TowerEvaluationResponse
from upgradejusto.pcs.tower_models import Tower
from upgradejusto.recommendations.tower_models import TowerPreviewResponse


class Closed(BaseModel):
    model_config = ConfigDict(extra="forbid")
    configuration_schema: Literal[2]


class TowerPCResult(Closed):
    data: Tower


class TowerEvaluationResult(Closed):
    data: TowerEvaluationResponse


class TowerPreviewResult(Closed):
    data: TowerPreviewResponse


WRAPPERS = {
    "get_pc": TowerPCResult,
    "evaluate_pc": TowerEvaluationResult,
    "simulate_pc": TowerEvaluationResult,
    "preview_recommendations": TowerPreviewResult,
}


def project_tower(name, raw):
    # Local import avoids a module cycle; only called after common payload bounds.
    from .tool_projection import (
        MAX_TOOL_BYTES,
        Projection,
        ToolFailure,
        _configuration,
        _evaluation,
        _json,
    )

    if name == "get_plan":
        from .tower_plan_projection import project_plan

        return project_plan(raw)
    if name not in WRAPPERS:
        raise ToolFailure("invalid_tool_output")
    data = WRAPPERS[name].model_validate_json(_json(raw)).data.model_dump(mode="json")
    evidence, urls = [], []
    if name == "get_pc":
        _configuration(data)
    elif name in {"evaluate_pc", "simulate_pc"}:
        _evaluation(data, evidence, urls)
    else:
        if len(data["items"]) > 20:
            raise ToolFailure("tool_output_limit_full_api_required")
        for item in data["items"]:
            _evaluation(item["evaluation"], evidence, urls)
    projected = {
        "projection_version": "2",
        "configuration_schema": 2,
        "tool": name,
        "data": data,
    }
    if evidence:
        projected.update(evidence=evidence, source_urls=urls)
    text = _json(projected)
    size = len(text.encode("utf-8"))
    if size > MAX_TOOL_BYTES:
        raise ToolFailure("tool_output_limit_full_api_required")
    return Projection(text, size, ())
