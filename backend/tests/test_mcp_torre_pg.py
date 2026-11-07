"""Real TEST PG + actual MCP stdio; no provider call or fake authorization."""

import ast
import asyncio
import inspect
from copy import deepcopy
from uuid import UUID, uuid4

import httpx
import pytest
from fastapi import HTTPException
from langchain_core.utils.function_calling import convert_to_openai_tool
from langchain_groq import ChatGroq
from mcp import Client
from test_assistant_mcp_contract import child_params
from test_assistant_postgres import assistant_actors as assistant_actors
from test_pcs_postgres import actors as actors
from test_pcs_postgres import create as create_legacy
from test_tower38_mcp_schema_contract import (
    local_references_only,
    tower_simulation,
)
from test_tower38_mcp_schema_contract import (
    schema_validator as schema_validator,
)

from upgradejusto.assistant import graph
from upgradejusto.assistant.models import MessageCreate
from upgradejusto.assistant.repository import Repository
from upgradejusto.assistant.tool_projection import project_tool_result
from upgradejusto.auth.repository import AuthRepository
from upgradejusto.auth.security import digest
from upgradejusto.catalog.models import Category
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService
from upgradejusto.compatibility.http_models import EvaluateRequest
from upgradejusto.compatibility.tower_application import (
    TowerCompatibilityService,
    TowerEvaluationRepository,
)
from upgradejusto.pcs.tower_repository import TowerRepository

TOOLS = {
    "catalog_search",
    "get_pc",
    "evaluate_pc",
    "simulate_pc",
    "preview_recommendations",
    "get_plan",
    "search_public_docs",
}


def create_tower(actor, component):
    states = {category.value: "unknown" for category in Category}
    states[component.category.value] = "present"
    response = actor[0].post(
        "/api/towers",
        headers=actor[1],
        json={
            "schema_version": 2,
            "name": "SYNTHETIC assistant fixture",
            "category_status": states,
            "lines": [
                {
                    "category": component.category.value,
                    "component_id": component.id,
                    "quantity": 1,
                }
            ],
            "context": {"bios_version": None, "notes": "PRIVATE-NOTE-NEVER-MODEL"},
        },
    )
    assert response.status_code == 201
    return response.json()


async def assert_simulation_wire_and_graph_conversion(listing, validate_schema):
    """Actual stdio -> graph argument -> converter -> offline real SDK binding.

    There is no load_mcp_tools/BaseTool adapter in graph.run_turn. Extract only
    its trusted bind_tools argument expression. Bind a real ChatGroq with a literal
    synthetic key and both HTTP transports forbidden; NEVER invoke or stream.
    This checks binding metadata, NOT remote provider acceptance or LIVE causality.
    """
    from jsonschema.exceptions import ValidationError as SchemaValidationError

    source = ast.parse(inspect.getsource(graph.run_turn))
    bindings = [
        node
        for node in ast.walk(source)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "bind_tools"
    ]
    assert len(bindings) == 1
    binding = bindings[0]
    assert len(binding.args) == 1 and not binding.keywords
    expression = binding.args[0]
    assert isinstance(expression, ast.ListComp)
    assert len(expression.generators) == 1
    assert isinstance(expression.generators[0].iter, ast.Name)
    assert expression.generators[0].iter.id == "tools"
    wire = next(tool for tool in listing.tools if tool.name == "simulate_pc")
    snapshot = deepcopy(wire.input_schema)
    for tool in listing.tools:
        local_references_only(tool.input_schema)
    arguments = eval(
        compile(
            ast.Expression(body=expression), "<trusted-graph-bind-argument>", "eval"
        ),
        {
            "__builtins__": {},
            "tools": listing.tools,
            "_compact_schema": graph._compact_schema,
        },
    )
    assert {tool["function"]["name"] for tool in arguments} == TOOLS
    converted = [convert_to_openai_tool(tool) for tool in arguments]
    simulation = next(
        tool["function"]["parameters"]
        for tool in converted
        if tool["function"]["name"] == "simulate_pc"
    )
    attempts = []

    def forbid_http(request):
        attempts.append(True)
        raise AssertionError("HTTP forbidden in non-billable binding contract")

    with httpx.Client(transport=httpx.MockTransport(forbid_http)) as sync_http:
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(forbid_http)
        ) as async_http:
            offline_model = ChatGroq(
                api_key="synthetic-nonbillable-binding-only",
                model="openai/gpt-oss-20b",
                max_retries=0,
                http_client=sync_http,
                http_async_client=async_http,
            )
            bound = offline_model.bind_tools(arguments)
            bound_tools = bound.kwargs["tools"]
            assert bound_tools == converted
            bound_simulation = deepcopy(
                next(
                    tool["function"]["parameters"]
                    for tool in bound_tools
                    if tool["function"]["name"] == "simulate_pc"
                )
            )
    assert not attempts
    assert wire.input_schema == snapshot
    # The wire schema stays strict; only the copy sent to the model is compact.
    compact = graph._compact_schema(snapshot, name="simulate_pc")
    assert simulation == compact
    assert bound_simulation == compact
    assert len(snapshot["oneOf"]) == 2
    legacy_branch, tower_branch = snapshot["oneOf"]
    assert legacy_branch["properties"]["configuration_schema"] == {"const": 1}
    assert "configuration_schema" not in legacy_branch.get("required", [])
    assert tower_branch["properties"]["configuration_schema"] == {"const": 2}
    assert tower_branch["required"] == ["configuration_schema"]
    legacy = {
        "pc_id": tower_simulation(2)["pc_id"],
        "data": {
            "expected_pc_revision": 1,
            "category": "cpu",
            "candidates": [{"component_id": "synthetic-cpu-part", "quantity": 1}],
        },
    }
    # The server keeps accepting six-category input; the model only sees the tower.
    validate_schema(snapshot, legacy)
    validate_schema(snapshot, {**legacy, "configuration_schema": 1})
    for schema in (snapshot, simulation, bound_simulation):
        validate_schema(schema, tower_simulation(2))
        with pytest.raises(SchemaValidationError):
            validate_schema(schema, tower_simulation(1))
        with pytest.raises(SchemaValidationError):
            validate_schema(schema, {**legacy, "configuration_schema": 2})


def test_actual_seven_mcp_tools_tower_owner_revision_services_and_revocation(
    assistant_actors, pg_engine, schema_validator
):
    a, b = assistant_actors
    catalog = CatalogService(PostgresCatalogRepository(pg_engine))
    parts = sorted(catalog.snapshot(), key=lambda item: item.id)
    assert len(parts) > 60
    selected = parts[60]
    own, foreign = create_tower(a, selected), create_tower(b, selected)
    legacy = create_legacy(a)
    repository = Repository(pg_engine)
    cid = repository.create(a[2], "SYNTHETIC MCP tower contract")["id"]
    foreign_conversation = repository.create(b[2], "SYNTHETIC foreign conversation")[
        "id"
    ]
    version = catalog.repository.dataset_version
    service = TowerCompatibilityService(
        TowerEvaluationRepository(pg_engine, version), catalog
    )
    expected = service.run(
        a[2], UUID(own["id"]), EvaluateRequest(expected_pc_revision=1)
    ).model_dump(mode="json")
    before = (
        TowerRepository(pg_engine, version)
        .get(a[2], UUID(own["id"]))
        .model_dump(mode="json")
    )

    async def probe():
        async with Client(child_params(a, foreign_conversation)) as foreign_client:
            denied_conversation = await foreign_client.call_tool(
                "get_pc", {"pc_id": own["id"]}
            )
            assert denied_conversation.is_error
        async with Client(child_params(a, cid)) as client:
            listing = await client.list_tools()
            assert {tool.name for tool in listing.tools} == TOOLS
            await assert_simulation_wire_and_graph_conversion(listing, schema_validator)
            legacy_read = await client.call_tool("get_pc", {"pc_id": legacy["id"]})
            assert not legacy_read.is_error
            assert "configuration_schema" not in legacy_read.structured_content
            assert (
                '"projection_version":"1"'
                in project_tool_result("get_pc", legacy_read).text
            )
            found = await client.call_tool("get_pc", {"pc_id": own["id"]})
            assert not found.is_error
            assert found.structured_content["configuration_schema"] == 2
            assert (
                found.structured_content["data"]["lines"][0]["component_id"]
                == selected.id
            )
            assert "PRIVATE-NOTE" not in project_tool_result("get_pc", found).text
            args = {
                "pc_id": own["id"],
                "configuration_schema": 2,
                "data": {"expected_pc_revision": 1},
            }
            evaluated = await client.call_tool("evaluate_pc", args)
            assert not evaluated.is_error
            assert evaluated.structured_content["data"] == expected
            projected = project_tool_result("evaluate_pc", evaluated)
            assert "PRIVATE-NOTE" not in projected.text
            assert expected["missing_fields"]
            mismatch = await client.call_tool(
                "evaluate_pc", {**args, "configuration_schema": 1}
            )
            assert mismatch.is_error
            stale = await client.call_tool(
                "evaluate_pc", {**args, "data": {"expected_pc_revision": 99}}
            )
            assert stale.is_error
            denied = await client.call_tool("get_pc", {"pc_id": foreign["id"]})
            assert denied.is_error
            invalid = await client.call_tool(
                "get_pc", {"pc_id": foreign["id"], "user_id": str(b[2])}
            )
            assert invalid.is_error
            simulation = await client.call_tool(
                "simulate_pc",
                {
                    **args,
                    "data": {
                        "expected_pc_revision": 1,
                        "actions": [
                            {
                                "action": "replace_category",
                                "category": selected.category.value,
                                "candidates": [
                                    {"component_id": selected.id, "quantity": 1}
                                ],
                            }
                        ],
                    },
                },
            )
            assert not simulation.is_error
            assert (
                simulation.structured_content["data"]["scope"]["id"]
                == "cu05-tower-essential-2"
            )
            preview = await client.call_tool(
                "preview_recommendations",
                {
                    **args,
                    "data": {
                        "expected_pc_revision": 1,
                        "objective": "general",
                        "budget_ars": "1.00",
                        "price_condition": "cash",
                        "mode": "manual_comparison",
                        "alternatives": [
                            {
                                "key": "synthetic",
                                "actions": [
                                    {
                                        "action": "replace_category",
                                        "category": selected.category.value,
                                        "candidates": [
                                            {"component_id": selected.id, "quantity": 1}
                                        ],
                                    }
                                ],
                            }
                        ],
                    },
                },
            )
            assert not preview.is_error
            assert preview.structured_content["configuration_schema"] == 2
            page = await client.call_tool(
                "catalog_search", {"page": 4, "page_size": 20}
            )
            assert not page.is_error
            assert page.structured_content["page"] == 4
            assert page.structured_content["total"] == len(parts)
            assert (
                TowerRepository(pg_engine, version)
                .get(a[2], UUID(own["id"]))
                .model_dump(mode="json")
                == before
            )
            AuthRepository(pg_engine).revoke(digest(a[0].cookies.get("uj_session")))
            expired = await client.call_tool("get_pc", {"pc_id": own["id"]})
            assert expired.is_error

    asyncio.run(probe())


def test_context_rejected_before_admission_and_private_snapshot_is_not_persisted(
    assistant_actors, pg_engine
):
    a, b = assistant_actors
    selected = PostgresCatalogRepository(pg_engine).all()[0]
    own, foreign = create_tower(a, selected), create_tower(b, selected)
    repo = Repository(pg_engine)
    cid = repo.create(a[2], "SYNTHETIC context admission")["id"]

    def message(pc_id, revision=1):
        return MessageCreate.model_validate(
            {
                "content": "SYNTHETIC original user text",
                "client_request_id": str(uuid4()),
                "context": {
                    "context_version": 2,
                    "configuration_schema": 2,
                    "pc_id": pc_id,
                    "expected_pc_revision": revision,
                },
            }
        )

    for owner, data in [
        (b[2], message(own["id"])),
        (a[2], message(foreign["id"])),
        (a[2], message(own["id"], 99)),
    ]:
        with pytest.raises(HTTPException):
            repo.begin(owner, cid, data, include_history=True, reserve_provider=True)
        assert repo.page(a[2], 1, 20, cid)["total"] == 0
    data = message(own["id"])
    mid, history = repo.begin(
        a[2], cid, data, include_history=True, reserve_provider=True
    )
    try:
        assert history.context_snapshot["configuration_schema"] == 2
        assert "notes" not in history.context_snapshot["configuration"]["context"]
        assert history[-1]["content"] == data.content
        with pytest.raises(HTTPException) as duplicate:
            repo.begin(a[2], cid, data, include_history=True, reserve_provider=True)
        assert duplicate.value.status_code == 409
        repo.interrupt_pending(a[2], cid, mid, "", [])
        reread = repo.history(a[2], cid)
        assert getattr(reread, "context_snapshot", None) is None
        rows = repo.page(a[2], 1, 20, cid)["items"]
        assert rows[0]["content"] == data.content
        assert rows[1]["status"] == "interrupted"
        assert len(rows) == 2
    finally:
        repo.release_provider(a[2], mid)
