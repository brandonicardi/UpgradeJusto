"""Versioned manufacturer facts: provenance and exact identity, all or nothing."""

import json
from copy import deepcopy
from pathlib import Path

import pytest

from upgradejusto.administration.models import validate_data
from upgradejusto.catalog_import.manufacturer import build_manufacturer_proposal
from upgradejusto.retail.technical_parser import load_technical_envelope

FACTS = Path(__file__).resolve().parents[2] / "data/catalogo/tecnicos/fabricante.json"
EXCLUDED = {
    "cooler",
    "fan",
}
DERIVED_OR_UNLABELED = {
    "fan_headers",
    "storage_bays",
    "psu_limit_mm",
    "jedec_mts",
    "ecc",
    "cpu_platform",
    "cpu_tdp_class_w",
}


def document():
    return json.loads(FACTS.read_text(encoding="utf-8"))


def catalog(data):
    components, mpns = {}, {}
    for entry in data["components"]:
        components[entry["component_id"]] = {
            "category": entry["category"],
            "name": entry["name"],
            "attributes": {"tower_stock_v1": None},
            "sources": [{"id": "retail", "url": "https://retail.example/p"}],
        }
        mpns[entry["component_id"]] = entry["mpn"]
    return components, mpns


def test_every_fact_has_a_known_source_date_and_location():
    data = document()
    sources = {row["source_id"] for row in data["sources"]}
    assert data["consulted_on"]
    assert all(row["url"].startswith("https://") for row in data["sources"])
    for entry in data["components"]:
        assert entry["identity_source"] in sources
        assert entry["facts"]
        for fact in entry["facts"].values():
            assert fact["source"] in sources
            assert fact["locator"].strip()


def test_excludes_cooling_and_derived_or_ambiguous_readings():
    data = document()
    assert not {entry["category"] for entry in data["components"]} & EXCLUDED
    for entry in data["components"]:
        assert not set(entry["facts"]) & DERIVED_OR_UNLABELED


def test_proposal_keeps_attributes_and_validates_as_a_published_component():
    data = document()
    components, mpns = catalog(data)
    components["cg-13355"]["attributes"]["basic_stock_v1"] = None
    proposal = build_manufacturer_proposal(data, components, mpns)
    assert set(proposal.components) == set(components)
    for identity, row in proposal.components.items():
        envelope = load_technical_envelope(row["attributes"]["tower_stock_v1"])
        assert envelope.identity.component_id == identity
        assert {"id": "retail", "url": "https://retail.example/p"} in row["sources"]
        pairs = {(s["id"], s["url"]) for s in row["sources"]}
        assert {(r.source_id, r.url) for r in envelope.references()} <= pairs
        assert validate_data("components", row)
    assert "basic_stock_v1" in proposal.components["cg-13355"]["attributes"]
    for row in proposal.support:
        assert validate_data("cpu_support", row)


def test_repeating_gives_the_same_proposal():
    data = document()
    components, mpns = catalog(data)
    first = build_manufacturer_proposal(data, deepcopy(components), mpns)
    assert first == build_manufacturer_proposal(data, deepcopy(components), mpns)


def test_published_sources_are_not_duplicated_on_a_second_run():
    data = document()
    components, mpns = catalog(data)
    first = build_manufacturer_proposal(data, components, mpns).components
    second = build_manufacturer_proposal(data, first, mpns).components
    assert second == first


@pytest.mark.parametrize(
    "tamper",
    [
        lambda components, mpns: components.pop("cg-13355"),
        lambda components, mpns: components["cg-13355"].update(name="Otro nombre"),
        lambda components, mpns: components["cg-13355"].update(category="gpu"),
        lambda components, mpns: mpns.update({"cg-13355": "OTRO-MPN"}),
        lambda components, mpns: mpns.pop("cg-13355"),
    ],
)
def test_any_identity_difference_rejects_everything(tamper):
    data = document()
    components, mpns = catalog(data)
    tamper(components, mpns)
    with pytest.raises(ValueError, match="(?i)manufacturer"):
        build_manufacturer_proposal(data, components, mpns)


def test_unknown_version_is_rejected():
    data = document()
    data["version"] = 2
    with pytest.raises(ValueError):
        build_manufacturer_proposal(data, *catalog(document()))
