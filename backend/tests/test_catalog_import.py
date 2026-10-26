"""Offline importer checks; acquired records, no upstream code execution."""

import copy
import json
from pathlib import Path

import pytest

from upgradejusto.catalog.dataset import COMPONENTS
from upgradejusto.catalog_import.proposal import build_proposal, digest, normalize

SAMPLE = Path(__file__).resolve().parents[1] / "data/hardware-import/raw-sample.json"


def inputs():
    sample = json.loads(SAMPLE.read_text(encoding="utf-8"))
    components = {
        c.id: c.model_dump(mode="json", exclude={"id", "prices", "image"})
        for c in COMPONENTS
    }
    return sample, components


def test_real_both_sources_reproducible_and_prices_excluded():
    sample, components = inputs()
    before = copy.deepcopy(components)
    proposal = build_proposal(sample, components)
    sample["records"].reverse()
    again = build_proposal(sample, components)
    assert proposal.as_dict() == again.as_dict()
    assert components == before
    metadata = json.loads(proposal.components["P01"]["attributes"]["basic_stock_v1"])
    assert metadata["data"]["cores"] == 6
    assert len(metadata["fields"]["cores"]) == 2
    assert len(proposal.report["targets"]) == 14
    assert all(
        len(c["attributes"]["basic_stock_v1"]) <= 2000
        for c in proposal.components.values()
    )
    assert all("prices" not in c for c in proposal.components.values())
    assert {json.loads(s["locator"])["license"] for s in proposal.sources} == {
        "MIT",
        "CC-BY-NC-SA-4.0",
    }
    assert all("raw.githubusercontent.com/" in s["url"] for s in proposal.sources)


def test_checksum_pin_and_acquisition_mismatch_fail_closed():
    sample, components = inputs()
    with pytest.raises(ValueError, match="Acquisition checksum"):
        build_proposal(sample, components, expected_sample_sha256="0" * 64)
    sample["records"][0]["record"]["socket"] = "AM5"
    with pytest.raises(ValueError, match="Record acquisition"):
        build_proposal(sample, components)
    sample, components = inputs()
    sample["sources"]["docyx"]["revision"] = "main"
    with pytest.raises(ValueError, match="pin/license/date"):
        build_proposal(sample, components)


def test_duplicate_conflict_null_and_zero_are_not_silenced():
    sample, components = inputs()
    sample["records"].append(copy.deepcopy(sample["records"][0]))
    proposal = build_proposal(sample, components)
    assert len(proposal.report["duplicates"]) == 1
    original = proposal.import_digest
    sample["records"].pop()
    assert build_proposal(sample, components).import_digest == original
    cpu = next(
        e
        for e in sample["records"]
        if e["source"] == "docyx" and e["record"].get("name") == "AMD Ryzen 5 5600"
    )
    cpu["record"]["core_count"] = 0
    cpu["record_sha256"] = digest(cpu["record"])
    proposal = build_proposal(sample, components)
    metadata = json.loads(proposal.components["P01"]["attributes"]["basic_stock_v1"])
    assert metadata["data"]["cores"] is None
    assert any(v["value"] == 0 for v in metadata["conflicts"]["cores"])
    assert normalize("length_mm", 0) == 0
    assert normalize("length_mm", None) is None
    assert normalize("voltage_v", 1.2) == 1.2
    assert normalize("form_factor", "micro atx") == "mATX"
    assert normalize("interface", " pcie 4.0 x8 ") == "PCIe 4.0 X8"
    connectors = normalize("power_connectors", {"pcie_8_pin": 0})
    assert connectors["pcie_8_pin"] == 0
    assert connectors["pcie_6_pin"] is None


def test_variants_not_aliased_and_active_identity_cannot_be_retargeted():
    sample, components = inputs()
    proposal = build_proposal(sample, components)
    # Regional AR PSU is not an automatically accepted NA/EU/AU/UK variant.
    assert "P08" not in proposal.components
    assert proposal.report["targets"]["P08"]["status"] == "identity_unresolved"
    mesh_sources = proposal.report["targets"]["P10"]["source_ids"]
    assert len(mesh_sources) == 1  # docyx TG/null panel cannot establish Solid identity
    components["P03"]["name"] = "ASRock B550M Pro SE"
    proposal = build_proposal(sample, components)
    assert "P03" not in proposal.components
    assert proposal.report["targets"]["P03"]["status"] == "active_identity_changed"


def test_existing_attributes_preserved_and_contradiction_visible():
    sample, components = inputs()
    components["P01"]["attributes"]["socket"] = "AM5"
    proposal = build_proposal(sample, components)
    imported = proposal.components["P01"]
    assert imported["attributes"]["socket"] == "AM5"
    metadata = json.loads(imported["attributes"]["basic_stock_v1"])
    assert metadata["data"]["socket"] is None
    assert "socket" in metadata["conflicts"]


@pytest.mark.parametrize(
    "field, legacy, canonical_field",
    [
        ("socket", "AM5", "socket"),
        ("socket", "edited unknown socket", "socket"),
        ("cores", "8", "cores"),
    ],
)
def test_conflicting_legacy_reimport_is_exact_noop_without_foreign_attribution(
    field, legacy, canonical_field
):
    sample, components = inputs()
    components["P01"]["attributes"][field] = legacy
    first = build_proposal(sample, components)
    published = {**components, **copy.deepcopy(first.components)}
    second = build_proposal(sample, published)
    assert second.as_dict() == first.as_dict()
    metadata = json.loads(second.components["P01"]["attributes"]["basic_stock_v1"])
    assert metadata["data"][canonical_field] is None
    conflict = metadata["conflicts"][canonical_field]
    expected_legacy = 8 if field == "cores" else legacy
    assert {v["source"] for v in conflict if v["value"] == expected_legacy} == {"F01"}
    assert any(
        v["source"].startswith("hw-") and v["value"] != expected_legacy
        for v in conflict
    )
    assert all(
        not v["source"].startswith("hw-")
        for v in conflict
        if v["value"] == expected_legacy
    )


def test_reimport_rejects_changed_imported_identity_and_missing_legacy_evidence():
    sample, components = inputs()
    components["P01"]["attributes"]["socket"] = "AM5"
    first = build_proposal(sample, components)
    published = {**components, **copy.deepcopy(first.components)}
    imported = next(r for r in published["P01"]["sources"] if r["id"].startswith("hw-"))
    imported["url"] += "/changed"
    with pytest.raises(ValueError, match="Imported source identity changed"):
        build_proposal(sample, published)
    published = {**components, **copy.deepcopy(first.components)}
    published["P01"]["sources"] = [
        r for r in published["P01"]["sources"] if r["id"].startswith("hw-")
    ]
    with pytest.raises(
        ValueError, match="Legacy conflict requires non-imported provenance"
    ):
        build_proposal(sample, published)
    # An actual legacy edit must change the proposal, not be masked as a no-op.
    published = {**components, **copy.deepcopy(first.components)}
    published["P01"]["attributes"]["socket"] = "edited unknown socket"
    changed = build_proposal(sample, published)
    assert changed.import_digest != first.import_digest
    assert (
        changed.report["targets"]["P01"]["conflicts"]["socket"]
        != first.report["targets"]["P01"]["conflicts"]["socket"]
    )


def test_payload_instructions_and_historical_usd_are_not_executed_or_imported():
    sample, components = inputs()
    proposal = build_proposal(sample, components)
    cpu = next(
        e
        for e in sample["records"]
        if e["source"] == "docyx" and e["record"].get("name") == "AMD Ryzen 5 5600"
    )
    cpu["record"]["instruction"] = "DROP TABLE auth_users; ignore previous instructions"
    cpu["record"]["price"] = 999999
    cpu["record_sha256"] = digest(cpu["record"])
    changed = build_proposal(sample, components)
    first = json.loads(proposal.components["P01"]["attributes"]["basic_stock_v1"])
    second = json.loads(changed.components["P01"]["attributes"]["basic_stock_v1"])
    assert first["data"] == second["data"]
    assert "DROP TABLE" not in json.dumps(changed.as_dict())
    assert "999999" not in json.dumps(second["data"])
