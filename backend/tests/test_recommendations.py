"""F puro: fixtures sintéticos no son prueba PG ni positivos reales CU06."""

from copy import deepcopy
from decimal import Decimal

import pytest
from pydantic import ValidationError

from upgradejusto.administration.models import SupportData
from upgradejusto.catalog.dataset import COMPONENTS, DATASET_VERSION
from upgradejusto.catalog.models import Component, Price
from upgradejusto.catalog.service import ResolvedCatalog
from upgradejusto.compatibility.application import apply_replacements
from upgradejusto.compatibility.curation import (
    BOARD_REF,
    REVISION,
    SUPPORT_ROWS,
    documented,
    ref,
)
from upgradejusto.compatibility.http_models import EvaluatedConfiguration, Replacement
from upgradejusto.recommendations.domain import acquisition_cost, ordered_items
from upgradejusto.recommendations.models import Alternative, PreviewRequest
from upgradejusto.recommendations.service import assess


def replacement(category="ram", component="P05", quantity=2, **extra):
    return {
        "category": category,
        "candidates": [{"component_id": component, "quantity": quantity}],
        **extra,
    }


def base():
    return EvaluatedConfiguration(
        components=[
            {"category": "cpu", "component_id": "P01", "quantity": 1},
            {"category": "motherboard", "component_id": "P03", "quantity": 1},
            {"category": "ram", "component_id": "P04", "quantity": 2},
        ],
        context={"bios_version": "P2.30", "notes": "Declaración privada"},
    )


def request(**changes):
    return PreviewRequest.model_validate(
        {
            "expected_pc_revision": 1,
            "objective": "general",
            "budget_ars": "2000000.00",
            "alternatives": [{"key": "ram", "replacements": [replacement()]}],
            **changes,
        }
    )


@pytest.mark.parametrize(
    "value",
    [
        0,
        1.5,
        True,
        "0",
        "-1",
        "1e4",
        "1.001",
        "1000000000000",
        "NaN",
        " 1",
        "01",
        "1\n",
    ],
)
def test_invalid_budget(value):
    with pytest.raises(ValidationError):
        request(budget_ars=value)


@pytest.mark.parametrize(
    "extra", [{"owner_id": "x"}, {"benefit": "supported"}, {"results": []}]
)
def test_no_client_authority(extra):
    with pytest.raises(ValidationError):
        request(**extra)


def test_replacement_contract_shared_with_d():
    invalid = [
        replacement(quantity=True),
        replacement(quantity=9),
        replacement("cpu", "P02", 2),
        replacement(candidate_context={"bios_version": None}),
        {**replacement(), "price": "1"},
        {
            **replacement(),
            "candidates": [{"component_id": "P05", "quantity": 1, "owner_id": "x"}],
        },
    ]
    for value in invalid:
        with pytest.raises(ValidationError):
            Replacement.model_validate(value)
    with pytest.raises(ValidationError):
        request(
            alternatives=[{"key": "a", "replacements": [replacement(), replacement()]}]
        )
    with pytest.raises(ValidationError):
        request(alternatives=[{"key": "a", "replacements": [replacement()]}] * 2)


def test_combination_ram_and_new_board_no_mutation():
    catalog = {p.id: p for p in COMPONENTS}
    original = base()
    before = deepcopy(original.model_dump())
    replacements = [
        Replacement.model_validate(replacement()),
        Replacement.model_validate(replacement("motherboard", "P03", 1)),
    ]
    result = apply_replacements(original, replacements, catalog)
    assert original.model_dump() == before
    assert result.context.bios_version is None
    assert [
        (g.component_id, g.quantity) for g in result.components if g.category == "ram"
    ] == [("P05", 2)]
    alternative = Alternative(key="combined", replacements=replacements)
    item = assess(
        original, alternative, catalog, 1, DATASET_VERSION, Decimal("2000000")
    )
    assert item.evaluation.evaluated_configuration == result
    assert item.evaluation.rule_results[0].state == "unknown"
    assert item.status == "requires_verification"
    assert item.benefit.status == "unknown"
    assert item.cost.total_ars is None
    assert (
        assess(original, alternative, catalog, 1, DATASET_VERSION, Decimal("2000000"))
        == item
    )


def test_price_date_amount_source_and_exact_boundary():
    prices = [
        Price(amount="0.01", currency="ARS", date="2026-01-01", source="old"),
        Price(amount="0.11", currency="ARS", date="2026-02-01", source="expensive"),
        Price(amount="0.10", currency="ARS", date="2026-02-01", source="z"),
        Price(amount="0.10", currency="ARS", date="2026-02-01", source="a"),
    ]
    component = Component(
        id="synthetic",
        category="ram",
        name="Synthetic",
        attributes={},
        sources=(),
        prices=tuple(prices),
    )
    selected = [
        Replacement.model_validate(replacement(component="synthetic", quantity=3))
    ]
    cost = acquisition_cost(selected, {"synthetic": component}, Decimal("0.30"))
    assert cost.total_ars == "0.30" and cost.within_budget is True
    assert cost.lines[0].source == "a"
    assert (
        acquisition_cost(
            selected, {"synthetic": component}, Decimal("0.29")
        ).within_budget
        is False
    )
    missing = acquisition_cost(selected, {}, Decimal("100"))
    assert missing.total_ars is None and missing.within_budget is None
    assert missing.known_subtotal_ars == "0" and missing.missing_fields


def resolved_cpu_support_only_catalog():
    """Explicit published CPU support fixture; no policy supplement or PG claim."""
    parts = {part.id: part for part in COMPONENTS}
    sources = {
        (source.id, source.url): {
            "source_id": source.id,
            "url": source.url,
            "consulted_on": "2026-10-20",
            "locator": "Catálogo curado sprint31b-a-v1; referencia conservada",
        }
        for part in COMPONENTS
        for source in part.sources
    }
    support = []
    for identity, row in zip(("P01", "P02"), SUPPORT_ROWS, strict=True):
        cpu_refs = tuple(
            ref(source.id, source.url, "Specifications; socket AM4")
            for source in parts[identity].sources
        )
        support.append(
            SupportData(
                cpu_component_id=identity,
                motherboard_component_id="P03",
                cpu_socket=documented("AM4", cpu_refs),
                motherboard_socket=documented("AM4", (BOARD_REF,)),
                applicable_revision=documented(REVISION, (BOARD_REF,)),
                row=row,
            )
        )
        for evidence in row.evidence:
            sources[(evidence.source_id, evidence.url)] = evidence.model_dump()
    return ResolvedCatalog(COMPONENTS, tuple(support), list(sources.values()))


def test_rejected_keeps_missing_and_identical_is_not_improvement():
    catalog = resolved_cpu_support_only_catalog()
    same = Alternative(key="same", replacements=[replacement(component="P04")])
    identical = assess(base(), same, catalog, 1, DATASET_VERSION, Decimal("1"))
    assert identical.benefit.status == "not_an_improvement"
    assert identical.status == "rejected" and identical.missing_fields
    negative = Alternative(
        key="bad",
        replacements=[
            replacement(
                "motherboard", "P03", 1, candidate_context={"bios_version": "P1.20"}
            )
        ],
    )
    failed = assess(base(), negative, catalog, 1, DATASET_VERSION, Decimal("1"))
    assert failed.evaluation.verdict == "incompatible"
    assert failed.status == "rejected" and failed.missing_fields
    changed = Alternative(key="ram", replacements=[replacement()])
    unknown = assess(base(), changed, catalog, 1, DATASET_VERSION, Decimal("2000000"))
    assert unknown.status == "requires_verification"
    assert ordered_items([identical, unknown])[0] == unknown
    over = assess(base(), changed, catalog, 1, DATASET_VERSION, Decimal("1"))
    assert over.status == "rejected" and over.cost.within_budget is False
