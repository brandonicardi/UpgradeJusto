"""Graph fault injection only; real MCP/PG positive lives in separate tests."""

import asyncio
import json
from types import SimpleNamespace
from uuid import uuid4

import pytest
from langchain_core.messages import AIMessageChunk, HumanMessage, ToolMessage
from mcp.types import CallToolResult

from upgradejusto.assistant import graph, mcp_server


@pytest.mark.parametrize("fail_tool", [False, True])
def test_bounded_graph_and_safe_reasoning(monkeypatch, fail_tool):
    counts = {"model": 0, "tools": 0}
    events = []
    seen = []

    class FakeClient:
        def __init__(self, *args):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def list_tools(self):
            return SimpleNamespace(
                tools=[
                    SimpleNamespace(
                        name="catalog_search",
                        description="test",
                        input_schema={"type": "object", "properties": {}},
                    )
                ]
            )

        async def call_tool(self, name, arguments):
            counts["tools"] += 1
            return CallToolResult(
                is_error=fail_tool,
                content=[],
                structured_content={
                    "dataset_version": "graph-fixture",
                    "items": [],
                    "total": 0,
                    "page": 1,
                    "page_size": 12,
                },
            )

    class FakeModel:
        def bind_tools(self, tools):
            return self

        async def astream(self, messages):
            counts["model"] += 1
            seen.append(messages[-1])
            if fail_tool and counts["model"] == 2:
                yield AIMessageChunk(content="No tengo ese dato en este momento.")
                return
            yield AIMessageChunk(
                content="",
                additional_kwargs={"reasoning_content": "INTERNAL_SECRET"},
                tool_call_chunks=[
                    {
                        "name": "catalog_search",
                        "args": "{}",
                        "id": f"call{counts['model']}",
                        "index": 0,
                    }
                ],
            )

    monkeypatch.setattr(graph, "Client", FakeClient)
    monkeypatch.setattr(graph, "http_client", FakeClient)
    monkeypatch.setattr(graph, "model", lambda client: FakeModel())

    async def emit(kind, data):
        events.append((kind, data))

    async def exercise():
        if fail_tool:
            await graph.run_turn("fake-session", [], emit, uuid4())
        else:
            with pytest.raises(graph.RoundLimit):
                await graph.run_turn("fake-session", [], emit, uuid4())

    asyncio.run(exercise())
    assert counts["tools"] == (1 if fail_tool else 4)
    assert counts["model"] == (2 if fail_tool else 5)
    assert "INTERNAL_SECRET" not in str(events)
    if fail_tool:
        failed = [
            e
            for e in events
            if e[0] == "tool_status" and e[1].get("status") == "failed"
        ]
        assert len(failed) == 1
        assert failed[0][1]["name"] == "catalog_search"
        assert failed[0][1].get("code") == "tool_failed"
        assert isinstance(seen[-1], ToolMessage)
        assert (
            seen[-1].content
            == "La herramienta no pudo responder. Explicá que no tenés ese dato."
        )
        assert seen[-1].tool_call_id == "call1"


class FakeGroq:
    class APIError(Exception):
        pass

    class APIStatusError(APIError):
        def __init__(self, message, status_code, retry_after=None):
            super().__init__(message)
            self.status_code = status_code
            self.response = SimpleNamespace(
                headers={
                    "retry-after": str(retry_after) if retry_after is not None else None
                }
            )


@pytest.mark.parametrize(
    "scenario,expected_attempts,expected_failure",
    [
        ("retry_ok", 2, None),
        ("retry_exhausted", 2, "schema_error_twice"),
        ("text_no_retry", 2, "schema_error_twice"),
    ],
)
def test_schema_validation_retry(
    monkeypatch, scenario, expected_attempts, expected_failure
):
    """Groq 'tool call validation failed' is retried once unless text was emitted."""
    counts = {"model": 0}
    events = []
    seen = []

    class FakeClient:
        def __init__(self, *args):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def list_tools(self):
            return SimpleNamespace(
                tools=[
                    SimpleNamespace(
                        name="catalog_search",
                        description="test",
                        input_schema={"type": "object", "properties": {}},
                    )
                ]
            )

        async def call_tool(self, name, arguments):
            pytest.fail("call_tool should not be called during schema-error scenarios")

    class FakeModel:
        def bind_tools(self, tools):
            return self

        async def astream(self, messages):
            counts["model"] += 1
            seen.append(messages[-1])
            if scenario == "retry_ok":
                if counts["model"] == 1:
                    raise graph.groq.APIError(
                        "tool call validation failed: category must be one of 'gpu'"
                    )
                yield AIMessageChunk(content="Encontré placas de video.")
            elif scenario == "retry_exhausted":
                raise graph.groq.APIError(
                    "tool call validation failed: SECRET_TOKEN_abc123 attempt "
                    + str(counts["model"])
                )
            elif scenario == "text_no_retry":
                yield AIMessageChunk(content="Voy a buscar")
                raise graph.groq.APIError("tool call validation failed")

    monkeypatch.setattr(graph, "Client", FakeClient)
    monkeypatch.setattr(graph, "http_client", FakeClient)
    monkeypatch.setattr(graph, "model", lambda client: FakeModel())
    monkeypatch.setattr(graph, "groq", FakeGroq)

    async def emit(kind, data):
        events.append((kind, data))

    async def exercise():
        if expected_failure:
            with pytest.raises(graph.ToolFailure) as exc:
                await graph.run_turn("fake-session", [], emit, uuid4())
            assert exc.value.args[0] == expected_failure
        else:
            await graph.run_turn("fake-session", [], emit, uuid4())

    asyncio.run(exercise())
    assert counts["model"] == expected_attempts
    if not expected_failure:
        deltas = [e for e in events if e[0] == "delta"]
        assert len(deltas) == 1
        assert deltas[0][1]["text"] == "Encontré placas de video."
    if scenario == "retry_ok":
        validation_message = seen[1]
        assert validation_message.content == (
            "La llamada a la herramienta no cumplió su definición. "
            "Usá solo los campos y valores de esa definición."
        )
        assert "category" not in validation_message.content
        assert "SECRET_TOKEN" not in str(seen)
    if scenario == "retry_exhausted":
        assert all(
            "SECRET_TOKEN" not in (m.content if isinstance(m.content, str) else "")
            for m in seen
        )


def _stub_build_server_dependencies(monkeypatch):
    monkeypatch.setattr(mcp_server, "runtime_engine", lambda: object())
    monkeypatch.setattr(mcp_server, "AuthRepository", lambda engine: object())
    monkeypatch.setattr(
        mcp_server,
        "AuthService",
        lambda repo: SimpleNamespace(current=lambda raw: {"id": str(uuid4())}),
    )
    monkeypatch.setattr(mcp_server, "PostgresCatalogRepository", lambda: object())
    monkeypatch.setattr(mcp_server, "CatalogService", lambda repo: object())
    monkeypatch.setattr(mcp_server, "PCRepository", lambda engine: object())
    monkeypatch.setattr(mcp_server, "PCService", lambda repo, catalog: object())
    monkeypatch.setattr(
        mcp_server, "TowerReadTools", lambda engine, catalog, pcs: object()
    )
    monkeypatch.setattr(
        mcp_server,
        "Repository",
        lambda engine: SimpleNamespace(get=lambda identity, conversation_id: None),
    )


def test_context_snapshot_prefix_exposes_exact_pc_id_and_revision(monkeypatch):
    seen = []
    pc_id = "d965addc-b2af-40d4-80ec-9edd32a31f62"
    expected_revision = 7

    class FakeClient:
        def __init__(self, *args):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def list_tools(self):
            return SimpleNamespace(
                tools=[
                    SimpleNamespace(
                        name="catalog_search",
                        description="test",
                        input_schema={"type": "object", "properties": {}},
                    )
                ]
            )

        async def call_tool(self, name, arguments):
            pytest.fail("call_tool should not be called")

    class FakeModel:
        def bind_tools(self, tools):
            return self

        async def astream(self, messages):
            seen.append(messages)
            yield AIMessageChunk(content="Listo.")

    monkeypatch.setattr(graph, "Client", FakeClient)
    monkeypatch.setattr(graph, "http_client", FakeClient)
    monkeypatch.setattr(graph, "model", lambda client: FakeModel())

    class HistoryWithContext(list):
        context_snapshot = {
            "context_version": 2,
            "configuration_schema": 2,
            "pc_id": pc_id,
            "expected_pc_revision": expected_revision,
            "configuration": {"id": pc_id, "revision": expected_revision},
        }

    async def emit(kind, data):
        pass

    asyncio.run(graph.run_turn("fake-session", HistoryWithContext([]), emit, uuid4()))
    assert len(seen) == 1
    context_message = seen[0][1]
    assert isinstance(context_message, HumanMessage)
    assert (
        f"PC de este turno: pc_id={pc_id}; "
        f"data.expected_pc_revision={expected_revision}."
    ) in context_message.content
    assert "owner_id" not in context_message.content
    assert "d965addc-b2af-40d4-80ec-9edd32a31f63" not in context_message.content


def test_policy_requires_verdict_and_forbids_turning_the_index_into_fps():
    assert "decí siempre el veredicto" in graph.POLICY
    assert "no lo conviertas a FPS" in graph.POLICY
    assert "No muestres códigos internos" in graph.POLICY
    assert "llamada en este mismo turno" in graph.POLICY


def test_exact_calls_are_built_from_the_server_context():
    snapshot = {
        "pc_id": "d965addc-b2af-40d4-80ec-9edd32a31f62",
        "expected_pc_revision": 3,
        "objective": "gaming",
        "budget_ars": "2000000.00",
        "price_condition": "cash",
        "workload": None,
        "configuration": {"lines": [{"line_id": "must-not-be-copied"}]},
    }
    calls = graph._exact_calls(snapshot)
    evaluate, preview = (json.loads(line.split(": ", 1)[1]) for line in calls)
    assert evaluate == {
        "configuration_schema": 2,
        "pc_id": snapshot["pc_id"],
        "data": {"expected_pc_revision": 3},
    }
    assert preview["data"] == {
        "expected_pc_revision": 3,
        "objective": "gaming",
        "budget_ars": "2000000.00",
        "price_condition": "cash",
        "mode": "automatic",
    }
    assert "must-not-be-copied" not in "".join(calls)


def test_exact_calls_never_invent_a_missing_budget():
    calls = graph._exact_calls(
        {
            "pc_id": "d965addc-b2af-40d4-80ec-9edd32a31f62",
            "expected_pc_revision": 3,
            "objective": "gaming",
            "budget_ars": None,
            "price_condition": "cash",
        }
    )
    assert [line.split(":")[0] for line in calls] == ["evaluate_pc"]
    assert graph._exact_calls(None) == []


def test_unparseable_tool_arguments_are_retried_with_the_exact_call(monkeypatch):
    """Groq reports truncated JSON with the same code but a different message."""
    seen = []

    class ProviderError(FakeGroq.APIError):
        body = {"code": "tool_use_failed"}

    class FakeClient:
        def __init__(self, *args):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def list_tools(self):
            return SimpleNamespace(tools=[])

    class FakeModel:
        def bind_tools(self, tools):
            return self

        async def astream(self, messages):
            seen.append(messages[-1])
            if len(seen) == 1:
                raise ProviderError("Failed to parse tool call arguments as JSON")
            yield AIMessageChunk(content="Listo.")

    class History(list):
        context_snapshot = {
            "pc_id": "d965addc-b2af-40d4-80ec-9edd32a31f62",
            "expected_pc_revision": 7,
        }

    monkeypatch.setattr(graph, "Client", FakeClient)
    monkeypatch.setattr(graph, "http_client", FakeClient)
    monkeypatch.setattr(graph, "model", lambda client: FakeModel())
    monkeypatch.setattr(graph, "groq", FakeGroq)

    async def emit(kind, data):
        pass

    asyncio.run(graph.run_turn("fake-session", History([]), emit, uuid4()))
    assert len(seen) == 2
    assert '"expected_pc_revision": 7' in seen[1].content
    assert "Failed to parse" not in seen[1].content


def test_model_context_lists_parts_without_copyable_line_ids():
    snapshot = {
        "pc_id": "d965addc-b2af-40d4-80ec-9edd32a31f62",
        "expected_pc_revision": 3,
        "configuration": {
            "name": "Demo",
            "context": {"assembly_state": "new"},
            "category_status": {"cpu": "present", "fan": "unknown"},
            "lines": [
                {
                    "line_id": "a99c05a9-b4e3-4479-8278-f9c64b8d1e0f",
                    "category": "cpu",
                    "component_id": "cg-1",
                    "declared_model": None,
                    "quantity": 1,
                },
                {
                    "line_id": "62908d1d-62ed-4352-90fe-3725f1fd5484",
                    "category": "gpu",
                    "component_id": None,
                    "declared_model": "Sin identificar",
                    "quantity": 1,
                },
            ],
        },
        "selected_components": {"cg-1": "Ryzen de prueba"},
    }
    context = graph._model_context(snapshot)
    assert "configuration" not in context
    assert context["pc_id"] == snapshot["pc_id"]
    assert [part["name"] for part in context["pc"]["parts"]] == [
        "Ryzen de prueba",
        "Sin identificar",
    ]
    assert context["pc"]["not_present"] == {"fan": "unknown"}
    assert "a99c05a9" not in json.dumps(context)


def test_prune_defs_drops_definitions_only_dead_defs_reference():
    schema = {
        "$defs": {
            "Live": {"properties": {"x": {"$ref": "#/$defs/Nested"}}},
            "Nested": {"type": "string"},
            "Dead": {"properties": {"y": {"$ref": "#/$defs/AlsoDead"}}},
            "AlsoDead": {"type": "string"},
        },
        "properties": {"data": {"$ref": "#/$defs/Live"}},
    }
    assert set(graph._prune_defs(schema)["$defs"]) == {"Live", "Nested"}


def _scripted_model_turn(monkeypatch, script, history=None):
    """Run a turn where each model attempt pops one step: an exception or a chunk."""
    sleeps = []
    attempts = []

    class FakeClient:
        def __init__(self, *args):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def list_tools(self):
            return SimpleNamespace(
                tools=[
                    SimpleNamespace(
                        name="catalog_search",
                        description="test",
                        input_schema={"type": "object", "properties": {}},
                    )
                ]
            )

        async def call_tool(self, name, arguments):
            return CallToolResult(
                content=[],
                structured_content={
                    "items": [],
                    "total": 0,
                    "page": 1,
                    "page_size": 12,
                },
            )

    class FakeModel:
        def bind_tools(self, tools):
            return self

        async def astream(self, messages):
            attempts.append(messages[-1])
            step = script.pop(0)
            if isinstance(step, Exception):
                raise step
            yield step

    async def fake_sleep(seconds):
        sleeps.append(seconds)

    async def emit(kind, data):
        pass

    monkeypatch.setattr(graph, "Client", FakeClient)
    monkeypatch.setattr(graph, "http_client", FakeClient)
    monkeypatch.setattr(graph, "model", lambda client: FakeModel())
    monkeypatch.setattr(graph, "groq", FakeGroq)
    monkeypatch.setattr(asyncio, "sleep", fake_sleep)
    asyncio.run(graph.run_turn("fake-session", history or [], emit, uuid4()))
    return attempts, sleeps


def test_rate_limit_during_schema_retry_waits_instead_of_failing(monkeypatch):
    attempts, sleeps = _scripted_model_turn(
        monkeypatch,
        [
            FakeGroq.APIError("tool call validation failed"),
            FakeGroq.APIStatusError("rate limit", 429, 8),
            AIMessageChunk(content="Listo."),
        ],
    )
    assert len(attempts) == 3
    assert sleeps == [8]


def test_wait_that_cannot_fit_in_the_turn_fails_as_busy_right_away(monkeypatch):
    monkeypatch.setattr(graph, "TURN_TIMEOUT_SECONDS", 3)
    with pytest.raises(graph.ProviderRateLimited):
        _scripted_model_turn(monkeypatch, [FakeGroq.APIStatusError("limit", 429, 5)])


@pytest.mark.parametrize(
    "body",
    [
        {"code": "tool_use_failed"},
        {"error": {"code": "tool_use_failed"}},
    ],
)
def test_tool_use_failed_is_read_from_stream_and_http_bodies(body):
    error = Exception("Failed to parse tool call arguments as JSON")
    error.body = body
    assert graph._tool_use_failed(error)


def test_each_model_round_gets_its_own_rate_limit_wait(monkeypatch):
    tool_call = AIMessageChunk(
        content="",
        tool_call_chunks=[
            {"name": "catalog_search", "args": "{}", "id": "call1", "index": 0}
        ],
    )
    attempts, sleeps = _scripted_model_turn(
        monkeypatch,
        [
            FakeGroq.APIStatusError("rate limit", 429, 5),
            tool_call,
            FakeGroq.APIStatusError("rate limit", 429, 7),
            AIMessageChunk(content="Listo."),
        ],
    )
    assert len(attempts) == 4
    assert sleeps == [5, 7]


def test_history_window_limited_to_last_8(monkeypatch):
    seen = []

    class FakeClient:
        def __init__(self, *args):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def list_tools(self):
            return SimpleNamespace(
                tools=[
                    SimpleNamespace(
                        name="catalog_search",
                        description="test",
                        input_schema={"type": "object", "properties": {}},
                    )
                ]
            )

        async def call_tool(self, name, arguments):
            pytest.fail("call_tool should not be called")

    class FakeModel:
        def bind_tools(self, tools):
            return self

        async def astream(self, messages):
            seen.append(messages)
            yield AIMessageChunk(content="Listo.")

    monkeypatch.setattr(graph, "Client", FakeClient)
    monkeypatch.setattr(graph, "http_client", FakeClient)
    monkeypatch.setattr(graph, "model", lambda client: FakeModel())

    history = [{"role": "user", "content": f"m{i}"} for i in range(10)]

    async def emit(kind, data):
        pass

    asyncio.run(graph.run_turn("fake-session", history, emit, uuid4()))
    assert len(seen) == 1
    # System message + last 8 history rows.
    assert len(seen[0]) == 9
    assert seen[0][-1].content == "m9"
    assert seen[0][1].content == "m2"


@pytest.mark.parametrize(
    "scenario,expected_attempts,expected_error,slept",
    [
        ("retry_ok", 2, None, 5),
        ("too_long", 1, "rate_limit", None),
        ("after_text", 2, "rate_limit_retry_failed", 5),
        ("second_429", 2, "rate_limit_retry_failed", 5),
        ("429_then_413", 2, "content_too_large", 3),
        ("413", 1, "content_too_large", None),
    ],
)
def test_provider_rate_limit_handling(
    monkeypatch, scenario, expected_attempts, expected_error, slept
):
    counts = {"model": 0}
    events = []
    sleeps = []

    class FakeClient:
        def __init__(self, *args):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def list_tools(self):
            return SimpleNamespace(
                tools=[
                    SimpleNamespace(
                        name="catalog_search",
                        description="test",
                        input_schema={"type": "object", "properties": {}},
                    )
                ]
            )

        async def call_tool(self, name, arguments):
            pytest.fail("call_tool should not be called")

    class FakeModel:
        def bind_tools(self, tools):
            return self

        async def astream(self, messages):
            counts["model"] += 1
            if scenario == "retry_ok":
                if counts["model"] == 1:
                    raise FakeGroq.APIStatusError("rate limit", 429, 5)
                yield AIMessageChunk(content="Continuamos.")
            elif scenario == "too_long":
                raise FakeGroq.APIStatusError(
                    "rate limit", 429, graph.MAX_RATE_LIMIT_WAIT_SECONDS + 1
                )
            elif scenario == "after_text":
                yield AIMessageChunk(content="Voy a")
                raise FakeGroq.APIStatusError("rate limit", 429, 5)
            elif scenario == "second_429":
                if counts["model"] <= 2:
                    raise FakeGroq.APIStatusError("rate limit", 429, 5)
                pytest.fail("third attempt should not happen")
            elif scenario == "429_then_413":
                if counts["model"] == 1:
                    raise FakeGroq.APIStatusError("rate limit", 429, 3)
                raise FakeGroq.APIStatusError("too large after retry", 413)
            elif scenario == "413":
                raise FakeGroq.APIStatusError("too large", 413)

    monkeypatch.setattr(graph, "Client", FakeClient)
    monkeypatch.setattr(graph, "http_client", FakeClient)
    monkeypatch.setattr(graph, "model", lambda client: FakeModel())
    monkeypatch.setattr(graph, "groq", FakeGroq)

    async def fake_sleep(seconds):
        sleeps.append(seconds)

    monkeypatch.setattr(asyncio, "sleep", fake_sleep)

    async def emit(kind, data):
        events.append((kind, data))

    async def exercise():
        if expected_error:
            with pytest.raises(graph.ProviderRateLimited) as exc:
                await graph.run_turn("fake-session", [], emit, uuid4())
            assert exc.value.args[0] == expected_error
        else:
            await graph.run_turn("fake-session", [], emit, uuid4())

    asyncio.run(exercise())
    assert counts["model"] == expected_attempts
    if slept is not None:
        assert sleeps == [slept]
    else:
        assert sleeps == []
    if not expected_error:
        deltas = [e for e in events if e[0] == "delta"]
        assert len(deltas) == 1
        assert deltas[0][1]["text"] == "Continuamos."


def _required_without_property(node):
    if isinstance(node, list):
        return [gap for item in node for gap in _required_without_property(item)]
    if not isinstance(node, dict):
        return []
    known = node.get("properties", {})
    gaps = [name for name in node.get("required", []) if name not in known]
    return gaps + [
        gap for item in node.values() for gap in _required_without_property(item)
    ]


def test_compact_schema_keeps_plain_required_properties():
    schema = {
        "type": "object",
        "properties": {"budget_ars": {"type": "string", "title": "Budget"}},
        "required": ["budget_ars"],
    }
    assert graph._compact_schema(schema) == {
        "type": "object",
        "properties": {"budget_ars": {"type": "string"}},
        "required": ["budget_ars"],
    }


@pytest.mark.parametrize(
    "tool_name",
    ["evaluate_pc", "simulate_pc", "preview_recommendations"],
)
def test_missing_configuration_schema_emits_retry_and_completes(monkeypatch, tool_name):
    counts = {"model": 0, "tools": 0}
    events = []
    seen = []

    class FakeClient:
        def __init__(self, *args):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def list_tools(self):
            return SimpleNamespace(
                tools=[
                    SimpleNamespace(
                        name=tool_name,
                        description="test",
                        input_schema={"type": "object", "properties": {}},
                    )
                ]
            )

        async def call_tool(self, name, arguments):
            counts["tools"] += 1
            pytest.fail("call_tool should not be called when schema is missing")

    class FakeModel:
        def bind_tools(self, tools):
            return self

        async def astream(self, messages):
            counts["model"] += 1
            seen.append(messages[-1])
            if counts["model"] == 1:
                yield AIMessageChunk(
                    content="",
                    tool_call_chunks=[
                        {
                            "name": tool_name,
                            "args": json.dumps(
                                {
                                    "pc_id": str(uuid4()),
                                    "data": {"budget_ars": "2000000.00"},
                                }
                            ),
                            "id": "call1",
                            "index": 0,
                        }
                    ],
                )
            else:
                yield AIMessageChunk(content="Necesito que revises tu PC.")

    monkeypatch.setattr(graph, "Client", FakeClient)
    monkeypatch.setattr(graph, "http_client", FakeClient)
    monkeypatch.setattr(graph, "model", lambda client: FakeModel())

    async def emit(kind, data):
        events.append((kind, data))

    asyncio.run(graph.run_turn("fake-session", [], emit, uuid4()))
    assert counts["tools"] == 0
    assert counts["model"] == 2
    failed = [
        e
        for e in events
        if e[0] == "tool_status"
        and e[1].get("status") == "failed"
        and e[1].get("code") == "missing_configuration_schema"
    ]
    assert len(failed) == 1
    assert failed[0][1]["name"] == tool_name
    tool_message = seen[-1]
    assert isinstance(tool_message, ToolMessage)
    assert "configuration_schema=2" in tool_message.content
    assert tool_message.tool_call_id == "call1"
    deltas = [e for e in events if e[0] == "delta"]
    assert len(deltas) == 1
    assert deltas[0][1]["text"] == "Necesito que revises tu PC."


def test_measure_input_schemas_for_budget(monkeypatch):
    _stub_build_server_dependencies(monkeypatch)
    monkeypatch.setenv("UJ_ASSISTANT_SESSION", "synthetic-session")
    monkeypatch.setenv("UJ_ASSISTANT_CONVERSATION", str(uuid4()))
    monkeypatch.setenv("UJ_ASSISTANT_RAG_CONFIG", "postgres")
    server = mcp_server.build_server()
    tools = asyncio.run(server.list_tools())
    sizes = {}
    for tool in tools:
        compact = graph._compact_schema(tool.input_schema, name=tool.name)
        sizes[tool.name] = len(json.dumps(compact, ensure_ascii=False))
        assert _required_without_property(compact) == []
        if tool.name in {"evaluate_pc", "simulate_pc", "preview_recommendations"}:
            assert "configuration_schema" in compact.get("required", [])
            schema = compact["properties"]["configuration_schema"]
            allowed = schema == {"enum": [2], "type": "integer"} or schema == {
                "const": 2
            }
            assert allowed, f"unexpected configuration_schema schema: {schema}"
    total = sum(sizes.values())
    print(json.dumps({"total": total, "tools": sizes}, sort_keys=True, indent=2))
    assert total <= 6000, f"compact input schemas exceed 6000 chars: {total}"
