"""Focused stock contract tests; execution belongs to the coordinated Build gate."""

import json

import pytest

from upgradejusto.catalog.models import Component, Source
from upgradejusto.catalog.service import ResolvedCatalog
from upgradejusto.compatibility.basic_contract import BasicScope
from upgradejusto.compatibility.basic_evaluation import REQUIRED, aggregate_basic
from upgradejusto.compatibility.basic_manufacturer import resolve_stock_specs
from upgradejusto.compatibility.basic_specs import (
    resolve_basic_specs,
    validate_envelope,
)
from upgradejusto.compatibility.models import ResolvedConfiguration, RuleResult


def envelope(**changes):
    return {
        "version": 1,
        "data": {"capacity_per_module_gb": 16},
        "fields": {"capacity_per_module_gb": ["sample-source"]},
        "conflicts": {},
        "import_digest": "a" * 64,
        **changes,
    }


def catalog_for(data):
    component = Component(
        id="arbitrary-new-id",
        category="ram",
        name="Independent exact part",
        attributes={"basic_stock_v1": json.dumps(data)},
        sources=(Source(id="sample-source", url="https://example.org/spec"),),
    )
    catalog = ResolvedCatalog(
        [component],
        (),
        [
            {
                "source_id": "sample-source",
                "url": "https://example.org/spec",
                "consulted_on": "2026-10-25",
                "locator": "structured record revision/hash/license",
            }
        ],
    )
    return component, catalog


def test_importer_schema_and_arbitrary_component_identity():
    part, catalog = catalog_for(envelope())
    specs = resolve_basic_specs(part, catalog)
    assert specs.fact("capacity_gb") == 16
    assert specs.evidence("capacity_gb")[0].source_id == "sample-source"


@pytest.mark.parametrize(
    "data",
    [
        envelope(data={"capacity_per_module_gb": None}),
        envelope(
            conflicts={"capacity_per_module_gb": [{"value": 8, "source": "other"}]}
        ),
        envelope(fields={"capacity_per_module_gb": ["absent"]}),
    ],
)
def test_null_conflict_missing_source_stay_unknown(data):
    part, catalog = catalog_for(data)
    assert resolve_basic_specs(part, catalog).fact("capacity_gb") is None


def test_no_publication_source_fallback():
    part, catalog = catalog_for(envelope())
    catalog.source_rows = None
    assert resolve_basic_specs(part, catalog).fact("capacity_gb") is None


def test_boolean_capacity_rejected_not_coerced_to_one():
    with pytest.raises(ValueError):
        validate_envelope(json.dumps(envelope(data={"capacity_per_module_gb": True})))


def test_envelope_size_rejected():
    with pytest.raises(ValueError):
        validate_envelope(" " * 2001)


def test_fail_preserves_unknown_and_scope():
    config = ResolvedConfiguration(
        pc_revision="1", data_revision="published-new", parts=()
    )
    rules = tuple(
        RuleResult(
            rule_id=identity,
            family=identity,
            state="unknown",
            missing_fields=(identity + ".needed",),
        )
        for identity in REQUIRED
    )
    from upgradejusto.compatibility.observations import EvidenceRef

    failed = RuleResult(
        rule_id="B04",
        family="B04",
        state="fail",
        evidence=(
            EvidenceRef(
                source_id="mfr",
                url="https://example.org/spec",
                locator="Dimensions",
                consulted_on="2026-10-25",
            ),
        ),
    )
    result = aggregate_basic(config, rules[:3] + (failed,) + rules[4:])
    assert result.verdict == "incompatible"
    assert "B01.needed" in result.missing_fields
    assert result.scope == BasicScope()
    assert result.coverage.required == REQUIRED
    assert not result.coverage.complete
    assert result.additional_checks and result.warnings
    legacy = result.model_copy(update={"scope": None})
    assert "scope" not in legacy.model_dump()
    assert "additional_checks" not in legacy.model_dump()


def test_inventory_cannot_be_truncated():
    config = ResolvedConfiguration(pc_revision="1", data_revision="new", parts=())
    with pytest.raises(ValueError):
        aggregate_basic(config, ())


def manufacturer_catalog():
    from upgradejusto.catalog.dataset import COMPONENTS

    original = next(
        part for part in COMPONENTS if part.name == "Kingston KVR32N22D8/16"
    )
    clone = original.model_copy(update={"id": "completely-new-identity"})
    rows = [
        {
            "source_id": source.id,
            "url": source.url,
            "consulted_on": "2026-10-20",
            "locator": "Catálogo curado sprint31b-a-v1; referencia conservada",
        }
        for source in clone.sources
    ]
    return clone, ResolvedCatalog([clone], (), rows)


def test_manufacturer_facts_apply_to_new_id_not_whitelisted_id():
    part, catalog = manufacturer_catalog()
    assert resolve_stock_specs(part, catalog).fact("capacity_gb") == 16


def test_adding_import_provenance_does_not_erase_independent_manufacturer_evidence():
    part, catalog = manufacturer_catalog()
    attrs = {
        **part.attributes,
        "basic_stock_v1": json.dumps(
            envelope(data={"capacity_per_module_gb": None}, fields={})
        ),
    }
    assert (
        resolve_stock_specs(
            part.model_copy(update={"attributes": attrs}), catalog
        ).fact("capacity_gb")
        == 16
    )


def test_relevant_import_conflict_not_suppressed_by_manufacturer_value():
    part, catalog = manufacturer_catalog()
    attrs = {
        **part.attributes,
        "basic_stock_v1": json.dumps(
            envelope(
                data={"capacity_per_module_gb": None},
                fields={},
                conflicts={
                    "capacity_per_module_gb": [{"value": 8, "source": "different"}]
                },
            )
        ),
    }
    assert (
        resolve_stock_specs(
            part.model_copy(update={"attributes": attrs}), catalog
        ).fact("capacity_gb")
        is None
    )


def test_manufacturer_attribute_or_source_edits_invalidate_extract():
    part, catalog = manufacturer_catalog()
    changed = part.model_copy(
        update={"attributes": {**part.attributes, "capacity_per_module": "64 GB"}}
    )
    assert resolve_stock_specs(changed, catalog).fact("capacity_gb") is None
    catalog.source_rows[0]["locator"] = "edited without recuration"
    assert resolve_stock_specs(part, catalog).fact("capacity_gb") is None
