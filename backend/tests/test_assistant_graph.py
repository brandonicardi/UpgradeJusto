"""Graph fault injection only; real MCP/PG positive lives in separate tests."""

import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest
from langchain_core.messages import AIMessageChunk
from mcp.types import CallToolResult

from upgradejusto.assistant import graph


@pytest.mark.parametrize("fail_tool", [False, True])
def test_bounded_graph_and_safe_reasoning(monkeypatch, fail_tool):
    counts = {"model": 0, "tools": 0}
    events = []

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
        expected = graph.ToolFailure if fail_tool else graph.RoundLimit
        with pytest.raises(expected):
            await graph.run_turn("fake-session", [], emit, uuid4())

    asyncio.run(exercise())
    assert counts["tools"] == (1 if fail_tool else 4)
    assert counts["model"] == (1 if fail_tool else 5)
    assert "INTERNAL_SECRET" not in str(events)
