"""Billable live gate, opt-in only; never reports mocks as a live assistant."""

import os

import pytest
from test_assistant_postgres import assistant_actors as assistant_actors
from test_pcs_postgres import actors as actors


@pytest.mark.skipif(
    os.environ.get("UJ_TEST_ASSISTANT_LIVE") != "1",
    reason="Live Groq/MCP/RAG gate not requested; CU08 not verified",
)
def test_live_sse_tool_citation_and_history(assistant_actors):
    from uuid import uuid4

    a, b = assistant_actors
    created = a[0].post(
        "/api/conversations", json={"title": "Live public evidence"}, headers=a[1]
    )
    assert created.status_code == 201
    cid = created.json()["id"]
    assert b[0].get(f"/api/conversations/{cid}").status_code == 404
    response = a[0].post(
        f"/api/conversations/{cid}/messages",
        headers=a[1],
        json={
            "content": "Usa search_public_docs para buscar Kingston DDR4 KVR32N22S8/8 memory specifications. Cita el documento recuperado, no inventes datos y aclara que no es un veredicto de compatibilidad.",
            "client_request_id": str(uuid4()),
        },
    )
    assert response.status_code == 200
    assert "event: start" in response.text
    assert "event: tool_status" in response.text
    assert "event: citation" in response.text
    assert "event: delta" in response.text
    assert "event: done" in response.text and "event: error" not in response.text
    history = a[0].get(f"/api/conversations/{cid}/messages")
    assert history.status_code == 200
    rows = history.json()["items"]
    assert len(rows) == 2
    assert rows[1]["status"] == "completed" and rows[1]["citations"]
