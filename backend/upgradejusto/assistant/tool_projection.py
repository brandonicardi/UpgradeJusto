"""Schema-authorized, bounded projection of trusted read-only MCP results.

Never apply this parser to user messages. References are presentation IDs only,
not authority, instructions, or a second compatibility decision.
"""

import json
from dataclasses import dataclass
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, ValidationError

from upgradejusto.catalog.models import ComponentPage
from upgradejusto.compatibility.http_models import EvaluationResponse
from upgradejusto.pcs.models import PC
from upgradejusto.plans.models import Plan
from upgradejusto.recommendations.models import PreviewResponse

MAX_TOOL_BYTES = 24_000
MAX_INPUT_BYTES = 2_000_000
MAX_NODES = 50_000
MAX_DEPTH = 24


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


def project_tool_result(name, result):
    """Return complete projected JSON or a bounded fixed-code ToolFailure.

    No partial success: rule states, facts, conditions, missing fields, coverage
    and versions survive. Oversize reports require the full API, never slicing.
    """
    if name not in SCHEMAS:
        raise ToolFailure("unknown_tool")
    try:
        raw = _payload(result)
        # Validate as JSON transport: strict domain tuples legitimately arrive as
        # JSON arrays. This does not enable Python scalar coercions/strict=False.
        data = SCHEMAS[name].model_validate_json(_json(raw)).model_dump(mode="json")
        evidence, urls = [], []
        citations = ()
        if name in {"evaluate_pc", "simulate_pc"}:
            _evaluation(data, evidence, urls)
        elif name == "get_pc":
            _configuration(data)
        elif name == "preview_recommendations":
            if len(data["items"]) > 20:
                raise ToolFailure("tool_output_limit_full_api_required")
            for item in data["items"]:
                _evaluation(item["evaluation"], evidence, urls)
        elif name == "get_plan":
            _configuration(data["base_snapshot"])
            for stage in data["stages"]:
                _configuration(stage["evaluated_configuration"])
                _evaluation(stage["evaluation"], evidence, urls)
        elif name == "search_public_docs":
            if len(data["citations"]) > 5:
                raise ToolFailure("tool_output_limit_full_api_required")
            for citation in data["citations"]:
                _url(citation["url"], canonical=True)
            citations = tuple(data["citations"])
        envelope = {"projection_version": "1", "tool": name, "data": data}
        if evidence:
            envelope.update(evidence=evidence, source_urls=urls)
        text = _json(envelope)
        count = len(text.encode("utf-8"))
        if count > MAX_TOOL_BYTES:
            raise ToolFailure("tool_output_limit_full_api_required")
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
