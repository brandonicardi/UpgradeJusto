"""Requires real PG/migration I and MCP SDK subprocess; no memory DB fallback."""

import asyncio
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi import HTTPException
from mcp import Client, StdioServerParameters
from test_pcs_postgres import actors as actors
from test_pcs_postgres import create

from upgradejusto.assistant.models import MessageCreate
from upgradejusto.assistant.repository import Repository
from upgradejusto.assistant.tables import conversations
from upgradejusto.auth.repository import AuthRepository
from upgradejusto.auth.security import digest


@pytest.fixture
def assistant_actors(actors, pg_engine):
    try:
        yield actors
    finally:
        with pg_engine.begin() as conn:
            conn.execute(
                conversations.delete().where(
                    conversations.c.owner_id.in_([a[2] for a in actors])
                )
            )


def test_pg_history_idempotence_isolation_and_concurrency(assistant_actors, pg_engine):
    a, b = assistant_actors
    repo = Repository(pg_engine)
    cid = repo.create(a[2], "Privada")["id"]
    data = MessageCreate(content="mensaje", client_request_id=uuid4())
    with pytest.raises(HTTPException) as denied:
        repo.begin(b[2], cid, data)
    assert denied.value.status_code == 404
    mid = repo.begin(a[2], cid, data)
    for action in [lambda: repo.begin(a[2], cid, data), lambda: repo.delete(a[2], cid)]:
        with pytest.raises(HTTPException) as conflict:
            action()
        assert conflict.value.status_code == 409
    repo.finish(a[2], cid, mid, "requiere_verificacion", "completed", [])
    pg_engine.dispose()
    reread = Repository(pg_engine).page(a[2], 1, 20, cid)
    assert [r["role"] for r in reread["items"]] == ["user", "assistant"]
    assert reread["items"][1]["content"] == "requiere_verificacion"

    def attempt():
        try:
            return repo.begin(
                a[2], cid, MessageCreate(content="x", client_request_id=uuid4())
            )
        except HTTPException as exc:
            return exc.status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: attempt(), range(2)))
    assert results.count(409) == 1
    successful = next(value for value in results if value != 409)
    repo.finish(a[2], cid, successful, "", "interrupted", [])
    repo.delete(a[2], cid)


def test_real_mcp_owner_checks_and_live_revocation(assistant_actors, pg_engine):
    a, b = assistant_actors
    own, foreign = create(a), create(b)
    raw = a[0].cookies.get("uj_session")
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
    env = {k: v for k, v in os.environ.items() if k in allowed}
    env["UJ_ASSISTANT_SESSION"] = raw
    cid = Repository(pg_engine).create(a[2], "MCP fixture")["id"]
    env["UJ_ASSISTANT_CONVERSATION"] = str(cid)

    async def probe():
        params = StdioServerParameters(
            command=sys.executable,
            args=["-m", "upgradejusto.assistant.mcp_server"],
            env=env,
        )
        async with Client(params) as client:
            listing = await client.list_tools()
            assert all(tool.output_schema is not None for tool in listing.tools)
            names = {tool.name for tool in listing.tools}
            expected = {
                "catalog_search",
                "get_pc",
                "evaluate_pc",
                "simulate_pc",
                "preview_recommendations",
                "get_plan",
            }
            if os.environ.get("UJ_ASSISTANT_RAG_CONFIG"):
                expected.add("search_public_docs")
            assert names == expected
            found = await client.call_tool("get_pc", {"pc_id": own["id"]})
            assert not found.is_error
            for extra in ("user_id", "owner", "owner_id", "unknown_extra"):
                invalid = await client.call_tool(
                    "get_pc", {"pc_id": own["id"], extra: str(b[2])}
                )
                assert invalid.is_error
                assert len(invalid.content) == 1
                assert invalid.content[0].text == "Invalid tool input"
            invalid_top_k = await client.call_tool(
                "search_public_docs", {"query": "public specification", "top_k": True}
            )
            assert invalid_top_k.is_error
            assert len(invalid_top_k.content) == 1
            assert invalid_top_k.content[0].text == "Invalid tool input"
            still_own = await client.call_tool("get_pc", {"pc_id": own["id"]})
            assert not still_own.is_error
            denied = await client.call_tool("get_pc", {"pc_id": foreign["id"]})
            assert denied.is_error
            malicious = await client.call_tool(
                "get_pc", {"pc_id": foreign["id"], "user_id": str(b[2])}
            )
            assert malicious.is_error
            missing = await client.call_tool("execute_sql", {"sql": "SELECT 1"})
            assert missing.is_error
            AuthRepository(pg_engine).revoke(digest(raw))
            expired = await client.call_tool("get_pc", {"pc_id": own["id"]})
            assert expired.is_error

    asyncio.run(probe())
