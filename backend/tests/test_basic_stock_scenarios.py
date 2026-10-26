"""Actual curated facts in unit fixtures; NOT PG/publication execution evidence."""

from decimal import Decimal

from upgradejusto.administration.models import SupportData
from upgradejusto.catalog.dataset import COMPONENTS
from upgradejusto.catalog.service import ResolvedCatalog
from upgradejusto.compatibility.application import evaluate_current
from upgradejusto.compatibility.basic_manufacturer import SUPPLEMENTAL_SOURCES
from upgradejusto.compatibility.curation import (
    BOARD_REF,
    REVISION,
    SUPPORT_ROWS,
    documented,
)
from upgradejusto.compatibility.http_models import EvaluatedConfiguration, Replacement
from upgradejusto.pcs.models import ComponentGroup, PCContext
from upgradejusto.recommendations.models import Alternative
from upgradejusto.recommendations.service import assess


def catalog():
    sources = {
        (source.id, source.url): {
            "source_id": source.id,
            "url": source.url,
            "consulted_on": "2026-10-20",
            "locator": "Catálogo curado sprint31b-a-v1; referencia conservada",
        }
        for component in COMPONENTS
        for source in component.sources
    }
    support = tuple(
        SupportData(
            cpu_component_id=identity,
            motherboard_component_id="P03",
            cpu_socket=documented("AM4", (BOARD_REF,)),
            motherboard_socket=documented("AM4", (BOARD_REF,)),
            applicable_revision=documented(REVISION, (BOARD_REF,)),
            row=row,
        )
        for identity, row in zip(("P01", "P02"), SUPPORT_ROWS, strict=True)
    )
    return ResolvedCatalog(
        COMPONENTS, support, [*sources.values(), *SUPPLEMENTAL_SOURCES]
    )


def base(second=False, bios="P2.30"):
    identities = (
        ("P02", "P03", "P05", "P06", "P08", "P10")
        if second
        else ("P01", "P03", "P04", "P06", "P07", "P09")
    )
    return EvaluatedConfiguration(
        components=[
            ComponentGroup(
                category=category,
                component_id=identity,
                quantity=2 if category == "ram" else 1,
            )
            for category, identity in zip(
                ("cpu", "motherboard", "ram", "gpu", "psu", "case"),
                identities,
                strict=True,
            )
        ],
        context=PCContext(bios_version=bios, notes=None),
    )


def replacement(category, identity, quantity=1):
    return Replacement(
        category=category, candidates=[{"component_id": identity, "quantity": quantity}]
    )


def test_two_stock_demos_positive_with_unknown_additional_cooling_visible():
    for second in (False, True):
        result = evaluate_current(base(second), catalog(), 1, "unit-publication")
        assert result.verdict == "compatible"
        assert result.coverage.complete
        assert len(result.coverage.required) == 7
        assert any(
            check.id == "cpu_stock_cooling" for check in result.additional_checks
        )
        if second:
            assert any(
                check.id == "psu_12v_documentation_conflict"
                for check in result.additional_checks
            )
            assert any(
                "5700X requiere cooler no incluido" in warning
                for warning in result.warnings
            )


def test_missing_published_policy_source_stays_unknown_not_static_fallback():
    pinned = catalog()
    pinned.source_rows = [
        row for row in pinned.source_rows if row["source_id"] != "BASIC-NVIDIA4060-1"
    ]
    result = evaluate_current(base(), pinned, 1, "unit-publication")
    assert result.verdict == "requiere_verificacion"
    assert "gpu.nvidia_system_recommendation_w" in result.missing_fields


def test_reference_tdp_requires_amd_source_not_nvidia_attribution():
    from upgradejusto.compatibility.basic_manufacturer import resolve_stock_specs

    for gpu_id, amd_source in (
        ("P06", "BASIC-AMD-5900X-REF-1"),
        ("P15", "BASIC-AMD-9950X-REF-1"),
    ):
        pinned = catalog()
        specs = resolve_stock_specs(pinned[gpu_id], pinned)
        assert amd_source in {
            ref.source_id for ref in specs.evidence("psu_reference_cpu_tdp_class_w")
        }
        pinned.source_rows = [
            row for row in pinned.source_rows if row["source_id"] != amd_source
        ]
        assert (
            resolve_stock_specs(pinned[gpu_id], pinned).fact(
                "psu_reference_cpu_tdp_class_w"
            )
            is None
        )
        if gpu_id == "P06":
            result = evaluate_current(base(), pinned, 1, "unit-publication")
            assert result.verdict == "requiere_verificacion"
            assert "gpu.psu_reference_cpu_tdp_class_w" in result.missing_fields


def test_bios_missing_and_known_length_failure():
    config = base(True, bios=None)
    config.components = [
        group for group in config.components if group.category != "gpu"
    ] + [ComponentGroup(category="gpu", component_id="P16", quantity=1)]
    result = evaluate_current(config, catalog(), 1, "unit-publication")
    assert result.verdict == "incompatible"
    assert "B04" in result.coverage.failed
    assert "cpu_support.installed_bios" in result.missing_fields


def test_ram_and_psu_gpu_recommendations_cost_complete_inside_budget():
    for replacements, budget, amount in (
        ([replacement("ram", "P05", 2)], "1000000", "766417.98"),
        ([replacement("psu", "P08"), replacement("gpu", "P15")], "2000000", "1882130"),
    ):
        item = assess(
            base(),
            Alternative(key="upgrade", replacements=replacements),
            catalog(),
            1,
            "unit-publication",
            Decimal(budget),
            "general",
        )
        assert item.status == "recommended"
        assert item.cost.total_ars == amount
        assert item.benefit.status == "supported"


def test_single_gpu_rejected_psu_threshold_and_budget_insufficient_rejected():
    for replacements, budget in (
        ([replacement("gpu", "P15")], "2000000"),
        ([replacement("ram", "P05", 2)], "700000"),
    ):
        item = assess(
            base(),
            Alternative(key="upgrade", replacements=replacements),
            catalog(),
            1,
            "unit-publication",
            Decimal(budget),
            "general",
        )
        assert item.status == "rejected"
