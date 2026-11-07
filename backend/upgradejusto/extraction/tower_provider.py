"""Existing Groq composition, closed nine-category observations, no tools/retries."""

import asyncio
import json

from langsmith import tracing_context

from upgradejusto.assistant.provider import extraction_model as model
from upgradejusto.assistant.provider import extraction_seconds, http_client
from upgradejusto.extraction.tower_context import prepare_context
from upgradejusto.extraction.tower_models import TowerProviderProposal
from upgradejusto.pcs.service import PCError

# gpt-oss-20b rejects json_schema (strict and non-strict) with HTTP 400
# json_validate_failed; keep the supported JSON mode without retries.
TOWER_RESPONSE_FORMAT = {"type": "json_object"}
MAX_ABSENCE_EXCERPT = 100
COUNTED_CATEGORIES = {"ram", "storage", "fan"}


def _unique_object(pairs):
    output = {}
    for key, value in pairs:
        if key in output:
            raise ValueError("Duplicate extraction JSON key")
        output[key] = value
    return output


def withdraw_unproved(raw):
    """Drop claims the rules would reject, so one overreach does not sink the list.

    Only ever removes: a count without its literal marker becomes unknown, an
    oversized absence becomes no absence, and nothing is added or upgraded.
    """
    if not isinstance(raw, dict) or not isinstance(raw.get("categories"), list):
        return raw
    for item in raw["categories"]:
        if not isinstance(item, dict):
            continue
        absence = item.get("absence_excerpt")
        if isinstance(absence, str) and len(absence) > MAX_ABSENCE_EXCERPT:
            item["absence_excerpt"] = None
        lines = item.get("lines")
        if item.get("status") == "present" and lines == []:
            item["status"] = "unknown"
        for line in lines if isinstance(lines, list) else ():
            if isinstance(line, dict) and item.get("category") in COUNTED_CATEGORIES:
                if not line.get("quantity_excerpt"):
                    line["quantity"] = None
    return raw


class TowerGroqExtractor:
    async def extract(self, text, parts):
        return await self.extract_prepared(prepare_context(text, parts))

    async def extract_prepared(self, prepared):
        try:
            async with asyncio.timeout(extraction_seconds()):
                async with http_client() as client:
                    with tracing_context(enabled=False):
                        response = (
                            await model(client)
                            .bind(response_format=TOWER_RESPONSE_FORMAT)
                            .ainvoke(
                                [
                                    ("system", prepared.system_message),
                                    ("human", prepared.human_message),
                                ],
                                config={
                                    "callbacks": [],
                                    "tags": ["cu02-tower-stateless"],
                                },
                            )
                        )
            if type(response.content) is not str or len(response.content) > 30000:
                raise ValueError("Invalid bounded extraction response")
            raw = json.loads(response.content, object_pairs_hook=_unique_object)
            return TowerProviderProposal.model_validate(withdraw_unproved(raw))
        except TimeoutError:
            raise PCError(504, "Extraction timed out") from None
        except Exception as exc:
            if getattr(exc, "status_code", None) == 413:
                raise PCError(
                    502,
                    "Extraction provider rejected request size; shorten pasted text",
                ) from None
            if getattr(exc, "status_code", None) == 429:
                raise PCError(429, "Extraction quota exceeded") from None
            if "timeout" in type(exc).__name__.lower():
                raise PCError(504, "Extraction timed out") from None
            raise PCError(
                502, "Extraction provider unavailable or invalid JSON"
            ) from None
