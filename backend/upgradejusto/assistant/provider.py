"""TLS explicit, verified and identical in download/provider clients."""

import os
import ssl

import certifi
import httpx
from langchain_groq import ChatGroq


def tls_context():
    mode = os.environ.get("UJ_TLS_TRUST", "certifi")
    if mode == "system":
        return ssl.create_default_context()
    if mode == "certifi":
        return ssl.create_default_context(cafile=certifi.where())
    raise ValueError("Invalid UJ_TLS_TRUST")


def model(client):
    configured_model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
    if not 1 <= len(configured_model) <= 200 or any(
        character.isspace() or not character.isprintable()
        for character in configured_model
    ):
        raise ValueError("Invalid GROQ_MODEL")
    return ChatGroq(
        model=configured_model,
        timeout=30,
        max_retries=0,
        http_async_client=client,
        temperature=0,
    )


def http_client():
    return httpx.AsyncClient(verify=tls_context(), timeout=30, follow_redirects=False)
