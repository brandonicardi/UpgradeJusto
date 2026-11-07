"""Extraction names its provider explicitly and never falls back in silence."""

import pytest

from upgradejusto.assistant import provider
from upgradejusto.extraction.tower_provider import withdraw_unproved


def test_groq_stays_the_default(monkeypatch):
    monkeypatch.delenv("UJ_EXTRACTION_PROVIDER", raising=False)
    monkeypatch.setattr(provider, "model", lambda client: ("groq", client))
    assert provider.extraction_model("c") == ("groq", "c")
    assert provider.extraction_seconds() == 30


def test_local_gets_room_for_the_catalog_and_a_longer_deadline(monkeypatch):
    seen = {}

    def local(client, **options):
        seen.update(options)
        return "local"

    monkeypatch.setenv("UJ_EXTRACTION_PROVIDER", "llamacpp")
    monkeypatch.setattr(provider, "llamacpp_model", local)
    assert provider.extraction_model(None) == "local"
    assert seen["max_tokens"] >= 4096
    assert provider.extraction_seconds() == provider.LOCAL_EXTRACTION_SECONDS


def test_unknown_provider_is_rejected(monkeypatch):
    monkeypatch.setenv("UJ_EXTRACTION_PROVIDER", "otro")
    with pytest.raises(ValueError):
        provider.extraction_model(None)


def test_a_count_without_its_marker_becomes_unknown_never_invented():
    line = {"quantity": 1, "quantity_excerpt": None}
    raw = {
        "categories": [{"category": "storage", "status": "present", "lines": [line]}]
    }
    assert withdraw_unproved(raw)["categories"][0]["lines"][0]["quantity"] is None


def test_a_marked_count_and_a_single_part_stay_as_they_are():
    ram = {"quantity": 2, "quantity_excerpt": "2x DDR4"}
    cpu = {"quantity": 1, "quantity_excerpt": None}
    raw = {
        "categories": [
            {"category": "ram", "status": "present", "lines": [ram]},
            {"category": "cpu", "status": "present", "lines": [cpu]},
        ]
    }
    withdraw_unproved(raw)
    assert ram["quantity"] == 2 and cpu["quantity"] == 1


def test_an_oversized_absence_is_withdrawn():
    raw = {
        "categories": [
            {
                "category": "fan",
                "status": "absent",
                "absence_excerpt": "x" * 200,
                "lines": [],
            }
        ]
    }
    assert withdraw_unproved(raw)["categories"][0]["absence_excerpt"] is None
