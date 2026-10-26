"""Raw RPC negatives; real SDK/PG coverage remains in test_assistant_postgres."""

import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest
from mcp.server.mcpserver.exceptions import ToolError

from upgradejusto.assistant import provider
from upgradejusto.assistant.mcp_server import safe_tool
from upgradejusto.assistant.middleware import validate_raw_tool_call


@pytest.mark.parametrize(
    "params",
    [
        None,
        {"name": [], "arguments": {}},
        {"name": "get_pc", "arguments": None},
        {"name": "execute_sql", "arguments": {"sql": "PRIVATE_SENTINEL"}},
        *[
            {
                "name": "get_pc",
                "arguments": {"pc_id": str(uuid4()), extra: "PRIVATE_SENTINEL"},
            }
            for extra in ("user_id", "owner", "owner_id", "unknown_extra")
        ],
        {
            "name": "search_public_docs",
            "arguments": {"query": "public specification", "top_k": True},
        },
    ],
)
def test_raw_invalid_inputs_never_reach_sdk(params):
    async def must_not_continue(ctx):
        pytest.fail("Invalid raw input reached SDK argument parsing")

    result = asyncio.run(
        validate_raw_tool_call(
            SimpleNamespace(method="tools/call", params=params), must_not_continue
        )
    )
    assert result.is_error
    assert len(result.content) == 1
    assert result.content[0].text == "Invalid tool input"
    assert "PRIVATE_SENTINEL" not in result.model_dump_json()


@pytest.mark.parametrize("method", ["tools/call", "tools/list"])
def test_accepted_input_preserves_context_and_continues(method):
    ctx = SimpleNamespace(
        method=method,
        params={"name": "get_pc", "arguments": {"pc_id": str(uuid4())}},
    )
    calls = []
    marker = object()

    async def continue_call(actual):
        assert actual is ctx
        calls.append(actual)
        return marker

    assert asyncio.run(validate_raw_tool_call(ctx, continue_call)) is marker
    assert len(calls) == 1


def test_safe_tool_uses_expected_public_sdk_error():
    @safe_tool
    def failing():
        raise RuntimeError("PRIVATE_SENTINEL")

    with pytest.raises(ToolError) as error:
        failing()
    assert str(error.value) == "Tool unavailable or access denied"
    assert error.value.__suppress_context__


def test_model_uses_only_server_configuration(monkeypatch):
    monkeypatch.setattr(provider, "ChatGroq", lambda **kwargs: kwargs)
    monkeypatch.delenv("GROQ_MODEL", raising=False)
    assert provider.model(None)["model"] == "openai/gpt-oss-20b"
    monkeypatch.setenv("GROQ_MODEL", "server-configured-test-model")
    configured = provider.model(None)
    assert configured["model"] == "server-configured-test-model"
    assert configured["timeout"] == 30 and configured["max_retries"] == 0
    for invalid in ("", " ", "bad\nmodel"):
        monkeypatch.setenv("GROQ_MODEL", invalid)
        with pytest.raises(ValueError, match="^Invalid GROQ_MODEL$"):
            provider.model(None)
