"""Billable live gate, opt-in only; never reports mocks as a live assistant."""

import os

import pytest
from test_assistant_postgres import assistant_actors as assistant_actors
from test_pcs_postgres import actors as actors

_LIVE_SKIP_REASON = None
if os.environ.get("UJ_TEST_ASSISTANT_LIVE") != "1":
    _LIVE_SKIP_REASON = "Live Groq/MCP gate not requested; CU08 not verified"
elif not os.environ.get("GROQ_API_KEY"):
    _LIVE_SKIP_REASON = "GROQ_API_KEY not configured"


@pytest.mark.skipif(
    _LIVE_SKIP_REASON is not None,
    reason=_LIVE_SKIP_REASON or "skip",
)
def test_live_catalog_tool_completes(assistant_actors):
    from uuid import uuid4

    a, b = assistant_actors
    created = a[0].post(
        "/api/conversations", json={"title": "Live catalog search"}, headers=a[1]
    )
    assert created.status_code == 201
    cid = created.json()["id"]
    assert b[0].get(f"/api/conversations/{cid}").status_code == 404
    response = a[0].post(
        f"/api/conversations/{cid}/messages",
        headers=a[1],
        json={
            "content": "Buscá placas de video en el catálogo",
            "client_request_id": str(uuid4()),
        },
    )
    assert response.status_code == 200
    text = response.text
    assert "event: start" in text
    assert "event: tool_status" in text
    completed = [
        line
        for line in text.splitlines()
        if "event: tool_status" in line or '"status": "completed"' in line
    ]
    assert len(completed) >= 1
    assert "event: delta" in text
    assert "event: done" in text and "event: error" not in text
    history = a[0].get(f"/api/conversations/{cid}/messages")
    assert history.status_code == 200
    rows = history.json()["items"]
    assert len(rows) == 2
    assert rows[1]["status"] == "completed"
    assert rows[1]["content"]
