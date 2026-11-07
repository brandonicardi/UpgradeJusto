"""Schema-authorized, bounded projection of trusted read-only MCP results.

Never apply this parser to user messages. References are presentation IDs only,
not authority, instructions, or a second compatibility decision.
"""

import copy
import json
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, ValidationError

from upgradejusto.catalog.models import ComponentPage
from upgradejusto.compatibility.http_models import EvaluationResponse
from upgradejusto.pcs.models import PC
from upgradejusto.plans.models import Plan
from upgradejusto.recommendations.models import PreviewResponse

MAX_TOOL_BYTES = 6_000
MAX_PLAN_BYTES = 9_000
MAX_INPUT_BYTES = 2_000_000
MAX_NODES = 50_000
MAX_DEPTH = 24

_VERDICT_ORDER = {"incompatible": 0, "requiere_verificacion": 1, "compatible": 2}


class ToolFailure(Exception):
    """Fixed safe codes only; never includes tool data or validation inputs."""


class Citation(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    source_id: str
    url: str
    title: str
    locator: str
    excerpt: str
    revision: str
    scope: Literal["exact", "family", "general"] = "general"


class Documents(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    citations: list[Citation]


SCHEMAS = {
    "catalog_search": ComponentPage,
    "get_pc": PC,
    "evaluate_pc": EvaluationResponse,
    "simulate_pc": EvaluationResponse,
    "preview_recommendations": PreviewResponse,
    "get_plan": Plan,
    "search_public_docs": Documents,
}


@dataclass(frozen=True)
class Projection:
    text: str
    byte_count: int
    citations: tuple[dict, ...]


def _json(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def _bounds(value):
    stack = [(value, 0)]
    nodes = 0
    while stack:
        item, depth = stack.pop()
        nodes += 1
        if nodes > MAX_NODES or depth > MAX_DEPTH:
            raise ToolFailure("tool_output_limit_full_api_required")
        if isinstance(item, dict):
            if any(not isinstance(k, str) for k in item):
                raise ToolFailure("invalid_tool_output")
            stack.extend((v, depth + 1) for v in item.values())
        elif isinstance(item, list):
            stack.extend((v, depth + 1) for v in item)
        elif item is not None and type(item) not in (str, int, float, bool):
            raise ToolFailure("invalid_tool_output")
    if len(_json(value).encode("utf-8")) > MAX_INPUT_BYTES:
        raise ToolFailure("tool_output_limit_full_api_required")


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key")
        result[key] = value
    return result


def _payload(result):
    if result.is_error:
        raise ToolFailure("tool_failed")
    if result.structured_content is not None:
        value = result.structured_content
    else:
        # SDK fallback: exactly one trusted MCP text block containing one object.
        blocks = result.content
        if len(blocks) != 1 or blocks[0].type != "text":
            raise ToolFailure("invalid_tool_output")
        text = blocks[0].text
        if len(text.encode("utf-8")) > MAX_INPUT_BYTES:
            raise ToolFailure("tool_output_limit_full_api_required")
        value = json.loads(text, object_pairs_hook=_unique_object)
    if not isinstance(value, dict):
        raise ToolFailure("invalid_tool_output")
    _bounds(value)
    return value


def _url(value, *, canonical=False):
    parsed = urlsplit(value)
    if (
        len(value.encode("utf-8")) > 2048
        or parsed.scheme not in ("http", "https")
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or (canonical and (parsed.scheme != "https" or parsed.fragment))
        or any(ord(c) < 33 for c in value)
    ):
        raise ToolFailure("invalid_tool_output")


def _configuration(data):
    data["context"].pop("notes", None)


def _evaluation(data, evidence, urls):
    _configuration(data["evaluated_configuration"])
    records = [(rule, "evidence") for rule in data["rule_results"]]
    records.extend(
        (check, "evidence_refs") for check in data.get("additional_checks", [])
    )
    for rule, evidence_key in records:
        refs = []
        for ref in rule.pop(evidence_key):
            # Only validated RuleResult/AdditionalCheck evidence grants reference status.
            _url(ref["url"])
            url = ref.pop("url")
            if url not in urls:
                urls.append(url)
            ref["url_ref"] = urls.index(url)
            if ref not in evidence:
                evidence.append(ref)
            index = evidence.index(ref)
            if index not in refs:
                refs.append(index)
        rule["evidence_refs"] = refs


def _sort_by_verdict(items, path):
    def verdict(item):
        value = item
        for key in path:
            value = value[key]
        return _VERDICT_ORDER.get(value, 3)

    return [
        item
        for _, item in sorted(
            enumerate(items),
            key=lambda pair: (verdict(pair[1]), pair[0]),
        )
    ]


def _set_mas_resultados(candidate, remaining):
    if remaining:
        candidate["mas_resultados"] = remaining
    else:
        candidate.pop("mas_resultados", None)


def _compact_catalog(data):
    return {
        **data,
        "items": [
            {
                "id": component["id"],
                "category": component["category"],
                "name": component["name"],
                "attributes": {
                    key: value
                    for key, value in component.get("attributes", {}).items()
                    if key not in {"tower_stock_v1", "basic_stock_v1"}
                },
                "offers": [
                    {
                        "store": offer["store"],
                        "amount": offer["amount"],
                        "currency": offer["currency"],
                        "observed_at": offer["observed_at"],
                        "status": offer["status"],
                    }
                    for offer in component.get("offers", [])
                ],
            }
            for component in data.get("items", [])
        ],
    }


def _catalog_candidates(data):
    compact = _compact_catalog(data)
    items = compact["items"]
    for count in range(len(items), -1, -1):
        candidate = copy.deepcopy(compact)
        candidate["items"] = copy.deepcopy(items[:count])
        _set_mas_resultados(candidate, len(items) - count)
        yield candidate


def _compact_tower_configuration(evaluated):
    """Keep identity, presence, declared selection and context; drop notes."""
    _configuration(evaluated)
    return {
        "id": evaluated.get("id"),
        "name": evaluated.get("name"),
        "revision": evaluated.get("revision"),
        "category_status": evaluated.get("category_status", {}),
        "lines": [
            {
                "line_id": line.get("line_id"),
                "category": line.get("category"),
                "component_id": line.get("component_id"),
                "declared_model": line.get("declared_model"),
                "quantity": line.get("quantity"),
            }
            for line in evaluated.get("lines", [])
        ],
        "context": evaluated.get("context", {}),
    }


def _minimal_tower_configuration(evaluated):
    """Context-only tower configuration; used when full selection does not fit."""
    _configuration(evaluated)
    return {"context": evaluated.get("context", {})}


def _without_evidence(rule):
    return {k: v for k, v in rule.items() if k not in ("evidence", "evidence_refs")}


def _summarize_rule_results(rule_results):
    summarized = []
    for rule in rule_results:
        state = rule.get("state")
        if state == "fail":
            summarized.append(_without_evidence(rule))
        elif state in ("unknown", "not_implemented"):
            summarized.append({"rule_id": rule["rule_id"], "state": state})
    return summarized


def _summarize_additional_checks(additional_checks):
    return [
        _without_evidence(check)
        for check in additional_checks
        if check.get("status") in ("fail", "unknown")
    ]


def _summarize_evaluation(
    data,
    *,
    include_missing_fields=True,
    include_warnings=True,
    include_scope=True,
    include_revisions=True,
):
    """Model-facing summary: never hide a fail/unknown, never send evidence/URLs."""
    summary = {"verdict": data["verdict"], "coverage": data["coverage"]}
    if include_missing_fields:
        summary["missing_fields"] = data.get("missing_fields", [])
    if include_revisions:
        summary["pc_revision"] = data["pc_revision"]
        summary["data_revision"] = data["data_revision"]
        summary["rules_version"] = data["rules_version"]
    if include_warnings and "warnings" in data:
        summary["warnings"] = data["warnings"]
    if include_scope:
        scope = data.get("scope")
        if scope is not None:
            summary["scope"] = scope
    rule_results = data.get("rule_results", [])
    summary["rule_results"] = _summarize_rule_results(rule_results)
    summary["reglas_ok"] = sum(
        1 for rule in rule_results if rule.get("state") == "pass"
    )
    summary["reglas_no_aplican"] = sum(
        1 for rule in rule_results if rule.get("state") == "not_applicable"
    )
    summary["additional_checks"] = _summarize_additional_checks(
        data.get("additional_checks", [])
    )
    summary["chequeos_fuera_de_alcance"] = sum(
        1
        for check in data.get("additional_checks", [])
        if check.get("status") == "outside_scope"
    )
    return summary


def _summarize_tower_evaluation(data):
    """Tower-facing summary: preserves verdict/facts/scope, compacts configuration."""
    summary = {
        "verdict": data["verdict"],
        "missing_fields": data.get("missing_fields", []),
        "coverage": data["coverage"],
        "scope": data.get("scope"),
        "pc_revision": data["pc_revision"],
        "data_revision": data["data_revision"],
        "rules_version": data["rules_version"],
    }
    if "warnings" in data:
        summary["warnings"] = data["warnings"]
    rule_results = data.get("rule_results", [])
    summary["rule_results"] = _summarize_rule_results(rule_results)
    summary["reglas_ok"] = sum(
        1 for rule in rule_results if rule.get("state") == "pass"
    )
    summary["reglas_no_aplican"] = sum(
        1 for rule in rule_results if rule.get("state") == "not_applicable"
    )
    summary["additional_checks"] = _summarize_additional_checks(
        data.get("additional_checks", [])
    )
    summary["chequeos_fuera_de_alcance"] = sum(
        1
        for check in data.get("additional_checks", [])
        if check.get("status") == "outside_scope"
    )
    evaluated = data.get("evaluated_configuration")
    if evaluated is not None:
        summary["evaluated_configuration"] = _compact_tower_configuration(evaluated)
    return summary


def _summarize_tower_stage_evaluation(data):
    """Plan-stage summary: only verdict, coverage, rules/checks and counters."""
    rule_results = data.get("rule_results", [])
    return {
        "verdict": data["verdict"],
        "coverage": data["coverage"],
        "rule_results": _summarize_rule_results(rule_results),
        "reglas_ok": sum(1 for rule in rule_results if rule.get("state") == "pass"),
        "reglas_no_aplican": sum(
            1 for rule in rule_results if rule.get("state") == "not_applicable"
        ),
        "additional_checks": _summarize_additional_checks(
            data.get("additional_checks", [])
        ),
        "chequeos_fuera_de_alcance": sum(
            1
            for check in data.get("additional_checks", [])
            if check.get("status") == "outside_scope"
        ),
    }


def _envelope(name, data):
    return {"projection_version": "1", "tool": name, "data": data}


def _fit_summary(name, summary):
    text = _json(_envelope(name, summary))
    count = len(text.encode("utf-8"))
    if count > MAX_TOOL_BYTES:
        raise ToolFailure("tool_output_limit_full_api_required")
    return text, count


def _fit_catalog(data):
    for candidate in _catalog_candidates(data):
        text = _json(_envelope("catalog_search", candidate))
        count = len(text.encode("utf-8"))
        if count <= MAX_TOOL_BYTES:
            return text, count
    raise ToolFailure("tool_output_limit_full_api_required")


def _fit_preview(data):
    data = copy.deepcopy(data)
    items = _sort_by_verdict(data["items"], ["evaluation", "verdict"])
    for count in range(len(items), 0, -1):
        candidate = copy.deepcopy(data)
        candidate["items"] = copy.deepcopy(items[:count])
        for item in candidate["items"]:
            item["evaluation"] = _summarize_evaluation(item["evaluation"])
        _set_mas_resultados(candidate, len(items) - count)
        text = _json(_envelope("preview_recommendations", candidate))
        byte_count = len(text.encode("utf-8"))
        if byte_count <= MAX_TOOL_BYTES:
            return text, byte_count
    raise ToolFailure("tool_output_limit_full_api_required")


def _fit_plan(data):
    data = copy.deepcopy(data)
    _configuration(data["base_snapshot"])
    for stage in data["stages"]:
        _configuration(stage["evaluated_configuration"])
        stage["evaluation"] = _summarize_evaluation(stage["evaluation"])
    text = _json(_envelope("get_plan", data))
    byte_count = len(text.encode("utf-8"))
    if byte_count <= MAX_PLAN_BYTES:
        return text, byte_count
    raise ToolFailure("tool_output_limit_full_api_required")


def _simple_projection(name, data, citations=()):
    text = _json(_envelope(name, data))
    count = len(text.encode("utf-8"))
    if count > MAX_TOOL_BYTES:
        raise ToolFailure("tool_output_limit_full_api_required")
    return Projection(text=text, byte_count=count, citations=citations)


def validated_payload(name, result):
    """Trusted raw payload validated by the same closed schemas as projection.

    Returns JSON-mode data (schema 1) or the tower wrapper's data (schema 2).
    Raises the same fixed codes as `project_tool_result`; it never projects or
    truncates, so callers that only collect evidence can treat any failure as
    "no evidence". Tool data and model arguments never become instructions here.
    """
    if name not in SCHEMAS:
        raise ToolFailure("unknown_tool")
    raw = _payload(result)
    if "configuration_schema" in raw:
        if (
            type(raw["configuration_schema"]) is not int
            or raw["configuration_schema"] != 2
        ):
            raise ToolFailure("invalid_tool_output")
        from .tower_projection import WRAPPERS

        if name not in WRAPPERS:
            raise ToolFailure("invalid_tool_output")
        wrapper = WRAPPERS[name].model_validate_json(_json(raw))
        return wrapper.data.model_dump(mode="json")
    return SCHEMAS[name].model_validate_json(_json(raw)).model_dump(mode="json")


def project_tool_result(name, result):
    """Return complete projected JSON or a bounded fixed-code ToolFailure.

    No partial success: rule states, facts, conditions, missing fields, coverage
    and versions survive; tower previews keep failed/unknown coverage but drop
    redundant lists and versions. Oversize reports require the full API, never slicing.
    """
    if name not in SCHEMAS:
        raise ToolFailure("unknown_tool")
    try:
        raw = _payload(result)
        if "configuration_schema" in raw:
            if (
                type(raw["configuration_schema"]) is not int
                or raw["configuration_schema"] != 2
            ):
                raise ToolFailure("invalid_tool_output")
            from .tower_projection import project_tower

            return project_tower(name, raw)
        # Validate as JSON transport: strict domain tuples legitimately arrive as
        # JSON arrays. This does not enable Python scalar coercions/strict=False.
        data = SCHEMAS[name].model_validate_json(_json(raw)).model_dump(mode="json")
        citations = ()
        if name in {"evaluate_pc", "simulate_pc"}:
            text, count = _fit_summary(name, _summarize_evaluation(data))
        elif name == "get_pc":
            _configuration(data)
            return _simple_projection(name, data)
        elif name == "preview_recommendations":
            if len(data["items"]) > 20:
                raise ToolFailure("tool_output_limit_full_api_required")
            text, count = _fit_preview(data)
        elif name == "get_plan":
            text, count = _fit_plan(data)
        elif name == "search_public_docs":
            if len(data["citations"]) > 5:
                raise ToolFailure("tool_output_limit_full_api_required")
            for citation in data["citations"]:
                _url(citation["url"], canonical=True)
            citations = tuple(data["citations"])
            return _simple_projection(name, data, citations=citations)
        elif name == "catalog_search":
            text, count = _fit_catalog(data)
        else:
            raise ToolFailure("unknown_tool")
        return Projection(text=text, byte_count=count, citations=citations)
    except ToolFailure:
        raise
    except (
        ValidationError,
        ValueError,
        TypeError,
        KeyError,
        RecursionError,
        UnicodeError,
    ):
        raise ToolFailure("invalid_tool_output") from None
