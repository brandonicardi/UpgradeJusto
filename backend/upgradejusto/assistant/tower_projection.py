"""Typed tower-only MCP projection; complete semantics or explicit size failure."""

import copy
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
        _set_mas_resultados,
        _sort_by_verdict,
        _summarize_tower_evaluation,
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
        data = _summarize_tower_evaluation(data)
    else:
        if len(data["items"]) > 20:
            raise ToolFailure("tool_output_limit_full_api_required")
        items = _sort_by_verdict(data["items"], ["evaluation", "verdict"])
        for count in range(len(items), 0, -1):
            candidate = copy.deepcopy(data)
            candidate["items"] = copy.deepcopy(items[:count])
            candidate_evidence, candidate_urls = [], []
            for item in candidate["items"]:
                _evaluation(item["evaluation"], candidate_evidence, candidate_urls)
                item["evaluation"] = _summarize_tower_evaluation(item["evaluation"])
            _set_mas_resultados(candidate, len(items) - count)
            projected = {
                "projection_version": "2",
                "configuration_schema": 2,
                "tool": name,
                "data": candidate,
            }
            text = _json(projected)
            size = len(text.encode("utf-8"))
            if size <= MAX_TOOL_BYTES:
                return Projection(text, size, ())
        raise ToolFailure("tool_output_limit_full_api_required")
    projected = {
        "projection_version": "2",
        "configuration_schema": 2,
        "tool": name,
        "data": data,
    }
    text = _json(projected)
    size = len(text.encode("utf-8"))
    if size > MAX_TOOL_BYTES:
        raise ToolFailure("tool_output_limit_full_api_required")
    return Projection(text, size, ())
