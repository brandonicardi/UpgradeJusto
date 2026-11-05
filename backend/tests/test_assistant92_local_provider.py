"""Non-billable selection/configuration/binding; NOT local runtime E2E evidence."""

import asyncio
import hashlib
import json
from copy import deepcopy
from types import SimpleNamespace

import httpx
import langchain_ollama
import pytest
from langchain_core.messages import HumanMessage, SystemMessage
from test_tower38_mcp_schema_contract import (
    advertised_schemas as advertised_schemas,
)
from test_tower38_mcp_schema_contract import (
    registered_server as registered_server,
)
from test_tower38_mcp_schema_contract import (
    schema_validator as schema_validator,
)
from test_tower38_mcp_schema_contract import tower_simulation

from upgradejusto.assistant import graph, ollama_schema, provider
from upgradejusto.assistant.ollama_schema import inline_local_references
from upgradejusto.assistant.tool_inputs import INPUTS, validate_call


def isolated_settings(monkeypatch, **values):
    # Replace this module's settings source, never read/edit real credential env.
    monkeypatch.setattr(provider, "os", SimpleNamespace(environ=values))


@pytest.mark.parametrize("selection", [None, "groq"])
def test_default_and_explicit_groq_keep_existing_factory(monkeypatch, selection):
    settings = {} if selection is None else {"UJ_CHAT_PROVIDER": selection}
    isolated_settings(monkeypatch, **settings)
    client, sentinel = object(), object()
    calls = []

    def original(received, **kwargs):
        calls.append((received, kwargs))
        return sentinel

    monkeypatch.setattr(provider, "model", original)
    assert provider.chat_model(client) is sentinel
    assert calls == [(client, {"max_tokens": 800})]
    assert graph.model is provider.chat_model


def test_extraction_factory_remains_groq_even_when_chat_local(monkeypatch):
    isolated_settings(monkeypatch, UJ_CHAT_PROVIDER="ollama")
    calls = []
    sentinel, client = object(), object()

    def constructor(**kwargs):
        calls.append(kwargs)
        return sentinel

    monkeypatch.setattr(provider, "ChatGroq", constructor)
    assert provider.model(client) is sentinel
    assert calls == [
        {
            "model": "openai/gpt-oss-20b",
            "timeout": 30,
            "max_retries": 0,
            "http_async_client": client,
            "temperature": 0,
        }
    ]


@pytest.mark.parametrize(
    "settings,message",
    [
        ({"UJ_CHAT_PROVIDER": "unknown"}, "Invalid chat provider"),
        ({"UJ_OLLAMA_MODEL": "bad model"}, "Invalid local chat model"),
        ({"UJ_OLLAMA_MODEL": "qwen3:cloud"}, "Invalid local chat model"),
        ({"UJ_OLLAMA_MODEL": "qwen3:4b-cloud"}, "Invalid local chat model"),
        ({"UJ_OLLAMA_MODEL": "https://remote/model"}, "Invalid local chat model"),
        ({"UJ_OLLAMA_BASE_URL": "http://remote:11434"}, "Invalid local chat URL"),
        (
            {"UJ_OLLAMA_BASE_URL": "http://127.0.0.1:11434?x=1"},
            "Invalid local chat URL",
        ),
        (
            {"UJ_OLLAMA_BASE_URL": "http://u:p@127.0.0.1:11434"},
            "Invalid local chat URL",
        ),
    ],
)
def test_bad_selection_fails_before_sdk_creation(monkeypatch, settings, message):
    isolated_settings(monkeypatch, **{"UJ_CHAT_PROVIDER": "ollama", **settings})

    def forbidden(*args, **kwargs):
        pytest.fail("SDK constructor forbidden for invalid settings", pytrace=False)

    monkeypatch.setattr(provider, "ChatGroq", forbidden)
    monkeypatch.setattr(ollama_schema, "LocalChatOllama", forbidden)
    with pytest.raises(ValueError, match=f"^{message}$"):
        provider.chat_model(object())


def test_local_constructor_and_real_binding_without_key_http_or_pull(
    monkeypatch, advertised_schemas, schema_validator
):
    from jsonschema.exceptions import ValidationError as SchemaValidationError

    isolated_settings(monkeypatch, UJ_CHAT_PROVIDER="ollama")
    original = ollama_schema.LocalChatOllama
    constructed, attempts = {}, []

    def forbidden_http(request):
        attempts.append(True)
        raise AssertionError("HTTP forbidden in pure local binding")

    def real_offline_constructor(**kwargs):
        constructed.update(kwargs)
        options = dict(kwargs)
        for key in ("client_kwargs", "async_client_kwargs"):
            options[key] = {
                **kwargs[key],
                "transport": httpx.MockTransport(forbidden_http),
            }
        return original(**options)

    def forbidden_groq(*args, **kwargs):
        pytest.fail("Groq factory forbidden for local chat", pytrace=False)

    monkeypatch.setattr(provider, "model", forbidden_groq)
    monkeypatch.setattr(ollama_schema, "LocalChatOllama", real_offline_constructor)
    local = provider.chat_model(object())
    assert isinstance(local, langchain_ollama.ChatOllama)
    assert constructed == {
        "model": "qwen3:4b",
        "base_url": "http://127.0.0.1:11434",
        "reasoning": False,
        "num_ctx": 16384,
        "num_predict": 1024,
        "temperature": 0,
        "keep_alive": "5m",
        "client_kwargs": {"timeout": 30, "follow_redirects": False, "trust_env": False},
        "async_client_kwargs": {
            "timeout": 30,
            "follow_redirects": False,
            "trust_env": False,
        },
    }
    schema = advertised_schemas["simulate_pc"]["mcp"]
    bound = local.bind_tools(
        [
            {
                "type": "function",
                "function": {"name": name, "parameters": schemas["mcp"]},
            }
            for name, schemas in advertised_schemas.items()
        ]
    )
    actual = next(
        tool["function"]["parameters"]
        for tool in bound.kwargs["tools"]
        if tool["function"]["name"] == "simulate_pc"
    )
    assert actual == inline_local_references(schema)
    legacy = {
        "pc_id": tower_simulation(2)["pc_id"],
        "data": {
            "expected_pc_revision": 1,
            "category": "cpu",
            "candidates": [{"component_id": "synthetic-only", "quantity": 1}],
        },
    }
    for candidate in (schema, actual):
        schema_validator(candidate, legacy)
        schema_validator(candidate, {**legacy, "configuration_schema": 1})
        schema_validator(candidate, tower_simulation(2))
        with pytest.raises(SchemaValidationError):
            schema_validator(candidate, tower_simulation(1))
        with pytest.raises(SchemaValidationError):
            schema_validator(candidate, {**legacy, "configuration_schema": 2})
    assert not attempts


def test_native_astream_http_tools_and_synthetic_tool_call_parsing(
    monkeypatch, registered_server
):
    """Real SDK serialization/parser over MockTransport, NOT a runtime/model test.

    Ollama native streaming is NDJSON, not SSE. Raw synthetic messages/HTTP body
    exist transiently in this transport only; retain/report closed metadata only.
    No invoke of tool handlers, model download, real HTTP or provider fallback.
    """
    isolated_settings(monkeypatch, UJ_CHAT_PROVIDER="ollama")
    original = ollama_schema.LocalChatOllama
    metadata = []
    expected = {}
    descriptions = {}
    synthetic_pc = tower_simulation(2)["pc_id"]

    def require(condition, code):
        if not condition:
            pytest.fail("LOCAL92_HTTP_CONTRACT " + code, pytrace=False)

    def require_native_structure(actual, expanded):
        # Only fields supported by the verified native schema. Root oneOf,
        # additionalProperties, format/min/max are NOT claimed preserved here.
        for key in ("type", "enum", "required"):
            if key in expanded:
                require(actual.get(key) == expanded[key], "native_constraint_changed")
        if "properties" in expanded:
            require(
                set(actual.get("properties", {})) == set(expanded["properties"]),
                "native_nested_properties_lost",
            )
            for name, nested in expanded["properties"].items():
                require_native_structure(actual["properties"][name], nested)
        if "items" in expanded:
            require_native_structure(actual.get("items", {}), expanded["items"])
        if "anyOf" in expanded:
            branches = actual.get("anyOf", [])
            require(len(branches) == len(expanded["anyOf"]), "native_union_lost")
            for branch, original_branch in zip(
                branches, expanded["anyOf"], strict=True
            ):
                require_native_structure(branch, original_branch)

    def transport(request):
        require(not metadata, "unexpected_second_request")
        require(request.method == "POST", "unexpected_method")
        require(
            str(request.url) == "http://127.0.0.1:11434/api/chat",
            "unexpected_endpoint",
        )
        payload = json.loads(request.content)
        tools = payload.get("tools")
        require(type(tools) is list and len(tools) == 7, "seven_tools_missing")
        require(
            all(
                type(tool) is dict and type(tool.get("function")) is dict
                for tool in tools
            ),
            "invalid_tool_shape",
        )
        names = [tool["function"].get("name") for tool in tools]
        require(all(type(name) is str for name in names), "invalid_tool_name_type")
        require(set(names) == set(INPUTS), "tool_inventory_changed")
        for tool in tools:
            function = tool["function"]
            parameters = function.get("parameters", {})
            properties = parameters.get("properties", {})
            before = expected[function["name"]]
            require(parameters == before, "envelope_schema_not_restored")
            require(
                function.get("description") == descriptions[function["name"]],
                "envelope_description_not_restored",
            )
            require_native_structure(parameters, before)
            require(
                set(properties) == set(before["properties"]),
                "argument_fields_lost_on_http",
            )
            require(
                parameters.get("required", []) == before.get("required", []),
                "required_arguments_lost_on_http",
            )
            stack = [parameters]
            while stack:
                node = stack.pop()
                if type(node) is dict:
                    require("$ref" not in node, "reference_left_on_http")
                    stack.extend(node.values())
                elif type(node) is list:
                    stack.extend(node)
            if function["name"] in ("evaluate_pc", "simulate_pc"):
                data = properties["data"]
                branches = data.get("anyOf", [data])
                require(
                    all(
                        "expected_pc_revision" in branch.get("properties", {})
                        for branch in branches
                    ),
                    "revision_field_lost_on_http",
                )
                if function["name"] == "simulate_pc":
                    legacy, tower = branches
                    require(
                        "category" in legacy.get("properties", {}),
                        "legacy_body_lost_on_http",
                    )
                    action = tower.get("properties", {}).get("actions", {})
                    require(action.get("type") == "array", "actions_lost_on_http")
                    candidates = (
                        action.get("items", {})
                        .get("properties", {})
                        .get("candidates", {})
                    )
                    require(
                        candidates.get("type") == "array"
                        and "quantity"
                        in candidates.get("items", {}).get("properties", {}),
                        "candidates_lost_on_http",
                    )
        require(payload.get("model") == "qwen3:4b", "model_changed")
        require(payload.get("stream") is True, "stream_missing")
        require(payload.get("think") is False, "thinking_not_disabled")
        options = payload.get("options", {})
        require(options.get("num_ctx") == 16384, "context_changed")
        require(options.get("num_predict") == 1024, "output_limit_changed")
        require(options.get("temperature") == 0, "temperature_changed")
        require(payload.get("keep_alive") == "5m", "keep_alive_changed")
        messages = payload.get("messages", [])
        require(
            bool(messages)
            and messages[0].get("role") == "system"
            and messages[0].get("content") == graph.POLICY,
            "system_policy_not_transmitted",
        )
        metadata.append(
            {
                "tool_names": sorted(names),
                "tool_count": len(tools),
                "schema_sha256": hashlib.sha256(
                    json.dumps(expected, sort_keys=True).encode("utf-8")
                ).hexdigest(),
                "request_bytes": len(request.content),
            }
        )
        frames = [
            {
                "model": "qwen3:4b",
                "created_at": "2026-10-27T00:00:00Z",
                "message": {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [
                        {
                            "function": {
                                "name": "get_pc",
                                "arguments": {"pc_id": synthetic_pc},
                            }
                        }
                    ],
                },
                "done": False,
            },
            {
                "model": "qwen3:4b",
                "created_at": "2026-10-27T00:00:00Z",
                "message": {"role": "assistant", "content": ""},
                "done": True,
                "done_reason": "stop",
            },
        ]
        return httpx.Response(
            200,
            headers={"content-type": "application/x-ndjson"},
            content="\n".join(json.dumps(frame) for frame in frames) + "\n",
        )

    def offline_constructor(**kwargs):
        options = dict(kwargs)
        for key in ("client_kwargs", "async_client_kwargs"):
            options[key] = {**kwargs[key], "transport": httpx.MockTransport(transport)}
        return original(**options)

    def forbidden_groq(*args, **kwargs):
        pytest.fail("LOCAL92_HTTP_CONTRACT groq_forbidden", pytrace=False)

    monkeypatch.setattr(provider, "model", forbidden_groq)
    monkeypatch.setattr(ollama_schema, "LocalChatOllama", offline_constructor)
    monkeypatch.setattr(
        ollama_schema.httpx,
        "HTTPTransport",
        lambda **kwargs: httpx.MockTransport(transport),
    )
    monkeypatch.setattr(
        ollama_schema.httpx,
        "AsyncHTTPTransport",
        lambda **kwargs: httpx.MockTransport(transport),
    )

    async def probe():
        listing = await registered_server.list_tools()
        arguments = [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description or "",
                    "parameters": tool.input_schema,
                },
            }
            for tool in listing
        ]
        snapshot = [deepcopy(tool.input_schema) for tool in listing]
        expected.update(
            {tool.name: inline_local_references(tool.input_schema) for tool in listing}
        )
        descriptions.update({tool.name: tool.description or "" for tool in listing})
        local = provider.chat_model(object()).bind_tools(arguments)
        require(
            [tool.input_schema for tool in listing] == snapshot,
            "mcp_metadata_mutated",
        )
        answer, saw_tool_chunks = None, False
        async for chunk in local.astream(
            [
                SystemMessage(content=graph.POLICY),
                HumanMessage(
                    content="Usa get_pc y evaluate_pc para la PC sintética seleccionada."
                ),
            ]
        ):
            saw_tool_chunks = saw_tool_chunks or bool(chunk.tool_call_chunks)
            answer = chunk if answer is None else answer + chunk
        require(saw_tool_chunks, "tool_call_chunks_missing")
        require(answer is not None and len(answer.tool_calls) == 1, "tool_call_missing")
        call = answer.tool_calls[0]
        require(call["name"] == "get_pc", "parsed_tool_name_changed")
        require(call["args"] == {"pc_id": synthetic_pc}, "parsed_arguments_changed")
        validate_call(call["name"], call["args"])

    try:
        asyncio.run(probe())
    except Exception:
        pytest.fail(
            "LOCAL92_HTTP_CONTRACT sdk_serialization_or_parse_failed", pytrace=False
        )
    require(len(metadata) == 1, "request_count_changed")


def test_inline_preserves_constraints_and_never_mutates_source(advertised_schemas):
    for name, schemas in advertised_schemas.items():
        original = schemas["mcp"]
        snapshot = deepcopy(original)
        expanded = inline_local_references(original)
        assert original == snapshot
        assert "$defs" not in expanded
        assert expanded["properties"].keys() == original["properties"].keys()
        assert expanded.get("required") == original.get("required")
        if name == "simulate_pc":
            assert len(expanded["oneOf"]) == 2
            assert expanded["properties"]["pc_id"]["format"] == "uuid"
            tower = expanded["properties"]["data"]["anyOf"][1]
            assert tower["additionalProperties"] is False
            assert tower["properties"]["actions"]["maxItems"] == 36
        stack = [expanded]
        while stack:
            node = stack.pop()
            if type(node) is dict:
                assert "$ref" not in node
                stack.extend(node.values())
            elif type(node) is list:
                stack.extend(node)


@pytest.mark.parametrize(
    "schema",
    [
        {"$ref": "https://example.invalid/schema"},
        {"$ref": "#/$defs/missing"},
        {"$defs": {"X": {"$ref": "#/$defs/X"}}, "$ref": "#/$defs/X"},
        {"$defs": {"X": {"type": "string"}}, "$ref": "#/$defs/X", "type": "integer"},
        {"$defs": {"unused": {"$ref": "https://example.invalid/unused"}}},
    ],
)
def test_inline_fails_closed_for_unsafe_or_ambiguous_schemas(schema):
    with pytest.raises(ValueError, match="^Invalid local tool metadata$"):
        inline_local_references(schema)


@pytest.mark.parametrize(
    "bound", ["MAX_SCHEMA_BYTES", "MAX_SCHEMA_NODES", "MAX_SCHEMA_DEPTH"]
)
def test_inline_enforces_expansion_bounds(monkeypatch, bound):
    schema = {
        "$defs": {"X": {"type": "string", "description": "synthetic"}},
        "properties": {"a": {"$ref": "#/$defs/X"}},
    }
    monkeypatch.setattr(ollama_schema, bound, 1)
    with pytest.raises(ValueError, match="^Invalid local tool metadata$"):
        inline_local_references(schema)


def test_inline_merges_annotation_and_nonoverlapping_constraint():
    original = {
        "$defs": {"X": {"type": "string", "description": "old"}},
        "$ref": "#/$defs/X",
        "description": "new",
        "minLength": 1,
    }
    assert inline_local_references(original) == {
        "type": "string",
        "description": "new",
        "minLength": 1,
    }


def binding_tools(schemas, marker):
    return [
        {
            "type": "function",
            "function": {
                "name": name,
                "description": marker,
                "parameters": deepcopy(value["mcp"]),
            },
        }
        for name, value in schemas.items()
    ]


def test_envelope_rewrites_only_tools_and_preserves_headers_timeouts(
    advertised_schemas,
):
    tools = binding_tools(advertised_schemas, "synthetic")
    tools_json = ollama_schema.bounded_json(tools)
    original = {
        "model": "qwen3:4b",
        "messages": [{"role": "tool", "content": "SYNTHETIC RESULT"}],
        "tools": [],
        "think": False,
        "stream": True,
        "options": {"num_ctx": 16384},
    }
    request = httpx.Request(
        "POST",
        ollama_schema.CHAT_URL,
        json=original,
        headers={"x-synthetic": "preserved"},
        extensions={"timeout": {"read": 30}, "synthetic": True},
    )
    before = request.content
    rewritten = ollama_schema.rewrite_request(request, before, tools_json)
    after = json.loads(rewritten.content)
    assert after.pop("tools") == tools
    assert after == {key: value for key, value in original.items() if key != "tools"}
    assert request.content == before
    assert rewritten.headers["x-synthetic"] == "preserved"
    assert rewritten.extensions == request.extensions
    assert int(rewritten.headers["content-length"]) == len(rewritten.content)
    assert rewritten.headers["content-length"] != request.headers["content-length"]


@pytest.mark.parametrize(
    "method,url,body",
    [
        ("GET", ollama_schema.CHAT_URL, b"{}"),
        ("POST", "http://127.0.0.1:11434/api/pull", b"{}"),
        ("POST", "http://remote.invalid/api/chat", b"{}"),
        ("POST", ollama_schema.CHAT_URL + "?x=1", b"{}"),
        ("POST", ollama_schema.CHAT_URL, b"[]"),
        ("POST", ollama_schema.CHAT_URL, b"{"),
        ("POST", ollama_schema.CHAT_URL, b" " * (ollama_schema.MAX_SCHEMA_BYTES + 1)),
    ],
    ids=["method", "pull", "host", "query", "array", "invalid-json", "oversize"],
)
def test_envelope_rejects_before_sync_or_async_delegate(method, url, body):
    attempts = []

    def forbidden(request):
        attempts.append(True)
        raise AssertionError("Envelope forwarded forbidden request")

    sync = ollama_schema.ToolsTransport(httpx.MockTransport(forbidden), b"[]")
    with pytest.raises(ValueError, match="^Invalid local tool metadata$"):
        sync.handle_request(httpx.Request(method, url, content=body))
    sync.close()

    async def probe():
        transport = ollama_schema.AsyncToolsTransport(
            httpx.MockTransport(forbidden), b"[]"
        )
        try:
            with pytest.raises(ValueError, match="^Invalid local tool metadata$"):
                await transport.handle_async_request(
                    httpx.Request(method, url, content=body)
                )
        finally:
            await transport.aclose()

    asyncio.run(probe())
    assert not attempts


def test_two_bindings_concurrent_streams_are_isolated_and_close_delegates(
    monkeypatch, advertised_schemas
):
    isolated_settings(monkeypatch, UJ_CHAT_PROVIDER="ollama")
    model = provider.chat_model(object())
    first_source = binding_tools(advertised_schemas, "A")
    first = model.bind_tools(first_source)
    second = model.bind_tools(binding_tools(advertised_schemas, "B"))
    first_source[0]["function"]["description"] = "mutated-input"
    first.kwargs["tools"][0]["function"]["description"] = "mutated-output"
    assert first.kwargs["tools"][0]["function"]["description"] == "A"
    delegates, seen = [], []

    class Delegate(httpx.MockTransport):
        def __init__(self):
            super().__init__(self.respond)
            self.closed = False
            delegates.append(self)

        async def respond(self, request):
            payload = json.loads(request.content)
            marker = payload["messages"][0]["content"]
            assert marker in ("A", "B")
            assert all(
                tool["function"]["description"] == marker for tool in payload["tools"]
            )
            assert request.extensions["timeout"]["read"] == 30
            assert int(request.headers["content-length"]) == len(request.content)
            seen.append(marker)
            await asyncio.sleep(0)
            return httpx.Response(
                200,
                headers={"content-type": "application/x-ndjson"},
                content=json.dumps(
                    {
                        "model": "qwen3:4b",
                        "done": True,
                        "message": {"role": "assistant", "content": "SYNTHETIC"},
                    }
                )
                + "\n",
            )

        def close(self):
            self.closed = True
            super().close()

        async def aclose(self):
            self.closed = True
            await super().aclose()

    monkeypatch.setattr(
        ollama_schema.httpx, "HTTPTransport", lambda **kwargs: Delegate()
    )
    monkeypatch.setattr(
        ollama_schema.httpx, "AsyncHTTPTransport", lambda **kwargs: Delegate()
    )

    async def consume(binding, marker):
        chunks = [
            chunk async for chunk in binding.astream([HumanMessage(content=marker)])
        ]
        assert any(chunk.content == "SYNTHETIC" for chunk in chunks)

    async def probe():
        await asyncio.gather(consume(first, "A"), consume(second, "B"))
        await consume(first, "A")

    asyncio.run(probe())
    assert sorted(seen) == ["A", "A", "B"]
    assert len(delegates) == 6 and all(delegate.closed for delegate in delegates)


def test_cancellation_closes_both_owned_transports(monkeypatch, advertised_schemas):
    isolated_settings(monkeypatch, UJ_CHAT_PROVIDER="ollama")
    binding = provider.chat_model(object()).bind_tools(
        binding_tools(advertised_schemas, "cancel")
    )
    delegates = []

    async def probe():
        entered = asyncio.Event()

        class BlockingDelegate(httpx.MockTransport):
            def __init__(self):
                super().__init__(self.respond)
                self.closed = False
                delegates.append(self)

            async def respond(self, request):
                entered.set()
                await asyncio.Event().wait()

            def close(self):
                self.closed = True
                super().close()

            async def aclose(self):
                self.closed = True
                await super().aclose()

        monkeypatch.setattr(
            ollama_schema.httpx, "HTTPTransport", lambda **kwargs: BlockingDelegate()
        )
        monkeypatch.setattr(
            ollama_schema.httpx,
            "AsyncHTTPTransport",
            lambda **kwargs: BlockingDelegate(),
        )

        async def consume():
            async for chunk in binding.astream([HumanMessage(content="SYNTHETIC")]):
                pass

        task = asyncio.create_task(consume())
        try:
            await asyncio.wait_for(entered.wait(), timeout=5)
        finally:
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task

    asyncio.run(probe())
    assert len(delegates) == 2 and all(delegate.closed for delegate in delegates)


def test_binding_rejects_changed_inventory_and_aggregate_metadata_size(
    monkeypatch, advertised_schemas
):
    isolated_settings(monkeypatch, UJ_CHAT_PROVIDER="ollama")
    model = provider.chat_model(object())
    tools = binding_tools(advertised_schemas, "synthetic")
    with pytest.raises(ValueError, match="^Invalid local tool metadata$"):
        model.bind_tools(tools[:-1])
    tools[0]["function"]["name"] = "unknown_tool"
    with pytest.raises(ValueError, match="^Invalid local tool metadata$"):
        model.bind_tools(tools)
    tools = binding_tools(
        advertised_schemas, "x" * (ollama_schema.MAX_SCHEMA_BYTES // 3)
    )
    with pytest.raises(ValueError, match="^Invalid local tool metadata$"):
        model.bind_tools(tools)


def test_reencoded_request_size_is_bounded(monkeypatch):
    monkeypatch.setattr(ollama_schema, "MAX_SCHEMA_BYTES", 128)
    request = httpx.Request("POST", ollama_schema.CHAT_URL, json={"messages": "x" * 70})
    with pytest.raises(ValueError, match="^Invalid local tool metadata$"):
        ollama_schema.rewrite_request(
            request, request.content, b'["' + b"x" * 70 + b'"]'
        )
