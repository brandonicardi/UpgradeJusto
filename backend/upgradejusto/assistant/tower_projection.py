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


REDUNDANT_SOURCE_FIELDS = (
    "raw_sha256",
    "raw_url",
    "method_url",
    "identity_version",
    "identity_kind",
    "identity_source_url",
    "matched_mpn",
)
REDUNDANT_COVERAGE_FIELDS = ("implemented", "evaluated", "passed")
REDUNDANT_OFFER_FIELDS = ("offer_id", "variant_key", "product_id")


def _compact_preview_item(item):
    """Keep what the model must explain; every proposal is billed by provider tokens.

    Verdict, missing fields, scope, failed/unknown rules, actions, cost, offers,
    source, unit and limitations stay. `reglas_ok` already counts passed rules.
    """
    evaluation = item["evaluation"]
    # Base PC is in the turn context; actions describe the replacement.
    evaluation.pop("evaluated_configuration", None)
    # Opaque revision hashes: the model can neither explain nor use them.
    evaluation.pop("data_revision", None)
    item.pop("versions", None)
    for field in REDUNDANT_COVERAGE_FIELDS:
        evaluation["coverage"].pop(field, None)
    if evaluation.get("warnings") == evaluation["scope"].get("excludes"):
        evaluation.pop("warnings")
    for source in item["benefit"].get("source", []):
        if isinstance(source, dict):
            for field in REDUNDANT_SOURCE_FIELDS:
                source.pop(field, None)
    for offer in item["offers"]:
        for field in REDUNDANT_OFFER_FIELDS:
            offer.pop(field, None)
        # Ready-made: small models drop the date when they must compose it.
        if all(
            offer.get(key) for key in ("amount", "currency", "store", "observed_at")
        ):
            offer["price_citation"] = (
                f"{offer['amount']} {offer['currency']} por unidad en {offer['store']}, "
                f"precio visto el {offer['observed_at'][:10]}"
            )
    for line in item["cost"].get("lines", []):
        line.pop("offer_id", None)


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
        # Automatic service order already ranks useful proposals. Reordering by
        # verdict would show an unpriced alternative before the recommended one.
        items = (
            data["items"]
            if data["mode"] == "automatic"
            else _sort_by_verdict(data["items"], ["evaluation", "verdict"])
        )
        for count in range(len(items), -1 if not items else 0, -1):
            candidate = copy.deepcopy(data)
            candidate["items"] = copy.deepcopy(items[:count])
            candidate_evidence, candidate_urls = [], []
            for item in candidate["items"]:
                _evaluation(item["evaluation"], candidate_evidence, candidate_urls)
                item["evaluation"] = _summarize_tower_evaluation(item["evaluation"])
                _compact_preview_item(item)
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
