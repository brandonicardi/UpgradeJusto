"""Synthetic publication/engine adapter proofs, NOT real hardware certification."""

import json
from copy import deepcopy
from types import SimpleNamespace

import pytest
from test_tower38_engine import REF, fixture

from upgradejusto.catalog.models import Component, Source
from upgradejusto.catalog.service import ResolvedCatalog
from upgradejusto.compatibility.basic_manufacturer import (
    MANUFACTURER_VERSION,
    resolve_stock_specs,
)
from upgradejusto.compatibility.basic_specs import BasicSpecs
from upgradejusto.compatibility.reference_knowledge import REFERENCE_VERSION
from upgradejusto.compatibility.tower_contract import (
    NominalResource,
    SharedLimit,
    TowerComponentEvidence,
    TowerTechnicalEvidenceDTO,
)
from upgradejusto.compatibility.tower_engine import evaluate_tower
from upgradejusto.compatibility.tower_evidence import (
    ADAPTER_VERSION,
    resolve_tower_evidence,
)
from upgradejusto.compatibility.tower_technical_resolver import (
    resolve_published_technical,
)
from upgradejusto.retail.technical_parser import SCHEMA


def envelope(category, data, name=None):
    ref = REF.model_dump(mode="json")
    return {
        "version": 1,
        "identity": {
            "component_id": category,
            "category": category,
            "name": name or category,
            "manufacturer_part_number": None,
            "source_refs": [ref],
        },
        "data": data,
        "fields": {key: [ref] for key in data},
        "conflicts": {},
        "import_digest": "d" * 64,
    }


def part(category, payload=None, basic_raw=None):
    attrs = {}
    if payload is not None:
        attrs["tower_stock_v1"] = json.dumps(payload)
    if basic_raw is not None:
        attrs["basic_stock_v1"] = json.dumps(basic_raw)
    return Component(
        id=category,
        category=category,
        name=category,
        attributes=attrs,
        sources=(Source(id=REF.source_id, url=REF.url),),
    )


def catalog_for(parts, rows=None):
    return ResolvedCatalog(
        parts, (), (REF.model_dump(mode="json"),) if rows is None else rows
    )


def synthetic_full_publication(monkeypatch):
    """Reuse accepted synthetic motor fixture, not manufacturer fallback/matching."""
    tower, fields, support = fixture()
    parts, basics = [], {}
    for category, values in fields.items():
        allowed = SCHEMA.get(category, {})
        technical = {
            key: deepcopy(value)
            for key, value in values.items()
            # Largo queda en la evidencia base: las pruebas lo cambian para fallar.
            if key in allowed and key not in ("length_mm", "gpu_limit_mm")
        }
        for key in ("tower_ports", "storage_bays", "fan_headers"):
            for resource in technical.get(key, []):
                for name, default in {
                    "voltage_mv": None,
                    "max_current_ma": None,
                    "excludes": [],
                    "group": None,
                    "cost": 1,
                }.items():
                    resource.setdefault(name, default)
        baseline = {key: value for key, value in values.items() if key not in technical}
        basics[category] = BasicSpecs(
            baseline, {key: (REF,) for key in baseline}, frozenset(), "c" * 64
        )
        parts.append(
            part(category, envelope(category, technical) if technical else None)
        )
    catalog = catalog_for(parts)
    catalog.support_rows = (
        SimpleNamespace(
            cpu_component_id="cpu",
            motherboard_component_id="motherboard",
            cpu_socket=support.cpu_socket,
            motherboard_socket=support.motherboard_socket,
            applicable_revision=support.applicable_revision,
            row=support.support_rows[0],
        ),
    )
    monkeypatch.setattr(
        "upgradejusto.compatibility.tower_evidence.resolve_stock_specs",
        lambda component, pinned: basics[component.id],
    )
    return tower, catalog, basics


def test_complete_synthetic_runtime_adapter_positive_and_typed_resources(monkeypatch):
    tower, catalog, _ = synthetic_full_publication(monkeypatch)
    before = {key: value.model_dump(mode="json") for key, value in catalog.items()}
    evidence = resolve_tower_evidence(tower, catalog, "synthetic-publication-fixed")
    result = evaluate_tower(tower, evidence)
    assert result.verdict == "compatible"
    assert result.coverage.complete
    board = evidence.components["motherboard"].specs
    assert isinstance(board.fact("tower_ports")[0], NominalResource)
    assert board.fact("fan_headers")[0].accepts == ("4pin",)
    assert board.evidence("tower_ports") == (REF,)
    assert "tower-technical-publication-adapter-1:valid:" in evidence.data_revision
    assert evidence == resolve_tower_evidence(
        tower, catalog, "synthetic-publication-fixed"
    )
    assert before == {
        key: value.model_dump(mode="json") for key, value in catalog.items()
    }


@pytest.mark.parametrize(
    "failure", ["source", "date", "locator", "identity", "category", "missing_rows"]
)
def test_bad_publication_stays_unknown_and_known_failure_survives(monkeypatch, failure):
    tower, catalog, basics = synthetic_full_publication(monkeypatch)
    payload = json.loads(catalog["storage"].attributes["tower_stock_v1"])
    if failure == "missing_rows":
        catalog.source_rows = ()
    elif failure in {"identity", "category"}:
        payload["identity"]["component_id" if failure == "identity" else "category"] = (
            "other"
        )
    else:
        key, value = {
            "source": ("source_id", "not-published"),
            "date": ("consulted_on", "2026-10-25"),
            "locator": ("locator", "different synthetic section"),
        }[failure]
        payload["fields"]["storage_form"][0][key] = value
    catalog["storage"] = part("storage", payload)
    evidence = resolve_tower_evidence(tower, catalog, "synthetic-fixed")
    result = evaluate_tower(tower, evidence)
    assert result.verdict == "requiere_verificacion"
    assert result.missing_fields
    assert not result.coverage.complete
    assert "adapter-1:invalid:" in evidence.data_revision
    assert "https://" not in evidence.data_revision
    basics["gpu"].fields["length_mm"] = 400
    failed = evaluate_tower(
        tower, resolve_tower_evidence(tower, catalog, "synthetic-fixed")
    )
    assert failed.verdict == "incompatible"
    assert "T04" in failed.coverage.failed
    assert failed.missing_fields


def test_explicit_conflict_clears_basic_fact_without_overwriting_other_evidence():
    other_ref = {
        **REF.model_dump(mode="json"),
        "source_id": "synthetic-second-source",
        "url": "https://example.org/synthetic-second-source",
    }
    basic_raw = {
        "version": 1,
        "data": {"cooler_height_limit_mm": 160},
        "fields": {"cooler_height_limit_mm": [REF.source_id]},
        "conflicts": {},
        "import_digest": "b" * 64,
    }
    payload = envelope("case", {})
    payload["conflicts"] = {
        "cooler_height_limit_mm": [
            {"value": 160, "source_refs": [REF.model_dump(mode="json")]},
            {"value": 150, "source_refs": [other_ref]},
        ]
    }
    component = part("case", payload, basic_raw)
    component = component.model_copy(
        update={
            "sources": (
                *component.sources,
                Source(id=other_ref["source_id"], url=other_ref["url"]),
            )
        }
    )
    basic = BasicSpecs(
        {"cooler_height_limit_mm": 160, "gpu_limit_mm": 300},
        {"cooler_height_limit_mm": (REF,), "gpu_limit_mm": (REF,)},
        frozenset(),
        "b" * 64,
    )
    resolved = resolve_published_technical(
        component,
        catalog_for([component], (REF.model_dump(mode="json"), other_ref)),
        basic,
    )
    assert ":valid:" in resolved.revision_token
    assert resolved.specs.fact("cooler_height_limit_mm") is None
    assert "cooler_height_limit_mm" not in resolved.specs.fields
    assert "cooler_height_limit_mm" in resolved.specs.conflicts
    assert resolved.specs.fact("gpu_limit_mm") == 300
    assert basic.fact("cooler_height_limit_mm") == 160
    payload = envelope("case", {"cooler_height_limit_mm": 150})
    component = part("case", payload, basic_raw)
    rejected = resolve_published_technical(component, catalog_for([component]), basic)
    assert ":invalid:" in rejected.revision_token
    assert rejected.specs is basic


def test_digest_changes_on_field_source_and_publication_and_preserves_false():
    payload = envelope(
        "cooler",
        {
            "thermal_compound_required_on_remount": True,
            "thermal_compound_included": False,
        },
    )
    component = part("cooler", payload)
    catalog = catalog_for([component])
    basic = BasicSpecs({}, {}, frozenset())
    first = resolve_published_technical(component, catalog, basic)
    assert first.specs.fact("thermal_compound_included") is False
    assert first.specs.fact("thermal_compound_required_on_remount") is True
    assert first.specs.evidence("thermal_compound_included") == (REF,)
    payload["data"]["thermal_compound_included"] = True
    second = resolve_published_technical(part("cooler", payload), catalog, basic)
    assert first.revision_token != second.revision_token
    for ref in [
        *payload["identity"]["source_refs"],
        *(r for refs in payload["fields"].values() for r in refs),
    ]:
        ref["locator"] = "SYNTHETIC changed locator"
    rows = ({**REF.model_dump(mode="json"), "locator": "SYNTHETIC changed locator"},)
    third = resolve_published_technical(
        part("cooler", payload), catalog_for([], rows), basic
    )
    assert ":valid:" in third.revision_token
    assert second.revision_token != third.revision_token
    tower, _, _ = fixture()
    assert (
        resolve_tower_evidence(
            tower, catalog, "synthetic-publication-old"
        ).data_revision
        != resolve_tower_evidence(
            tower, catalog, "synthetic-publication-new"
        ).data_revision
    )


@pytest.mark.parametrize(
    "raw", ["{", '{"version":1,"version":1}', "x" * 24001, '{"data":NaN}']
)
def test_malformed_runtime_envelope_is_bounded_invalid_not_exception(raw):
    component = part("gpu").model_copy(update={"attributes": {"tower_stock_v1": raw}})
    basic = BasicSpecs({"length_mm": 400}, {"length_mm": (REF,)}, frozenset())
    result = resolve_published_technical(component, catalog_for([component]), basic)
    assert result.specs is basic
    assert result.specs.fact("length_mm") == 400
    assert ":invalid:" in result.revision_token
    assert len(result.revision_token) < 150


def test_no_envelope_exact_legacy_revision_specs_and_verdict():
    tower, _, _ = fixture()
    parts = []
    for line in tower.lines:
        category = line.category.value
        data = {
            "gpu": {"length_mm": 400},
            "case": {"gpu_length_limit_mm": 300},
        }.get(category, {})
        basic_raw = {
            "version": 1,
            "data": data,
            "fields": {key: [REF.source_id] for key in data},
            "conflicts": {},
            "import_digest": "b" * 64,
        }
        parts.append(part(category, basic_raw=basic_raw))
    catalog = catalog_for(parts)
    resolved = resolve_tower_evidence(tower, catalog, "synthetic-historical")
    basics = {
        component.id: resolve_stock_specs(component, catalog) for component in parts
    }
    digests = sorted(
        {spec.import_digest for spec in basics.values() if spec.import_digest}
    )
    revision = "|".join(
        (
            "synthetic-historical",
            MANUFACTURER_VERSION,
            ADAPTER_VERSION,
            REFERENCE_VERSION,
            *digests,
        )
    )
    expected = TowerTechnicalEvidenceDTO(
        data_revision=revision,
        components={
            component.id: TowerComponentEvidence(
                component.category.value, component.name, revision, basics[component.id]
            )
            for component in parts
        },
    )
    assert resolved == expected
    assert evaluate_tower(tower, resolved) == evaluate_tower(tower, expected)
    assert "T04" in evaluate_tower(tower, resolved).coverage.failed
    fractional = BasicSpecs({"length_mm": 227.2}, {"length_mm": (REF,)}, frozenset())
    unchanged = resolve_published_technical(part("gpu"), catalog, fractional)
    assert unchanged.specs is fractional
    assert unchanged.revision_token is None
    component = part(
        "gpu", envelope("gpu", {"tower_port_kind": "PCIe", "tower_port_form": "x16"})
    )
    enriched = resolve_published_technical(
        component, catalog_for([component]), fractional
    )
    assert enriched.specs.fact("length_mm") == 227.2


def test_cpu_bundled_cooler_thermal_values_require_inclusion_and_sources():
    payload = envelope(
        "cpu",
        {
            "stock_cooler_included": True,
            "thermal_compound_required_on_remount": True,
            "thermal_compound_included": False,
        },
    )
    component = part("cpu", payload)
    basic = BasicSpecs({}, {}, frozenset())
    result = resolve_published_technical(component, catalog_for([component]), basic)
    assert result.specs.fact("stock_cooler_included") is True
    assert result.specs.fact("thermal_compound_included") is False
    assert result.specs.evidence("thermal_compound_included") == (REF,)
    assert result.specs.fact("fan_current_ma") is None
    payload["data"]["stock_cooler_included"] = False
    component = part("cpu", payload)
    invalid = resolve_published_technical(component, catalog_for([component]), basic)
    assert ":invalid:" in invalid.revision_token
    assert invalid.specs is basic


def test_selected_technical_id_beyond_first_fifty_is_resolved(monkeypatch):
    tower, catalog, basics = synthetic_full_publication(monkeypatch)
    payload = json.loads(catalog["storage"].attributes["tower_stock_v1"])
    identity = "zz-synthetic-storage-061"
    payload["identity"]["component_id"] = identity
    selected = catalog["storage"].model_copy(
        update={"id": identity, "attributes": {"tower_stock_v1": json.dumps(payload)}}
    )
    for index in range(61):
        unused = part("storage").model_copy(
            update={"id": f"unused-synthetic-{index:03}"}
        )
        catalog[unused.id] = unused
    catalog[identity] = selected
    basics[identity] = basics["storage"]
    for line in tower.lines:
        if line.category == "storage":
            line.component_id = identity
    assert identity not in sorted(catalog)[:50]
    result = resolve_tower_evidence(tower, catalog, "synthetic-full-snapshot")
    assert result.components[identity].specs.fact("storage_form") == "2280"
    assert evaluate_tower(tower, result).verdict == "compatible"


def test_shared_limit_domain_conversion_and_old_conflict_cannot_be_cleared():
    payload = envelope(
        "motherboard", {"shared_limits": [{"group": "synthetic", "capacity": 0}]}
    )
    component = part("motherboard", payload)
    resolved = resolve_published_technical(
        component, catalog_for([component]), BasicSpecs({}, {}, frozenset())
    )
    assert isinstance(resolved.specs.fact("shared_limits")[0], SharedLimit)
    assert resolved.specs.fact("shared_limits")[0].capacity == 0
    payload = envelope("cooler", {"thermal_compound_included": False})
    component = part("cooler", payload)
    basic = BasicSpecs({}, {}, frozenset({"thermal_compound_included"}))
    resolved = resolve_published_technical(component, catalog_for([component]), basic)
    assert resolved.specs.fact("thermal_compound_included") is None
    assert "thermal_compound_included" in resolved.specs.conflicts
