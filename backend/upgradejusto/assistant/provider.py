"""TLS explicit, verified and identical in download/provider clients."""

import os
import re
import ssl

import certifi
import httpx
from langchain_groq import ChatGroq

LOCAL_EXTRACTION_SECONDS = 120


def tls_context():
    mode = os.environ.get("UJ_TLS_TRUST", "certifi")
    if mode == "system":
        return ssl.create_default_context()
    if mode == "certifi":
        return ssl.create_default_context(cafile=certifi.where())
    raise ValueError("Invalid UJ_TLS_TRUST")


def model(client, *, max_tokens=None):
    configured_model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
    if not 1 <= len(configured_model) <= 200 or any(
        character.isspace() or not character.isprintable()
        for character in configured_model
    ):
        raise ValueError("Invalid GROQ_MODEL")
    kwargs = {}
    if max_tokens is not None:
        kwargs["max_tokens"] = max_tokens
    if configured_model.startswith("openai/gpt-oss"):
        kwargs["reasoning_effort"] = "low"
    return ChatGroq(
        model=configured_model,
        timeout=30,
        max_retries=0,
        http_async_client=client,
        temperature=0,
        **kwargs,
    )


def local_model_name():
    name = os.environ.get("UJ_OLLAMA_MODEL", "qwen3:4b")
    matched = re.fullmatch(
        r"(?:[a-z0-9][a-z0-9._-]{0,63}/)?"
        r"[a-z0-9][a-z0-9._-]{0,63}:[a-z0-9][a-z0-9._-]{0,63}",
        name,
        flags=re.ASCII,
    )
    if matched is None or name.endswith((":cloud", "-cloud")):
        raise ValueError("Invalid local chat model")
    return name


def llamacpp_model(_client, *, max_tokens=1024, timeout=60):
    """llama-server on loopback only: its OpenAI dialect, without a real key."""
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=os.environ.get("UJ_LLAMACPP_MODEL", "local"),
        base_url="http://127.0.0.1:8081/v1",
        api_key="local-llamacpp",
        temperature=0,
        max_tokens=max_tokens,
        timeout=timeout,
        max_retries=0,
        extra_body={"chat_template_kwargs": {"enable_thinking": False}},
    )


def chat_model(client):
    """CU08 only; extraction picks its own provider in extraction_model."""
    selected = os.environ.get("UJ_CHAT_PROVIDER", "groq")
    if selected == "groq":
        return model(client, max_tokens=800)
    if selected == "llamacpp":
        return llamacpp_model(client)
    if selected != "ollama":
        raise ValueError("Invalid chat provider")
    if os.environ.get("UJ_OLLAMA_BASE_URL", "http://127.0.0.1:11434") != (
        "http://127.0.0.1:11434"
    ):
        raise ValueError("Invalid local chat URL")
    name = local_model_name()
    from .ollama_schema import LocalChatOllama

    return LocalChatOllama(
        model=name,
        base_url="http://127.0.0.1:11434",
        reasoning=False,
        num_ctx=16384,
        num_predict=1024,
        temperature=0,
        keep_alive="5m",
        client_kwargs={"timeout": 30, "follow_redirects": False, "trust_env": False},
        async_client_kwargs={
            "timeout": 30,
            "follow_redirects": False,
            "trust_env": False,
        },
    )


def extraction_provider():
    selected = os.environ.get("UJ_EXTRACTION_PROVIDER", "groq")
    if selected not in {"groq", "llamacpp"}:
        raise ValueError("Invalid extraction provider")
    return selected


def extraction_seconds():
    """Local reads the whole catalog excerpt on one GPU: it needs a longer deadline."""
    return LOCAL_EXTRACTION_SECONDS if extraction_provider() == "llamacpp" else 30


def extraction_model(client):
    """Explicit choice, never a silent fallback from one provider to the other."""
    if extraction_provider() == "llamacpp":
        return llamacpp_model(client, max_tokens=4096, timeout=LOCAL_EXTRACTION_SECONDS)
    return model(client)


def http_client():
    return httpx.AsyncClient(verify=tls_context(), timeout=30, follow_redirects=False)
