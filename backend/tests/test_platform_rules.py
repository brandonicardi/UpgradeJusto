"""Focused evidence/predicate tests; synthetic boundaries never certify demo PCs."""

from copy import deepcopy
from decimal import Decimal

import pytest
from pydantic import ValidationError
from test_recommendations import base, replacement

from upgradejusto.catalog.dataset import COMPONENTS, DATASET_VERSION
from upgradejusto.catalog.service import ResolvedCatalog
from upgradejusto.compatibility.application import (
    apply_replacements,
    resolve_configuration,
)
from upgradejusto.compatibility.evaluation import evaluate_d
from upgradejusto.compatibility.http_models import Replacement
from upgradejusto.compatibility.models import ResolvedConfiguration
from upgradejusto.pcs.models import ComponentGroup
from upgradejusto.recommendations.domain import comparative_benefit
from upgradejusto.recommendations.models import Alternative
from upgradejusto.recommendations.service import assess
from upgradejusto.shares.projection import missing_fields


def catalog():
    return {p.id: p.model_copy(deep=True) for p in COMPONENTS}


def resolved(quantity=2):
    configuration = base()
    configuration.components[2].quantity = quantity
    return resolve_configuration(configuration, catalog(), 1, DATASET_VERSION)


def rule(config, identity):
    return next(r for r in evaluate_d(config).rule_results if r.rule_id == identity)


@pytest.mark.parametrize(
    "quantity,state", [(2, "unknown"), (4, "unknown"), (5, "fail")]
)
def test_slot_boundary_and_fail_keeps_missing(quantity, state):
    config = resolved(quantity)
    before = deepcopy(config.model_dump())
    result = rule(config, "R02")
    assert result.state == state
    assert "ram.installed_slots" in result.missing_fields
    assert "ram.cpu.max_total_gb" in result.missing_fields
    assert config.model_dump() == before
    assert not evaluate_d(config).coverage.complete
    if state == "fail":
        assert evaluate_d(config).verdict == "incompatible"
        assert "implementation.R05" in evaluate_d(config).missing_fields


@pytest.mark.parametrize("status", ["unknown", "conflict"])
def test_conflict_is_not_a_failed_generation(status):
    config = resolved()
    data = config.model_dump()
    data["ram"]["modules"][0]["generation"] = "DDR5"
    data["ram"]["modules"][0]["status"] = status
    result = rule(ResolvedConfiguration.model_validate(data), "R02")
    assert result.state == "unknown"
    assert any(p.endswith(".generation") for p in result.missing_fields)


def test_documented_mismatch_dominates_unknown_and_json_is_not_authority():
    data = resolved().model_dump()
    data["ram"]["modules"][0]["generation"] = "DDR5"
    result = rule(ResolvedConfiguration.model_validate(data), "R02")
    assert result.state == "fail" and result.missing_fields
    data["ram"]["approved"] = True
    with pytest.raises(ValidationError):
        ResolvedConfiguration.model_validate(data)


@pytest.mark.parametrize("value", [True, "8", 8.0, 0, -1])
def test_capacity_strict_positive_integer(value):
    data = resolved().model_dump()
    data["ram"]["modules"][0]["capacity_gb"] = value
    with pytest.raises(ValidationError):
        ResolvedConfiguration.model_validate(data)


@pytest.mark.parametrize("change", ["name", "attributes", "sources", "extra_source"])
def test_current_catalog_envelope_invalidates_extract_and_benefit(change):
    parts = catalog()
    component = parts["P05"]
    if change == "name":
        parts["P05"] = component.model_copy(update={"name": "Other exact model"})
    elif change == "attributes":
        component.attributes["capacity_per_module"] = None
    elif change == "sources":
        parts["P05"] = component.model_copy(update={"sources": ()})
    else:
        parts["P05"] = component.model_copy(
            update={"sources": (*component.sources, component.sources[0])}
        )
    selected = apply_replacements(
        base(), [Replacement.model_validate(replacement())], parts
    )
    config = resolve_configuration(selected, parts, 1, "edited-published-revision")
    assert config.ram.modules[0].status == "unknown"
    assert config.ram.modules[0].capacity_gb is None
    assert comparative_benefit(base(), selected, parts, "general").status == "unknown"
    assert config.data_revision.startswith("edited-published-revision|")


def test_ram_capacity_benefit_exact_general_only_no_global_recommendation():
    parts = catalog()
    alternative = Alternative(key="capacity", replacements=[replacement()])
    item = assess(
        base(), alternative, parts, 1, DATASET_VERSION, Decimal("766417.98"), "general"
    )
    assert item.benefit.status == "supported" and item.benefit.evidence
    assert item.cost.total_ars == "766417.98" and item.cost.within_budget is True
    assert item.status == "requires_verification"
    assert item.evaluation.verdict == "requiere_verificacion"
    after = item.evaluation.evaluated_configuration
    assert [
        (g.component_id, g.quantity) for g in after.components if g.category == "ram"
    ] == [("P05", 2)]
    for objective in (None, "gaming", "productivity"):
        assert comparative_benefit(base(), after, parts, objective).status == "unknown"
    parts["P05"] = parts["P05"].model_copy(update={"prices": ()})
    no_price = assess(
        base(), alternative, parts, 1, DATASET_VERSION, Decimal("766417.98"), "general"
    )
    assert no_price.benefit.status == "supported"
    assert no_price.cost.total_ars is None
    assert "prices.P05.ARS" in no_price.missing_fields


def test_mounting_nominal_fit_never_substitutes_effective_cable_space():
    selected = base()
    selected.components.extend(
        [
            ComponentGroup(category="psu", component_id="P07", quantity=1),
            ComponentGroup(category="case", component_id="P09", quantity=1),
        ]
    )
    config = resolve_configuration(selected, catalog(), 1, DATASET_VERSION)
    result = rule(config, "R07")
    assert result.state == "unknown"
    assert "mounting.effective_psu_limit" in result.missing_fields
    assert any(
        f.name == "mounting_psu_nominal_length" and f.value is True
        for f in result.facts
    )
    data = config.model_dump()
    data["mounting"]["psu"]["length_mm"] = 181
    result = rule(ResolvedConfiguration.model_validate(data), "R07")
    assert result.state == "fail" and result.missing_fields
    data["mounting"]["psu"]["status"] = "conflict"
    assert rule(ResolvedConfiguration.model_validate(data), "R07").state == "unknown"


@pytest.mark.parametrize("capacity,state", [(32, "unknown"), (33, "fail")])
def test_total_capacity_boundary_keeps_regime_missing(capacity, state):
    data = resolved(4).model_dump()
    data["ram"]["modules"][0]["capacity_gb"] = capacity
    result = rule(ResolvedConfiguration.model_validate(data), "R02")
    assert result.state == state
    assert "ram.operating_mts" in result.missing_fields


def test_new_board_resolves_fresh_specs_and_never_inherits_bios_or_geometry():
    original = base()
    changed = apply_replacements(
        original,
        [Replacement.model_validate(replacement("motherboard", "P18", 1))],
        catalog(),
    )
    result = resolve_configuration(changed, catalog(), 1, DATASET_VERSION)
    assert changed.context.bios_version is None
    assert original.context.bios_version == "P2.30"
    assert result.ram.motherboard.instance_id == "motherboard:P18"
    assert result.mounting.motherboard.instance_id == "motherboard:P18"
    assert result.gpu_length is None
    assert result.mounting.effective_psu_limit is None


def test_public_technical_paths_preserved_without_private_context():
    assert missing_fields(
        [
            "ram.modules.ram_P04.capacity_gb",
            "mounting.effective_psu_limit",
            "ram.notes.private",
            "mounting.owner_id.secret",
            "http://localhost/private",
        ]
    ) == ["ram.modules.ram_P04.capacity_gb", "mounting.effective_psu_limit"]


def test_published_source_collection_empty_or_edited_is_not_repopulated():
    from upgradejusto.administration.initial import initial_entries

    parts = catalog()
    entries = initial_entries([p.model_dump(mode="json") for p in parts.values()])
    sources = tuple(e["data"] for e in entries if e["collection"] == "sources")
    snapshot = ResolvedCatalog(parts.values(), None, sources)
    selected = apply_replacements(
        base(), [Replacement.model_validate(replacement())], snapshot
    )
    assert (
        comparative_benefit(base(), selected, snapshot, "general").status == "supported"
    )
    edited = tuple(
        {**s, "locator": "Changed evidence"} if s["source_id"] == "F05" else s
        for s in sources
    )
    for source_rows in ((), edited):
        snapshot = ResolvedCatalog(parts.values(), None, source_rows)
        assert (
            comparative_benefit(base(), selected, snapshot, "general").status
            == "unknown"
        )
