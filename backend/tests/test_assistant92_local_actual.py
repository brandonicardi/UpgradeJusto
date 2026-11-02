"""Opt-in ONE actual Ollama/PG/MCP turn, not a fake model or dispatch gate."""

import hashlib
import json
import os
from time import perf_counter

import pytest
from langchain_ollama import ChatOllama
from test_assistant_postgres import assistant_actors as assistant_actors
from test_pcs_postgres import actors as actors
from test_tower38_assistant_live_diagnostic import (
    classify,
    complete,
    execute_live,
    logging_safe,
    new_report,
)

from upgradejusto.assistant import graph, provider


@pytest.fixture
def local_actors(request):
    if (
        os.environ.get("UJ_TEST_ASSISTANT_LOCAL") != "1"
        or os.environ.get("UJ_TEST_ASSISTANT_DIAGNOSTIC") != "1"
    ):
        pytest.skip("Actual local turn requires explicit local/diagnostic opt-ins")
    if os.environ.get("UJ_CHAT_PROVIDER") != "ollama":
        pytest.fail("Explicit Ollama provider required, no request sent", pytrace=False)
    if request.config.getoption("showlocals", default=False) or not logging_safe():
        pytest.fail("Local diagnostic requires safe logging/no locals", pytrace=False)
    if any(
        os.environ.get(key, "").strip().lower() in {"1", "true", "yes", "on"}
        for key in ("LANGCHAIN_TRACING", "LANGCHAIN_TRACING_V2", "LANGSMITH_TRACING")
    ):
        pytest.fail("Local diagnostic requires tracing off", pytrace=False)
    message = os.environ.get("UJ_TEST_ASSISTANT_DIAGNOSTIC_MESSAGE", "")
    if not message.strip() or len(message) > 8000:
        pytest.fail(
            "Exact synthetic UI message required, no request sent", pytrace=False
        )
    provider.local_model_name()
    if os.environ.get("UJ_OLLAMA_BASE_URL", "http://127.0.0.1:11434") != (
        "http://127.0.0.1:11434"
    ):
        pytest.fail("Local loopback URL required, no request sent", pytrace=False)
    return request.getfixturevalue("assistant_actors")


class TimedLocalModel:
    """Transparent timing only; schemas, messages, chunks and tool calls untouched."""

    def __init__(self, original, timing):
        self.original, self.timing = original, timing

    def bind_tools(self, *args, **kwargs):
        return TimedLocalBound(self.original.bind_tools(*args, **kwargs), self.timing)


class TimedLocalBound:
    def __init__(self, original, timing):
        self.original, self.timing = original, timing

    async def astream(self, *args, **kwargs):
        self.timing.setdefault("first_astream", perf_counter())
        text, calls = "", False
        async for chunk in self.original.astream(*args, **kwargs):
            calls = calls or bool(getattr(chunk, "tool_call_chunks", ()))
            if isinstance(chunk.content, str) and chunk.content.strip():
                self.timing.setdefault("first_text", perf_counter())
                text = (text + chunk.content)[:16384]
            yield chunk
        if not calls:
            self.timing["final_text"] = text


def execute_local(actor, engine, monkeypatch, report):
    timing = {}
    real_factory = graph.model
    name = provider.local_model_name()

    def timed_factory(client):
        actual = real_factory(client)
        if not isinstance(actual, ChatOllama) or actual.model != name or actual.verbose:
            raise ValueError("Actual local model required")
        return TimedLocalModel(actual, timing)

    started = perf_counter()
    monkeypatch.setattr(graph, "model", timed_factory)
    # Existing helper does ONE cookie/CSRF POST with server context, real PG
    # admission, real graph/stdio tools, terminal history read and own cleanup.
    execute_live(actor, engine, monkeypatch, report)
    report["elapsed_total_s"] = round(perf_counter() - started, 3)
    report["elapsed_ttft_s"] = (
        round(timing["first_text"] - timing["first_astream"], 3)
        if "first_text" in timing
        else None
    )
    report["ttft_origin"] = "first_astream"
    text = timing.get("final_text", "").strip().lower()
    # Bounded utility smoke criterion, NOT an independent factual review.
    report["useful_text_smoke"] = len(text) >= 40 and any(
        word in text for word in ("compatib", "verific", "faltan", "desconoc")
    )
    report["provider"] = "ollama"
    report["model_id"] = name
    report["model_tag_sha256"] = hashlib.sha256(name.encode("ascii")).hexdigest()
    report["hash_kind"] = "tag_not_model_weights"


def test_actual_local_tower_tools_final_text_history_and_cleanup(
    local_actors, pg_engine, monkeypatch, caplog
):
    report = new_report()
    execute_local(local_actors[0], pg_engine, monkeypatch, report)
    report["classification"] = classify(report)
    caplog.clear()
    safe = json.dumps(report, sort_keys=True, allow_nan=False)
    print("ASSISTANT_LOCAL92_DIAGNOSTIC " + safe)
    if not complete(report) or not report["useful_text_smoke"]:
        pytest.fail(safe, pytrace=False)
