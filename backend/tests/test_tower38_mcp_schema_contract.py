"""Non-billable regression for correlated simulation metadata.

Exercises SDK metadata and pure conversion, NOT provider support or cause of
the earlier tool_use_failed. No ChatGroq, handlers, PG or auth.
"""

import ast
import asyncio
import inspect
from copy import deepcopy
from importlib.metadata import PackageNotFoundError, version
from uuid import UUID

import pytest
from langchain_core.utils.function_calling import convert_to_openai_tool
from mcp.server import MCPServer
from pydantic import ValidationError

from upgradejusto.assistant import mcp_server
from upgradejusto.assistant.mcp_schema import CorrelatedMCPServer, simulation_schema
from upgradejusto.assistant.tool_inputs import INPUTS, validate_call
from upgradejusto.compatibility.http_models import EvaluateRequest, SimulateRequest
from upgradejusto.compatibility.tower_http_models import TowerSimulationDTO

SYNTHETIC_PC = "00000000-0000-4000-8000-000000000001"
JSONSCHEMA_VERSION = "4.26.0"  # Existing transitive pin: backend/uv.lock.


@pytest.fixture(scope="module")
def registered_server():
    """Real SDK registration/listing of exact source handler definitions only.

    build_server is NOT invoked or patched. Extract its decorated FunctionDefs,
    retaining signatures, annotations, defaults, docstrings, bodies and decorators.
    Only registration executes. Bootstrap/session pop/PG constructors and owner()
    definition are excluded. Handler runtime closure resources do not exist here.
    This is metadata characterization, NOT live stdio/auth/integration evidence.
    """
    source = ast.parse(inspect.getsource(mcp_server.build_server))
    bootstrap = source.body[0]
    assert isinstance(bootstrap, ast.FunctionDef)
    definitions = []
    for node in bootstrap.body:
        if not isinstance(node, ast.FunctionDef):
            continue
        registered = any(
            isinstance(decorator, ast.Call)
            and isinstance(decorator.func, ast.Attribute)
            and isinstance(decorator.func.value, ast.Name)
            and decorator.func.value.id == "server"
            and decorator.func.attr == "tool"
            for decorator in node.decorator_list
        )
        if registered:
            definitions.append(deepcopy(node))
    assert {node.name for node in definitions} == set(INPUTS)
    assert len(definitions) == 7
    constructors = [
        node.value.func
        for node in bootstrap.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "server"
            for target in node.targets
        )
        and isinstance(node.value, ast.Call)
    ]
    assert len(constructors) == 1
    assert isinstance(constructors[0], ast.Name)
    server_class = getattr(mcp_server, constructors[0].id)
    assert server_class is CorrelatedMCPServer
    server = server_class("UpgradeJusto read-only tools")
    namespace = dict(vars(mcp_server))
    namespace["server"] = server
    module = ast.fix_missing_locations(ast.Module(body=definitions, type_ignores=[]))
    exec(compile(module, "<trusted-mcp-schema-metadata>", "exec"), namespace)
    return server


@pytest.fixture(scope="module")
def advertised_schemas(registered_server):
    server = registered_server
    list_tools = getattr(server, "list_tools", None)
    if not callable(list_tools):
        pytest.fail(
            "MCP2.3 public metadata list_tools unavailable; Build verify SDK interface",
            pytrace=False,
        )
    tools = asyncio.run(list_tools())
    assert len(tools) == 7
    assert {tool.name for tool in tools} == set(INPUTS)
    schemas = {}
    for tool in tools:
        local_references_only(tool.input_schema)
        schemas[tool.name] = {
            "mcp": deepcopy(tool.input_schema),
            "converted": convert_to_openai_tool(
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description or "",
                        "parameters": deepcopy(tool.input_schema),
                    },
                }
            )["function"]["parameters"],
        }
    return schemas


def local_references_only(schema):
    """Network guard only, NOT a substitute JSON Schema validator."""
    stack = [schema]
    while stack:
        node = stack.pop()
        if type(node) is dict:
            for key in ("$ref", "$dynamicRef", "$recursiveRef"):
                if key in node and (
                    type(node[key]) is not str or not node[key].startswith("#")
                ):
                    pytest.fail("External schema resolution forbidden", pytrace=False)
            stack.extend(node.values())
        elif type(node) is list:
            stack.extend(node)


@pytest.fixture(scope="module")
def schema_validator():
    try:
        installed = version("jsonschema")
    except PackageNotFoundError:
        pytest.fail(
            "Existing locked jsonschema4.26.0 missing; Build verify setup, no install",
            pytrace=False,
        )
    if installed != JSONSCHEMA_VERSION:
        pytest.fail(
            "Locked jsonschema4.26.0 required; Build verify existing environment",
            pytrace=False,
        )
    from jsonschema import FormatChecker
    from jsonschema.validators import validator_for
    from referencing import Registry

    def no_remote_retrieval(uri):
        pytest.fail("Remote JSON Schema retrieval forbidden", pytrace=False)

    def validate(schema, instance):
        local_references_only(schema)
        validator = validator_for(schema)
        validator.check_schema(schema)
        validator(
            schema,
            format_checker=FormatChecker(),
            registry=Registry(retrieve=no_remote_retrieval),
        ).validate(instance)

    return validate


def tower_simulation(configuration_schema):
    return {
        "pc_id": SYNTHETIC_PC,
        "configuration_schema": configuration_schema,
        "data": {
            "expected_pc_revision": 1,
            "actions": [
                {
                    "action": "replace_category",
                    "category": "storage",
                    "candidates": [{"declared_model": "SYNTHETIC ONLY", "quantity": 1}],
                }
            ],
        },
    }


def assert_advertised_accepts(advertised_schemas, schema_validator, name, arguments):
    assert {"pc_id", "data"} <= set(arguments)
    assert set(arguments) <= {"pc_id", "configuration_schema", "data"}
    for stage in ("mcp", "converted"):
        schema_validator(advertised_schemas[name][stage], arguments)


def assert_advertised_rejects(advertised_schemas, schema_validator, arguments):
    from jsonschema.exceptions import ValidationError as SchemaValidationError

    for stage in ("mcp", "converted"):
        with pytest.raises(SchemaValidationError):
            schema_validator(advertised_schemas["simulate_pc"][stage], arguments)


@pytest.mark.parametrize("selector", ["explicit", "omitted"])
def test_schema1_tower_body_rejected_by_metadata_conversion_and_local(
    advertised_schemas, schema_validator, selector
):
    arguments = tower_simulation(1)
    if selector == "omitted":
        del arguments["configuration_schema"]
    # Prove the body itself is valid tower data; no catalog/PC lookups occur.
    TowerSimulationDTO.model_validate(arguments["data"])
    assert_advertised_rejects(advertised_schemas, schema_validator, arguments)
    with pytest.raises(ValidationError) as rejected:
        validate_call("simulate_pc", arguments)
    errors = rejected.value.errors(
        include_input=False, include_context=False, include_url=False
    )
    assert {error["loc"][-1] for error in errors} == {
        "category",
        "candidates",
        "actions",
    }
    assert all(error["loc"][-2] == "data" for error in errors)
    assert {error["type"] for error in errors} == {"missing", "extra_forbidden"}


def test_control_schema2_same_tower_body_accepted_everywhere(
    advertised_schemas, schema_validator
):
    arguments = tower_simulation(2)
    assert_advertised_accepts(
        advertised_schemas, schema_validator, "simulate_pc", arguments
    )
    accepted = validate_call("simulate_pc", arguments)
    assert accepted.configuration_schema == 2
    assert accepted.pc_id == UUID(SYNTHETIC_PC)
    assert isinstance(accepted.data, TowerSimulationDTO)


@pytest.mark.parametrize("selector", ["explicit", "omitted"])
def test_control_valid_legacy1_simulation_accepted_everywhere(
    advertised_schemas, schema_validator, selector
):
    arguments = {
        "pc_id": SYNTHETIC_PC,
        "configuration_schema": 1,
        "data": {
            "expected_pc_revision": 1,
            "category": "cpu",
            "candidates": [{"component_id": "synthetic-cpu-part", "quantity": 1}],
        },
    }
    if selector == "omitted":
        del arguments["configuration_schema"]
    assert_advertised_accepts(
        advertised_schemas, schema_validator, "simulate_pc", arguments
    )
    accepted = validate_call("simulate_pc", arguments)
    assert accepted.configuration_schema == 1
    assert isinstance(accepted.data, SimulateRequest)


def test_control_valid_tower2_evaluation_accepted_everywhere(
    advertised_schemas, schema_validator
):
    arguments = {
        "pc_id": SYNTHETIC_PC,
        "configuration_schema": 2,
        "data": {"expected_pc_revision": 1},
    }
    assert_advertised_accepts(
        advertised_schemas, schema_validator, "evaluate_pc", arguments
    )
    accepted = validate_call("evaluate_pc", arguments)
    assert accepted.configuration_schema == 2
    assert isinstance(accepted.data, EvaluateRequest)


def test_schema2_legacy_body_rejected_everywhere(advertised_schemas, schema_validator):
    arguments = {
        "pc_id": SYNTHETIC_PC,
        "configuration_schema": 2,
        "data": {
            "expected_pc_revision": 1,
            "category": "cpu",
            "candidates": [{"component_id": "synthetic-cpu-part", "quantity": 1}],
        },
    }
    SimulateRequest.model_validate(arguments["data"])
    assert_advertised_rejects(advertised_schemas, schema_validator, arguments)
    with pytest.raises(ValidationError):
        validate_call("simulate_pc", arguments)


def test_only_simulation_metadata_changes_and_repeated_listing_is_independent(
    registered_server,
):
    base = asyncio.run(MCPServer.list_tools(registered_server))
    snapshot = [tool.model_dump() for tool in base]
    first = asyncio.run(registered_server.list_tools())
    second = asyncio.run(registered_server.list_tools())
    assert {tool.name for tool in first} == set(INPUTS)
    assert [tool.model_dump() for tool in first] == [
        tool.model_dump() for tool in second
    ]
    for original, changed in zip(base, first, strict=True):
        if original.name == "simulate_pc":
            copied = deepcopy(changed.input_schema)
            assert len(copied.pop("oneOf")) == 2
            assert copied == original.input_schema
            assert changed.model_dump(exclude={"input_schema"}) == original.model_dump(
                exclude={"input_schema"}
            )
            helper_copy = simulation_schema(original.input_schema)
            helper_copy["$defs"].clear()
            changed.input_schema["$defs"].clear()
        else:
            assert changed.model_dump() == original.model_dump()
    assert [tool.model_dump() for tool in base] == snapshot
    assert [tool.model_dump() for tool in second] == [
        tool.model_dump() for tool in asyncio.run(registered_server.list_tools())
    ]


def test_unexpected_sdk_schema_fails_closed_without_changing_source(
    registered_server, monkeypatch
):
    originals = asyncio.run(MCPServer.list_tools(registered_server))
    target = next(tool for tool in originals if tool.name == "simulate_pc")
    target.input_schema["properties"]["data"] = {"type": "object"}
    snapshot = deepcopy(target.input_schema)

    async def unexpected(self):
        return originals

    monkeypatch.setattr(MCPServer, "list_tools", unexpected)
    with pytest.raises(ValueError, match="^Unexpected simulation metadata schema$"):
        asyncio.run(registered_server.list_tools())
    assert target.input_schema == snapshot
    with pytest.raises(ValueError, match="^Unexpected simulation metadata schema$"):
        simulation_schema({"PRIVATE-SYNTHETIC": True})


@pytest.mark.parametrize("invalid", ["uuid", "revision", "quantity", "extra"])
def test_generated_constraints_still_reject_invalid_tower_input(
    advertised_schemas, schema_validator, invalid
):
    arguments = tower_simulation(2)
    if invalid == "uuid":
        arguments["pc_id"] = "not-a-uuid"
    elif invalid == "revision":
        arguments["data"]["expected_pc_revision"] = 0
    elif invalid == "quantity":
        arguments["data"]["actions"][0]["candidates"][0]["quantity"] = 33
    else:
        arguments["data"]["unknown_extra"] = True
    assert_advertised_rejects(advertised_schemas, schema_validator, arguments)
    with pytest.raises(ValidationError):
        validate_call("simulate_pc", arguments)
