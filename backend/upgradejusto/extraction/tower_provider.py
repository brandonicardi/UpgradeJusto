"""Existing Groq composition, closed nine-category observations, no tools/retries."""

import asyncio
import json

from langsmith import tracing_context

from upgradejusto.assistant.provider import http_client, model
from upgradejusto.extraction.tower_context import prepare_context
from upgradejusto.extraction.tower_models import TowerProviderProposal
from upgradejusto.pcs.service import PCError


def _unique_object(pairs):
    output = {}
    for key, value in pairs:
        if key in output:
            raise ValueError("Duplicate extraction JSON key")
        output[key] = value
    return output


class TowerGroqExtractor:
    async def extract(self, text, parts):
        return await self.extract_prepared(prepare_context(text, parts))

    async def extract_prepared(self, prepared):
        try:
            async with asyncio.timeout(30):
                async with http_client() as client:
                    with tracing_context(enabled=False):
                        response = await model(client).ainvoke(
                            [
                                ("system", prepared.system_message),
                                ("human", prepared.human_message),
                            ],
                            config={"callbacks": [], "tags": ["cu02-tower-stateless"]},
                        )
            if type(response.content) is not str or len(response.content) > 30000:
                raise ValueError("Invalid bounded extraction response")
            raw = json.loads(response.content, object_pairs_hook=_unique_object)
            return TowerProviderProposal.model_validate(raw)
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
