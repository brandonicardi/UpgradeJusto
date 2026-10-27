"""Local-only metadata expansion; native Ollama schemas remain guidance, not proof.

SDK/server native projection cannot represent all JSON Schema constraints.
MCP metadata and local authoritative validation are deliberately unchanged.
"""

import json
from copy import deepcopy
from dataclasses import dataclass

import httpx
from langchain_core.utils.function_calling import convert_to_openai_tool
from langchain_ollama import ChatOllama

from .tool_inputs import INPUTS

MAX_SCHEMA_BYTES = 1_048_576
MAX_SCHEMA_NODES = 50_000
MAX_SCHEMA_DEPTH = 64
ERROR = "Invalid local tool metadata"
CHAT_URL = "http://127.0.0.1:11434/api/chat"
ANNOTATIONS = frozenset(
    {
        "title",
        "description",
        "default",
        "examples",
        "deprecated",
        "readOnly",
        "writeOnly",
        "$comment",
    }
)


def inline_local_references(schema):
    """Expand only root-local $defs pointers, with bounded fail-closed copying."""
    try:
        encoded = json.dumps(schema, allow_nan=False).encode("utf-8")
    except (TypeError, ValueError, RecursionError):
        raise ValueError(ERROR) from None
    if type(schema) is not dict or len(encoded) > MAX_SCHEMA_BYTES:
        raise ValueError(ERROR)
    budget = [0, 0]

    def charge(nodes=0, size=0):
        budget[0] += nodes
        budget[1] += size
        if budget[0] > MAX_SCHEMA_NODES or budget[1] > MAX_SCHEMA_BYTES:
            raise ValueError(ERROR)

    def resolve(reference):
        if type(reference) is not str or not reference.startswith("#/$defs/"):
            raise ValueError(ERROR)
        target = schema
        for token in reference[2:].split("/"):
            if not token or "~" in token.replace("~1", "").replace("~0", ""):
                raise ValueError(ERROR)
            token = token.replace("~1", "/").replace("~0", "~")
            if type(target) is not dict or token not in target:
                raise ValueError(ERROR)
            target = target[token]
        return target

    def expand(node, active, depth):
        charge(nodes=1)
        if depth > MAX_SCHEMA_DEPTH:
            raise ValueError(ERROR)
        if type(node) is list:
            charge(size=2 + len(node))
            return [expand(value, active, depth + 1) for value in node]
        if type(node) is not dict:
            if node is not None and type(node) not in (str, bool, int, float):
                raise ValueError(ERROR)
            charge(size=len(json.dumps(node, allow_nan=False).encode("utf-8")))
            return node
        if any(key in node for key in ("$id", "$dynamicRef", "$recursiveRef")):
            raise ValueError(ERROR)
        charge(size=2)
        if "$ref" in node:
            reference = node["$ref"]
            if type(reference) is not str or reference in active:
                raise ValueError(ERROR)
            base = expand(resolve(reference), (*active, reference), depth + 1)
            siblings = expand(
                {key: value for key, value in node.items() if key != "$ref"},
                active,
                depth + 1,
            )
            if not siblings:
                return base
            if type(base) is not dict or (base.keys() & siblings.keys()) - ANNOTATIONS:
                raise ValueError(ERROR)
            return {**base, **siblings}
        result = {}
        for key, value in node.items():
            if type(key) is not str:
                raise ValueError(ERROR)
            charge(size=len(json.dumps(key).encode("utf-8")) + 2)
            # Expand/check even unused definitions; no hidden external/cyclic refs.
            result[key] = expand(value, active, depth + 1)
        return result

    expanded = expand(schema, (), 0)
    expanded.pop("$defs", None)
    if len(json.dumps(expanded, allow_nan=False).encode("utf-8")) > MAX_SCHEMA_BYTES:
        raise ValueError(ERROR)
    return expanded


class LocalChatOllama(ChatOllama):
    """Public binding extension; responses still use the native SDK parser."""

    def bind_tools(self, tools, **kwargs):
        expanded = []
        for tool in tools:
            try:
                converted = deepcopy(convert_to_openai_tool(tool))
            except (TypeError, ValueError, KeyError):
                raise ValueError(ERROR) from None
            function = converted.get("function")
            if (
                type(function) is not dict
                or type(function.get("parameters")) is not dict
            ):
                raise ValueError(ERROR)
            if "description" in function and type(function["description"]) is not str:
                raise ValueError(ERROR)
            function["parameters"] = inline_local_references(function["parameters"])
            expanded.append(converted)
        names = [tool["function"].get("name") for tool in expanded]
        if (
            len(names) != 7
            or not all(type(name) is str for name in names)
            or set(names) != set(INPUTS)
            or any(tool.get("type") != "function" for tool in expanded)
        ):
            raise ValueError(ERROR)
        config = {
            "model": self.model,
            "base_url": self.base_url,
            "reasoning": self.reasoning,
            "num_ctx": self.num_ctx,
            "num_predict": self.num_predict,
            "temperature": self.temperature,
            "keep_alive": self.keep_alive,
        }
        if config["base_url"] != "http://127.0.0.1:11434":
            raise ValueError(ERROR)
        return LocalToolsBinding(expanded, config, kwargs)


def bounded_json(value):
    try:
        encoded = json.dumps(value, allow_nan=False).encode("utf-8")
    except (TypeError, ValueError, RecursionError):
        raise ValueError(ERROR) from None
    if len(encoded) > MAX_SCHEMA_BYTES:
        raise ValueError(ERROR)
    stack, count = [(value, 0)], 0
    while stack:
        node, depth = stack.pop()
        count += 1
        if count > MAX_SCHEMA_NODES or depth > MAX_SCHEMA_DEPTH + 8:
            raise ValueError(ERROR)
        if type(node) is dict:
            stack.extend((child, depth + 1) for child in node.values())
        elif type(node) is list:
            stack.extend((child, depth + 1) for child in node)
    return encoded


def rewrite_request(request, content, tools_json):
    if request.method != "POST" or str(request.url) != CHAT_URL:
        raise ValueError(ERROR)
    if len(content) > MAX_SCHEMA_BYTES:
        raise ValueError(ERROR)
    try:
        payload = json.loads(content)
    except (ValueError, UnicodeDecodeError, RecursionError):
        raise ValueError(ERROR) from None
    if type(payload) is not dict:
        raise ValueError(ERROR)
    payload["tools"] = json.loads(tools_json)
    encoded = bounded_json(payload)
    headers = request.headers.copy()
    headers.pop("content-length", None)
    return httpx.Request(
        request.method,
        request.url,
        headers=headers,
        content=encoded,
        extensions=request.extensions.copy(),
    )


class ToolsTransport(httpx.BaseTransport):
    def __init__(self, delegate, tools_json):
        self.delegate, self.tools_json = delegate, tools_json

    def handle_request(self, request):
        return self.delegate.handle_request(
            rewrite_request(request, request.read(), self.tools_json)
        )

    def close(self):
        self.delegate.close()


class AsyncToolsTransport(httpx.AsyncBaseTransport):
    def __init__(self, delegate, tools_json):
        self.delegate, self.tools_json = delegate, tools_json

    async def handle_async_request(self, request):
        rewritten = rewrite_request(request, await request.aread(), self.tools_json)
        return await self.delegate.handle_async_request(rewritten)

    async def aclose(self):
        await self.delegate.aclose()


@dataclass(frozen=True)
class LocalToolsBinding:
    """Immutable per-binding metadata, per-stream clients and owned transports."""

    tools_json: bytes
    config_json: bytes
    bind_json: bytes

    def __init__(self, tools, config, kwargs):
        if "tools" in kwargs:
            raise ValueError(ERROR)
        object.__setattr__(self, "tools_json", bounded_json(tools))
        object.__setattr__(self, "config_json", bounded_json(config))
        object.__setattr__(self, "bind_json", bounded_json(kwargs))

    @property
    def kwargs(self):
        return {**json.loads(self.bind_json), "tools": json.loads(self.tools_json)}

    async def astream(self, *args, **kwargs):
        sync = ToolsTransport(httpx.HTTPTransport(trust_env=False), self.tools_json)
        asynchronous = None
        try:
            asynchronous = AsyncToolsTransport(
                httpx.AsyncHTTPTransport(trust_env=False), self.tools_json
            )
            native = ChatOllama(
                **json.loads(self.config_json),
                client_kwargs={
                    "timeout": 30,
                    "trust_env": False,
                    "follow_redirects": False,
                    "transport": sync,
                },
                async_client_kwargs={
                    "timeout": 30,
                    "trust_env": False,
                    "follow_redirects": False,
                    "transport": asynchronous,
                },
            )
            bound = native.bind_tools(
                json.loads(self.tools_json), **json.loads(self.bind_json)
            )
            async for chunk in bound.astream(*args, **kwargs):
                yield chunk
        finally:
            try:
                sync.close()
            finally:
                if asynchronous is not None:
                    await asynchronous.aclose()
