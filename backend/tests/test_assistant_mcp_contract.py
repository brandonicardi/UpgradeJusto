"""Real MCP contract probes, no Groq calls and no sensitive diagnostic output.

The graph probe substitutes only the model, forcing the exact public query used
by the live test. MCP, session checks, encoder and PostgreSQL remain real.
"""

import asyncio
import inspect
import json
import os
import sys
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from langchain_core.messages import AIMessageChunk
from mcp import Client, StdioServerParameters
from test_assistant_postgres import assistant_actors as assistant_actors
from test_pcs_postgres import actors as actors
from test_pcs_postgres import create

from upgradejusto.assistant import graph, mcp_server
from upgradejusto.assistant.repository import Repository
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService
from upgradejusto.compatibility.application import CompatibilityService
from upgradejusto.compatibility.http_models import EvaluateRequest, SimulateRequest
from upgradejusto.pcs.repository import PCRepository
from upgradejusto.pcs.service import PCService

PUBLIC_QUERY = "Kingston DDR4 KVR32N22S8/8 memory specifications"


EXPECTED_TOOLS = {
    "catalog_search",
    "get_pc",
    "evaluate_pc",
    "simulate_pc",
    "preview_recommendations",
    "get_plan",
}


def _stub_build_server_dependencies(monkeypatch):
    """Let build_server() list tools without a real database or auth stack."""
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


def test_build_server_lists_six_tools_without_rag_config(monkeypatch):
    """When UJ_ASSISTANT_RAG_CONFIG is absent search_public_docs is not advertised."""
    _stub_build_server_dependencies(monkeypatch)
    monkeypatch.setenv("UJ_ASSISTANT_SESSION", "synthetic-session")
    monkeypatch.setenv("UJ_ASSISTANT_CONVERSATION", str(uuid4()))
    monkeypatch.delenv("UJ_ASSISTANT_RAG_CONFIG", raising=False)

    server = mcp_server.build_server()
    tools = asyncio.run(server.list_tools())
    names = {tool.name for tool in tools}
    assert "search_public_docs" not in names
    assert EXPECTED_TOOLS <= names
    assert len(names) == 6


def test_build_server_lists_seven_tools_with_rag_config(monkeypatch):
    """When UJ_ASSISTANT_RAG_CONFIG is present search_public_docs is advertised."""
    _stub_build_server_dependencies(monkeypatch)
    monkeypatch.setenv("UJ_ASSISTANT_SESSION", "synthetic-session")
    monkeypatch.setenv("UJ_ASSISTANT_CONVERSATION", str(uuid4()))
    monkeypatch.setenv("UJ_ASSISTANT_RAG_CONFIG", "postgres")

    server = mcp_server.build_server()
    tools = asyncio.run(server.list_tools())
    names = {tool.name for tool in tools}
    assert "search_public_docs" in names
    assert EXPECTED_TOOLS <= names
    assert len(names) == 7


def test_search_public_docs_removal_is_guarded_by_env_in_source():
    """The conditional removal is visible in build_server source."""
    source = inspect.getsource(mcp_server.build_server)
    assert "UJ_ASSISTANT_RAG_CONFIG" in source
    assert 'server.remove_tool("search_public_docs")' in source


def child_params(actor, conversation_id):
    allowed = {
        "PATH",
        "SYSTEMROOT",
        "WINDIR",
        "TEMP",
        "TMP",
        "DATABASE_URL",
        "PYTHONPATH",
        "UJ_ENV",
        "UJ_ASSISTANT_RAG_CONFIG",
    }
    env = {key: value for key, value in os.environ.items() if key in allowed}
    env["UJ_ASSISTANT_SESSION"] = actor[0].cookies.get("uj_session")
    env["UJ_ASSISTANT_CONVERSATION"] = str(conversation_id)
    return StdioServerParameters(
        command=sys.executable,
        args=["-m", "upgradejusto.assistant.mcp_server"],
        env=env,
    )


def observed_payload(structured):
    """Require native structured data; never decode text or unwrap guesses."""
    if not isinstance(structured, dict):
        return None
    return structured


def public_shape(structured):
    payload = observed_payload(structured)
    nested = structured.get("result") if isinstance(structured, dict) else None
    citations = payload.get("citations") if isinstance(payload, dict) else None
    return {
        "keys": sorted(structured) if isinstance(structured, dict) else [],
        "result_keys": sorted(nested) if isinstance(nested, dict) else [],
        "citation_count": len(citations) if isinstance(citations, list) else None,
    }


@pytest.mark.skipif(
    not os.environ.get("UJ_ASSISTANT_RAG_CONFIG"),
    reason="search_public_docs probe requires UJ_ASSISTANT_RAG_CONFIG",
)
def test_real_mcp_search_structured_output_reaches_graph(
    assistant_actors, pg_engine, monkeypatch
):
    a, _ = assistant_actors
    cid = Repository(pg_engine).create(a[2], "MCP citation contract")["id"]
    observed = []
    emitted = []

    class ObservedClient:
        """Observe the native SDK result, without altering its shape."""

        def __init__(self, params):
            self.context = Client(params)

        async def __aenter__(self):
            self.client = await self.context.__aenter__()
            return self

        async def __aexit__(self, *args):
            return await self.context.__aexit__(*args)

        async def list_tools(self):
            listing = await self.client.list_tools()
            expected_count = 7 if os.environ.get("UJ_ASSISTANT_RAG_CONFIG") else 6
            assert len(listing.tools) == expected_count
            assert all(tool.output_schema is not None for tool in listing.tools)
            return listing

        async def call_tool(self, name, arguments):
            result = await self.client.call_tool(name, arguments)
            shape = public_shape(result.structured_content)
            print(json.dumps(shape, sort_keys=True))
            observed.append(shape)
            return result

    class ForcedPublicQueryModel:
        def bind_tools(self, tools):
            self.calls = 0
            return self

        async def astream(self, messages):
            self.calls += 1
            if self.calls == 1:
                yield AIMessageChunk(
                    content="",
                    tool_call_chunks=[
                        {
                            "name": "search_public_docs",
                            "args": json.dumps({"query": PUBLIC_QUERY, "top_k": 3}),
                            "id": "public-contract-call",
                            "index": 0,
                        }
                    ],
                )
            else:
                yield AIMessageChunk(content="Evidencia documental, no veredicto.")

    monkeypatch.setattr(graph, "Client", ObservedClient)
    monkeypatch.setattr(graph, "model", lambda http: ForcedPublicQueryModel())

    async def emit(kind, data):
        if kind == "citation":
            # Keep only a count; no excerpt/content is printed or asserted.
            emitted.append(kind)

    asyncio.run(graph.run_turn(a[0].cookies.get("uj_session"), [], emit, cid))
    assert len(observed) == 1
    assert observed[0]["keys"] == ["citations"]
    assert observed[0]["result_keys"] == []
    assert observed[0]["citation_count"] is not None
    assert observed[0]["citation_count"] > 0
    assert len(emitted) == observed[0]["citation_count"]


def test_real_mcp_evaluate_simulate_match_service_and_do_not_persist(
    assistant_actors, pg_engine
):
    a, b = assistant_actors
    own = create(
        a,
        components=[
            {"category": "cpu", "component_id": "P01", "quantity": 1},
            {"category": "motherboard", "component_id": "P03", "quantity": 1},
            {"category": "ram", "component_id": "P04", "quantity": 2},
        ],
        context={"bios_version": "P2.30", "notes": None},
    )
    foreign = create(b)
    cid = Repository(pg_engine).create(a[2], "MCP deterministic contract")["id"]
    catalog = CatalogService(PostgresCatalogRepository())
    pcs = PCService(PCRepository(pg_engine), catalog)
    service = CompatibilityService(pcs, catalog)
    pc_id = UUID(own["id"])
    before = pcs.get(a[2], pc_id).model_dump(mode="json")
    evaluation = {"expected_pc_revision": own["revision"]}
    simulation = {
        **evaluation,
        "category": "ram",
        "candidates": [{"component_id": "P05", "quantity": 2}],
    }
    expected = {
        "evaluate_pc": service.run(
            a[2], pc_id, EvaluateRequest.model_validate(evaluation)
        ).model_dump(mode="json"),
        "simulate_pc": service.run(
            a[2], pc_id, SimulateRequest.model_validate(simulation)
        ).model_dump(mode="json"),
    }

    async def probe():
        async with Client(child_params(a, cid)) as client:
            for name, data in [
                ("evaluate_pc", evaluation),
                ("simulate_pc", simulation),
            ]:
                result = await client.call_tool(
                    name, {"pc_id": own["id"], "data": data}
                )
                assert not result.is_error
                actual = observed_payload(result.structured_content)
                # Compare without printing the full tool output on failure.
                assert bool(actual == expected[name])
                denied = await client.call_tool(
                    name, {"pc_id": foreign["id"], "data": data}
                )
                assert denied.is_error
                stale_data = {**data, "expected_pc_revision": own["revision"] + 1}
                stale = await client.call_tool(
                    name, {"pc_id": own["id"], "data": stale_data}
                )
                assert stale.is_error

    asyncio.run(probe())
    after = pcs.get(a[2], pc_id).model_dump(mode="json")
    assert bool(before == after)
    evaluated = expected["simulate_pc"]["evaluated_configuration"]
    ram = [g for g in evaluated["components"] if g["category"] == "ram"]
    assert ram == [{"category": "ram", "component_id": "P05", "quantity": 2}]
