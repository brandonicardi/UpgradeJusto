"""One billable Groq extraction, opt-in only; never runs CU08 live chat suite."""

import os

import pytest
from test_pcs_postgres import actors as actors


@pytest.mark.skipif(
    os.environ.get("UJ_TEST_EXTRACTION_LIVE") != "1",
    reason="CU02 real Groq opt-in not requested",
)
def test_groq_catalog_preview_and_edited_confirmation(actors):
    a, b = actors
    before = a[0].get("/api/pcs").json()["total"]
    result = a[0].post(
        "/api/pcs/extract",
        headers=a[1],
        json={
            "text": "Mi CPU es AMD Ryzen 5 5600 100-100000927BOX. El resto es desconocido."
        },
    )
    assert result.status_code == 200, result.text
    body = result.json()
    assert a[0].get("/api/pcs").json()["total"] == before
    assert any(c["component_id"] == "P01" for c in body["proposal"]["components"])
    body["proposal"]["name"] = "CU02 live confirmed manual edit"
    saved = a[0].post(
        "/api/pcs/extract/confirm",
        headers=a[1],
        json={
            "confirmed": True,
            "pc": body["proposal"],
            "metadata": {"dataset_version": body["dataset_version"], "edited": True},
        },
    )
    assert saved.status_code == 201
    assert b[0].get(f"/api/pcs/{saved.json()['id']}").status_code == 404
