"""Real structured sample through importer and stock adapter; not a PG test."""

import json
from pathlib import Path

import pytest
from test_basic_stock_scenarios import base, catalog

from upgradejusto.catalog.dataset import COMPONENTS
from upgradejusto.catalog.models import Component
from upgradejusto.catalog.service import ResolvedCatalog
from upgradejusto.catalog_import.proposal import build_proposal
from upgradejusto.compatibility.application import evaluate_current
from upgradejusto.compatibility.basic_manufacturer import resolve_stock_specs


def imported_catalog():
    path = Path(__file__).resolve().parents[1] / "data/hardware-import/raw-sample.json"
    sample = json.loads(path.read_text(encoding="utf-8"))
    components = {
        part.id: part.model_dump(mode="json", exclude={"id", "prices", "image"})
        for part in COMPONENTS
    }
    proposal = build_proposal(sample, components)
    original = catalog()
    parts = [
        Component(id=part.id, **proposal.components[part.id], prices=part.prices)
        if part.id in proposal.components
        else part
        for part in COMPONENTS
    ]
    rows = {
        (row["source_id"], row["url"]): row
        for row in [*original.source_rows, *proposal.sources]
    }
    return ResolvedCatalog(parts, original.support_rows, list(rows.values()))


def test_real_imported_ram_descriptors_refined_with_manufacturer_proof():
    pinned = imported_catalog()
    before = {identity: part.model_dump_json() for identity, part in pinned.items()}
    for identity in ("P04", "P05"):
        metadata = json.loads(pinned[identity].attributes["basic_stock_v1"])
        assert metadata["data"]["module_type"] == "288-PIN DIMM"
        specs = resolve_stock_specs(pinned[identity], pinned)
        assert specs.fact("module_type") == "UDIMM"
        assert specs.fact("module_type_description") == "288-PIN DIMM"
        source_ids = {ref.source_id for ref in specs.evidence("module_type")}
        assert "F05" in source_ids
        assert any(identity.startswith("hw-") for identity in source_ids)
    for second in (False, True):
        assert (
            evaluate_current(base(second), pinned, 1, "unit-real-import").verdict
            == "compatible"
        )
    assert before == {
        identity: part.model_dump_json() for identity, part in pinned.items()
    }


def test_mechanical_pins_without_manufacturer_proof_remain_unknown():
    pinned = imported_catalog()
    pinned.source_rows = [
        row for row in pinned.source_rows if row["source_id"] != "F05"
    ]
    result = evaluate_current(base(), pinned, 1, "unit-real-import")
    assert result.verdict == "requiere_verificacion"
    assert "ram.module_1.module_type" in result.missing_fields
    assert resolve_stock_specs(pinned["P04"], pinned).fact("module_type") != "UDIMM"


@pytest.mark.parametrize(
    "description,buffering",
    [
        ("SODIMM", "NO"),
        ("RDIMM", "REGISTERED"),
        ("288-PIN DIMM", "REGISTERED"),
    ],
)
def test_real_type_or_buffering_disagreement_is_not_lexically_refined(
    description, buffering
):
    pinned = imported_catalog()
    part = pinned["P04"]
    metadata = json.loads(part.attributes["basic_stock_v1"])
    metadata["data"].update(module_type=description, buffering=buffering)
    attrs = {
        **part.attributes,
        "basic_stock_v1": json.dumps(metadata, separators=(",", ":")),
    }
    pinned["P04"] = part.model_copy(update={"attributes": attrs})
    specs = resolve_stock_specs(pinned["P04"], pinned)
    assert "module_type_description" not in specs.fields
    assert (
        evaluate_current(base(), pinned, 1, "unit-semantic-mutation").verdict
        != "compatible"
    )
