"""Graph fault injection only; real MCP/PG positive lives in separate tests."""

import asyncio
import json
from types import SimpleNamespace
from uuid import uuid4

import pytest
from langchain_core.messages import AIMessageChunk, ToolMessage
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
        ("text_no_retry", 1, "schema_error_after_text"),
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
        ("after_text", 1, "rate_limit", None),
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
                raise FakeGroq.APIStatusError("rate limit", 429, 21)
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
    total = sum(sizes.values())
    print(json.dumps({"total": total, "tools": sizes}, sort_keys=True, indent=2))
    assert total <= 6000, f"compact input schemas exceed 6000 chars: {total}"
