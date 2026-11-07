"""Synthetic selection/offer fixtures, NOT real hardware or benchmark execution."""

import json
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from upgradejusto.catalog.models import Category, Component, Source
from upgradejusto.catalog.service import ResolvedCatalog
from upgradejusto.compatibility.basic_specs import BasicSpecs
from upgradejusto.compatibility.observations import EvidenceRef
from upgradejusto.compatibility.tower_contract import (
    ESSENTIAL_REQUIRED as REQUIRED,
)
from upgradejusto.compatibility.tower_http_models import TowerAction, TowerSimulationDTO
from upgradejusto.pcs.tower_models import Tower
from upgradejusto.recommendations.tower_cost import (
    classify,
    incremental_cost,
    select_offer,
)
from upgradejusto.recommendations.tower_models import TowerPreviewRequest
from upgradejusto.recommendations.tower_references import benefit, reference
from upgradejusto.recommendations.tower_service import (
    automatic_actions,
    canonical_actions,
    material_dependencies,
    preview_snapshot,
    replacement,
    simulate,
)
from upgradejusto.retail.models import REFERENCE_PRICE_VALIDITY

NOW = datetime(2026, 10, 26, 12, tzinfo=UTC)


def part(identity, category, name, **fields):
    return Component(
        id=identity,
        category=category,
        name=name,
        attributes={
            "basic_stock_v1": json.dumps(
                {
                    "version": 1,
                    "data": fields,
                    "fields": {key: ["synthetic-source"] for key in fields},
                    "conflicts": {},
                    "import_digest": "a" * 64,
                }
            )
        },
        sources=(Source(id="synthetic-source", url="https://example.test/spec"),),
    )


def catalog(*parts):
    return ResolvedCatalog(
        parts,
        (),
        [
            {
                "source_id": "synthetic-source",
                "url": "https://example.test/spec",
                "locator": "Synthetic specification fixture",
                "consulted_on": "2026-10-26",
            }
        ],
    )


def tower(*parts):
    present = {p.category for p in parts}
    return Tower(
        schema_version=2,
        id=uuid4(),
        revision=3,
        origin_schema=2,
        name="Synthetic",
        category_status={c: "present" if c in present else "unknown" for c in Category},
        lines=[
            {
                "line_id": uuid4(),
                "category": p.category,
                "component_id": p.id,
                "quantity": 1,
            }
            for p in parts
        ],
        context={"bios_version": None, "notes": None},
    )


def request(**changes):
    return TowerPreviewRequest.model_validate(
        {
            "expected_pc_revision": 3,
            "objective": "productivity",
            "budget_ars": "500000.00",
            "price_condition": "cash",
            "mode": "automatic",
            "workload": "blender-cpu",
            "materials": [],
            "alternatives": [],
            **changes,
        }
    )


def offer(identity, **changes):
    data = dict(
        offer_id="synthetic-offer",
        component_id=identity,
        variant_key="exact-variant",
        condition="cash",
        availability="in_stock",
        status="fresh",
        amount="100.00",
        stock_quantity=None,
        observed_at=NOW - timedelta(hours=1),
        expires_at=NOW + timedelta(hours=23),
    )
    data.update(changes)
    result = SimpleNamespace(**data)
    result.model_dump = lambda **kwargs: {
        key: str(value) for key, value in data.items()
    }
    return result


def cpus():
    old = part(
        "arbitrary-installed-id",
        "cpu",
        "AMD Ryzen 5 5600 100-100000927BOX",
        socket="AM4",
    )
    new = part(
        "zz-after-first-50", "cpu", "AMD Ryzen 7 5700X 100-100000926WOF", socket="AM4"
    )
    return old, new


def retail_identity(**changes):
    return {
        "store": "compragamer",
        "product_id": "synthetic-vendor-id",
        "variant_key": "synthetic-exact-package",
        "mpn": "100-100000926WOF",
        "gtin": None,
        "source_url": "https://example.test/synthetic-retail-item",
        "category": "cpu",
        "rights_note": "Synthetic test identity, no real offer",
        **changes,
    }


def test_retail_mpn_without_technical_attributes_gives_benefit_not_compatibility():
    old, curated = cpus()
    retail = curated.model_copy(
        update={
            "id": "independent-arbitrary-retail-id",
            "name": "Not used for matching",
            "attributes": {},
            "offers": (
                offer(
                    "independent-arbitrary-retail-id",
                    variant_key="synthetic-exact-package",
                    store="compragamer",
                    product_id="synthetic-vendor-id",
                    source_url="https://example.test/synthetic-retail-item",
                ),
            ),
        }
    )
    noise = [part(f"aa-noise-{i:03}", "cpu", "Unknown retail CPU") for i in range(80)]
    data = catalog(old, *noise, retail)
    data.retail_identities = {retail.id: retail_identity()}
    before = tower(old)
    result = preview_snapshot(before, data, "synthetic-retail-version", request(), NOW)
    assert result.items
    item = next(
        item
        for item in result.items
        if item.actions[0]["candidates"][0]["component_id"] == retail.id
    )
    assert item.benefit["status"] == "supported"
    assert item.benefit["after"] == "214.38925258002163"
    assert item.benefit["source"][1]["matched_mpn"] == "100-100000926WOF"
    assert item.benefit["source"][1]["identity_kind"] == "published_retail_mpn"
    assert item.cost["total_ars"] == "100.00"
    assert item.status == "requires_verification"
    assert item.evaluation.missing_fields
    assert item.versions["catalog"] == "synthetic-retail-version"
    assert item.versions["identity"] == "tower-reference-identity-2"


@pytest.mark.parametrize(
    "changes",
    [
        {"mpn": None, "gtin": "100-100000926WOF"},
        {"mpn": "100-100000926WO"},
        {"mpn": "100-100000926WOF "},
        {"category": "gpu"},
        {"variant_key": ""},
        {"source_url": ""},
    ],
)
def test_retail_identity_never_falls_back_to_curated_display_name(changes):
    _, component = cpus()
    data = catalog(component)
    data.retail_identities = {component.id: retail_identity(**changes)}
    assert reference(component, data, "productivity", "blender-cpu") is None


def test_retail_unknown_gpu_mpn_cannot_use_name_vram_or_gtin_as_crosswalk():
    component = part("arbitrary-gpu", "gpu", "ASUS TUF-RTX5070-O12G-GAMING", vram_gb=16)
    data = catalog(component)
    data.retail_identities = {
        component.id: retail_identity(
            mpn="90YV0MF0-MVAA00", category="gpu", gtin="TUF-RTX5070-O12G-GAMING"
        )
    }
    assert reference(component, data, "gaming", None) is None
    data.retail_identities[component.id] = retail_identity(
        mpn="TUF-RTX5070-O12G-GAMING", category="gpu"
    )
    result = reference(component, data, "gaming", None)
    assert result["score"] == "100" and "NOT FPS" in result["unit"]
    assert "not measured ASUS" in result["limitations"]


def test_offer_requires_same_published_store_product_variant_and_source():
    identity = retail_identity()
    good = offer(
        "candidate",
        **{
            key: identity[key]
            for key in ("store", "product_id", "variant_key", "source_url")
        },
    )
    component = SimpleNamespace(id="candidate", offers=(good,))
    assert select_offer(component, "cash", NOW, identity) is good
    for key in ("store", "product_id", "variant_key", "source_url"):
        assert select_offer(component, "cash", NOW, {**identity, key: "other"}) is None


def test_cpu_reference_workload_identity_and_no_demo_id_whitelist():
    old, new = cpus()
    data = catalog(old, new)
    before = tower(old)
    after = simulate(before, [replacement(new)], data)
    gain = benefit(before, after, data, "productivity", "blender-cpu")
    assert gain["status"] == "supported"
    assert gain["before"] == "149.8979371914048"
    assert gain["after"] == "214.38925258002163"
    assert gain["source"][1]["samples"] == 424
    assert gain["source"][1]["raw_sha256"].startswith("12ef15")
    general = benefit(before, after, data, "productivity", None)
    assert general["status"] == "supported"
    assert general["workload"] == "relative-index"
    assert (
        reference(
            new.model_copy(update={"name": "Similar 5700X"}),
            data,
            "productivity",
            "blender-cpu",
        )
        is None
    )
    assert (
        reference(
            new.model_copy(update={"attributes": {}}),
            data,
            "productivity",
            "blender-cpu",
        )
        is None
    )


def test_full_catalog_scanned_before_bound_and_simulation_does_not_persist():
    old, new = cpus()
    unrelated = [part(f"noise-{i:03}", "cpu", "Unproven", cores=64) for i in range(90)]
    data = catalog(old, *unrelated, new)
    before = tower(old)
    original = before.model_dump()
    actions = list(automatic_actions(before, data, request(), NOW))
    assert any(a[0].candidates[0].component_id == new.id for a in actions)
    assert before.model_dump() == original
    first = preview_snapshot(before, data, "synthetic-v1", request(), NOW)
    second = preview_snapshot(before, data, "synthetic-v1", request(), NOW)
    assert first.model_dump() == second.model_dump()
    assert all(item.status != "recommended" for item in first.items)
    assert first.items[0].evaluation.missing_fields


@pytest.mark.parametrize(
    "changes",
    [
        {"status": "stale"},
        {"availability": "unknown"},
        {"availability": "out_of_stock"},
        {"stock_quantity": 0},
        {"condition": "list"},
        {"amount": None},
        {"amount": "0.00"},
        {"component_id": "other"},
        {"expires_at": NOW},
        {"observed_at": NOW + timedelta(seconds=1)},
        {"expires_at": NOW + timedelta(days=31)},
    ],
)
def test_offer_fails_closed(changes):
    component = SimpleNamespace(id="candidate", offers=(offer("candidate", **changes),))
    assert select_offer(component, "cash", NOW) is None


def test_reference_price_counts_at_29_days_and_is_unknown_when_expired():
    old, new = cpus()
    before = tower(old)

    observed_valid = NOW - timedelta(days=29)
    priced = new.model_copy(
        update={
            "offers": (
                offer(
                    new.id,
                    observed_at=observed_valid,
                    expires_at=observed_valid + REFERENCE_PRICE_VALIDITY,
                ),
            )
        }
    )
    data = catalog(old, priced)
    after = simulate(before, [replacement(priced)], data)
    cost, quotes = incremental_cost(before, after, data, "cash", Decimal("500.00"), NOW)
    assert cost["total_ars"] == "100.00"
    assert cost["within_budget"] is True
    assert len(quotes) == 1

    observed_expired = NOW - timedelta(days=31)
    expired = new.model_copy(
        update={
            "offers": (
                offer(
                    new.id,
                    observed_at=observed_expired,
                    expires_at=observed_expired + REFERENCE_PRICE_VALIDITY,
                ),
            )
        }
    )
    data = catalog(old, expired)
    after = simulate(before, [replacement(expired)], data)
    cost, quotes = incremental_cost(before, after, data, "cash", Decimal("500.00"), NOW)
    assert cost["total_ars"] is None
    assert cost["known_subtotal_ars"] == "0.00"
    assert cost["missing_fields"] == [f"offer:{new.id}:available_quantity:1"]
    assert quotes == []


def test_ram_replaces_complete_set_and_multiplies_full_incremental_cost():
    old = part("ram-old", "ram", "Synthetic RAM8", capacity_per_module_gb=8)
    new = part("ram-new", "ram", "Synthetic RAM16", capacity_per_module_gb=16)
    priced = new.model_copy(update={"offers": (offer(new.id),)})
    data = catalog(old, priced)
    before = tower(old)
    before.lines[0].quantity = 4
    after = simulate(before, [replacement(priced, 4)], data)
    assert len(after.lines) == 1 and after.lines[0].component_id == new.id
    assert benefit(before, after, data, "general", None)["after"] == "64"
    cost, quotes = incremental_cost(before, after, data, "cash", Decimal("399.99"), NOW)
    assert cost["total_ars"] == "400.00" and cost["within_budget"] is False
    assert len(quotes) == 1
    assert cost["lines"][0]["quantity"] == 4


def evaluation(state="pass", missing=()):
    return SimpleNamespace(
        verdict="incompatible"
        if state == "fail"
        else "compatible"
        if state == "pass"
        else "requiere_verificacion",
        rule_results=[SimpleNamespace(rule_id=r, state=state) for r in REQUIRED],
        missing_fields=missing,
    )


def test_recommended_requires_all_gates_and_fail_dominates_missing():
    cost = {"total_ars": "100.00", "within_budget": True}
    gain = {"status": "supported"}
    assert classify(evaluation(), gain, cost, []) == "recommended"
    assert (
        classify(evaluation("unknown", ("known-missing",)), gain, cost, [])
        == "requires_verification"
    )
    assert (
        classify(evaluation("fail", ("known-missing",)), gain, cost, []) == "rejected"
    )
    assert (
        classify(evaluation(), {"status": "unknown"}, cost, [])
        == "requires_verification"
    )
    assert (
        classify(evaluation(), gain, {**cost, "within_budget": False}, []) == "rejected"
    )
    assert (
        classify(evaluation(), gain, {"total_ars": None, "within_budget": None}, [])
        == "requires_verification"
    )
    assert (
        classify(evaluation(), gain, cost, [{"required": True, "state": "missing"}])
        == "requires_verification"
    )
    partial = evaluation()
    partial.rule_results = partial.rule_results[:3]
    assert classify(partial, gain, cost, []) == "requires_verification"


def test_material_states_only_when_documented_not_universal_cpu_missing():
    old, new = cpus()
    cooler = part("cooler", "cooler", "Synthetic cooler")
    data = catalog(old, new, cooler)
    before = tower(old, cooler)
    after = simulate(before, [replacement(new)], data)
    refs = {
        "thermal_compound_required_on_remount": (
            EvidenceRef(
                source_id="synthetic-material-operation",
                url="https://example.test/synthetic-cooler-manual",
                locator="Synthetic documented remount compound requirement",
                consulted_on="2026-10-26",
            ),
        ),
    }

    def evidence(required, included=None, component_id=cooler.id, stock_cooler=None):
        spec = BasicSpecs(
            {
                "thermal_compound_required_on_remount": required,
                "thermal_compound_included": included,
                "stock_cooler_included": stock_cooler,
            },
            {
                **refs,
                "thermal_compound_included": refs[
                    "thermal_compound_required_on_remount"
                ],
                "stock_cooler_included": refs["thermal_compound_required_on_remount"],
            },
            frozenset(),
        )
        return SimpleNamespace(components={component_id: SimpleNamespace(specs=spec)})

    assert material_dependencies(before, after, evidence(None), request()) == []
    assert material_dependencies(before, after, evidence(None, True), request()) == []
    assert (
        material_dependencies(before, after, evidence(True), request())[0]["state"]
        == "missing"
    )
    assert (
        material_dependencies(before, after, evidence(True, True), request())[0][
            "state"
        ]
        == "missing"
    )
    confirmed = request(
        materials=[
            {
                "kind": "thermal_compound",
                "state": "available_confirmed",
                "confirmed": True,
            }
        ]
    )
    assert (
        material_dependencies(before, after, evidence(True, True), confirmed)[0][
            "state"
        ]
        == "available_confirmed"
    )
    reused = material_dependencies(before, after, evidence(True, True), request())
    assert reused[0]["source_refs"]
    assert "leftovers" in reused[0]["reason"]
    assert (
        classify(
            evaluation(),
            {"status": "supported"},
            {"total_ars": "100.00", "within_budget": True},
            reused,
        )
        == "requires_verification"
    )
    acquired = part("new-cooler-package", "cooler", "Synthetic new cooler package")
    changed = simulate(
        before,
        [replacement(new), replacement(acquired)],
        catalog(old, new, cooler, acquired),
    )
    assert (
        material_dependencies(
            before, changed, evidence(True, True, acquired.id), request()
        )[0]["state"]
        == "included"
    )
    assert (
        material_dependencies(
            before, changed, evidence(True, None, acquired.id), request()
        )[0]["state"]
        == "missing"
    )
    # New line ID for the SAME installed part is not proof of a fresh package.
    reselected = simulate(before, [replacement(new), replacement(cooler)], data)
    assert (
        material_dependencies(before, reselected, evidence(True, True), request())[0][
            "state"
        ]
        == "missing"
    )
    # Compound inclusion is usable only from a new CPU's sourced package;
    # stock-package evidence never fills the unknown installed cooler category.
    without_cooler = tower(old)
    with_new_cpu = simulate(without_cooler, [replacement(new)], data)
    assert (
        material_dependencies(
            without_cooler, with_new_cpu, evidence(True, True, new.id, True), request()
        )[0]["state"]
        == "included"
    )
    assert (
        material_dependencies(
            without_cooler, with_new_cpu, evidence(None, True, new.id, True), request()
        )
        == []
    )
    assert with_new_cpu.category_status["cooler"] == "unknown"


def test_reused_cooler_package_claim_leaves_actual_preview_cost_incomplete(monkeypatch):
    from dataclasses import replace

    import upgradejusto.recommendations.tower_service as module

    old, new = cpus()
    new = new.model_copy(update={"offers": (offer(new.id),)})
    cooler = part("installed-cooler", "cooler", "Synthetic installed cooler")
    data = catalog(old, new, cooler)
    before = tower(old, cooler)
    original_adapter = module.resolve_tower_evidence
    ref = EvidenceRef(
        source_id="synthetic-remount",
        url="https://example.test/remount",
        locator="Synthetic package and remount requirement",
        consulted_on="2026-10-26",
    )

    def adapter(*args):
        resolved = original_adapter(*args)
        resolved.components[cooler.id] = replace(
            resolved.components[cooler.id],
            specs=BasicSpecs(
                {
                    "thermal_compound_required_on_remount": True,
                    "thermal_compound_included": True,
                },
                {
                    "thermal_compound_required_on_remount": (ref,),
                    "thermal_compound_included": (ref,),
                },
                frozenset(),
            ),
        )
        return resolved

    monkeypatch.setattr(module, "resolve_tower_evidence", adapter)
    result = preview_snapshot(before, data, "synthetic", request(), NOW)
    assert result.items
    for item in result.items:
        assert item.dependencies[0]["state"] == "missing"
        assert item.cost["known_subtotal_ars"] == "100.00"
        assert item.cost["total_ars"] is None
        assert "dependency:thermal_compound" in item.missing_fields
        assert item.status != "recommended"


def test_retained_cpu_board_remount_stock_package_is_conditional_not_available(
    monkeypatch,
):
    from dataclasses import replace

    import upgradejusto.recommendations.tower_service as module

    cpu, _ = cpus()
    old_board = part("installed-board", "motherboard", "Synthetic installed board")
    new_board = part("different-board", "motherboard", "Synthetic replacement board")
    new_board = new_board.model_copy(update={"offers": (offer(new_board.id),)})
    data = catalog(cpu, old_board, new_board)
    before = tower(cpu, old_board)
    unchanged = before.model_dump()
    original_adapter = module.resolve_tower_evidence
    required = [True]
    ref = EvidenceRef(
        source_id="synthetic-stock-package-operation",
        url="https://example.test/stock-package-remount",
        locator="Synthetic package inclusion and conditional remount requirement",
        consulted_on="2026-10-26",
    )

    def adapter(*args):
        resolved = original_adapter(*args)
        item = resolved.components[cpu.id]
        facts = {
            "stock_cooler_included": True,
            "thermal_compound_required_on_remount": required[0],
            "thermal_compound_included": True,
        }
        resolved.components[cpu.id] = replace(
            item,
            specs=BasicSpecs(
                {**item.specs.fields, **facts},
                {**item.specs.references, **{key: (ref,) for key in facts}},
                item.specs.conflicts,
                item.specs.import_digest,
            ),
        )
        return resolved

    monkeypatch.setattr(module, "resolve_tower_evidence", adapter)
    alternatives = [
        {
            "key": "board-remount",
            "actions": canonical_actions([replacement(new_board)]),
        }
    ]
    manual = request(mode="manual_comparison", alternatives=alternatives)
    result = preview_snapshot(before, data, "synthetic-remount", manual, NOW)
    item = result.items[0]
    assert item.dependencies[0]["state"] == "missing"
    assert item.dependencies[0]["required"] is True
    assert item.dependencies[0]["source_refs"]
    assert "conditional" in item.dependencies[0]["reason"].lower()
    assert "installation is unknown" in item.dependencies[0]["reason"]
    assert item.cost["known_subtotal_ars"] == "100.00"
    assert item.cost["total_ars"] is None
    assert "dependency:thermal_compound" in item.missing_fields
    assert item.status != "recommended"
    simulated = item.evaluation.evaluated_configuration
    assert simulated.category_status["cooler"] == "unknown"
    assert (
        next(line for line in simulated.lines if line.category == "cpu")
        == before.lines[0]
    )
    confirmed = request(
        mode="manual_comparison",
        alternatives=alternatives,
        materials=[
            {
                "kind": "thermal_compound",
                "state": "available_confirmed",
                "confirmed": True,
            }
        ],
    )
    confirmed_item = preview_snapshot(
        before, data, "synthetic-remount", confirmed, NOW
    ).items[0]
    assert confirmed_item.dependencies[0]["state"] == "available_confirmed"
    assert confirmed_item.cost["total_ars"] == "100.00"
    assert confirmed_item.evaluation.verdict != "compatible"
    # No universal necessity when the operation fact is unknown.
    required[0] = None
    unknown = preview_snapshot(before, data, "synthetic-remount", manual, NOW).items[0]
    assert not any(dep["kind"] == "thermal_compound" for dep in unknown.dependencies)
    assert any(
        dep["kind"] == "motherboard" and dep["state"] == "priced"
        for dep in unknown.dependencies
    )
    assert unknown.cost["total_ars"] == "100.00"
    assert unknown.evaluation.verdict != "compatible"
    assert before.model_dump() == unchanged


def test_ram_quote_must_cover_full_quantity_or_select_sufficient_alternative():
    old = part("old-ram", "ram", "Synthetic installed RAM")
    ram = part("new-ram", "ram", "Synthetic RAM replacement")
    insufficient = offer(ram.id, stock_quantity=1)
    sufficient = offer(ram.id, offer_id="sufficient", stock_quantity=4, amount="120.00")
    priced = ram.model_copy(update={"offers": (insufficient, sufficient)})
    data = catalog(old, priced)
    before = tower(old)
    after = simulate(before, [replacement(priced, 4)], data)
    cost, quotes = incremental_cost(before, after, data, "cash", Decimal("500.00"), NOW)
    assert cost["total_ars"] == "480.00" and cost["within_budget"] is True
    assert quotes[0]["offer_id"] == "sufficient"
    assert select_offer(priced, "cash", NOW, quantity=4) is sufficient
    split = TowerAction(
        action="replace_category",
        category="ram",
        candidates=[
            {"component_id": ram.id, "quantity": 2},
            {"component_id": ram.id, "quantity": 2},
        ],
    )
    split_after = simulate(before, [split], data)
    split_cost, split_quotes = incremental_cost(
        before, split_after, data, "cash", Decimal("500.00"), NOW
    )
    assert split_cost["total_ars"] == "480.00"
    assert len(split_cost["lines"]) == 1
    assert split_cost["lines"][0]["quantity"] == 4
    assert split_quotes[0]["offer_id"] == "sufficient"
    data[ram.id] = ram.model_copy(update={"offers": (insufficient,)})
    cost, quotes = incremental_cost(before, after, data, "cash", Decimal("500.00"), NOW)
    assert cost["total_ars"] is None and cost["within_budget"] is None
    assert cost["missing_fields"] and quotes == []
    assert (
        classify(evaluation(), {"status": "supported"}, cost, [])
        == "requires_verification"
    )
    # Null is unknown, not zero: declared in_stock remains usable by contract.
    data[ram.id] = ram.model_copy(
        update={"offers": (offer(ram.id, stock_quantity=None),)}
    )
    cost, _ = incremental_cost(before, after, data, "cash", Decimal("500.00"), NOW)
    assert cost["total_ars"] == "400.00"


def test_incremental_stock_aggregates_same_part_across_actions_not_installed_units():
    old, new = cpus()
    new = new.model_copy(
        update={"offers": (offer(new.id, amount="300.00", stock_quantity=1),)}
    )
    drive = part("same-drive", "storage", "Synthetic drive")
    drive = drive.model_copy(update={"offers": (offer(drive.id, stock_quantity=1),)})
    data = catalog(old, new, drive)
    before = tower(old, drive)
    add = TowerAction(
        action="add_line",
        category="storage",
        candidates=[{"component_id": drive.id, "quantity": 1}],
    )
    after = simulate(before, [replacement(new), add, add], data)
    cost, _ = incremental_cost(before, after, data, "cash", Decimal("200.00"), NOW)
    assert cost["total_ars"] is None
    assert cost["known_subtotal_ars"] == "300.00"
    assert cost["within_budget"] is False
    assert any("available_quantity:2" in field for field in cost["missing_fields"])
    assert classify(evaluation(), {"status": "supported"}, cost, []) == "rejected"
    data[drive.id] = drive.model_copy(
        update={"offers": (offer(drive.id, stock_quantity=2),)}
    )
    cost, _ = incremental_cost(before, after, data, "cash", Decimal("600.00"), NOW)
    assert cost["total_ars"] == "500.00"
    assert (
        next(line for line in cost["lines"] if line["component_id"] == drive.id)[
            "quantity"
        ]
        == 2
    )


def test_closed_request_manual_comparison_and_decimal_budget():
    old, new = cpus()
    action = canonical_actions([replacement(new)])[0]
    manual = request(
        mode="manual_comparison",
        alternatives=[{"key": "manual", "actions": [action]}],
        workload=None,
    )
    data = catalog(old, new)
    result = preview_snapshot(tower(old), data, "synthetic", manual, NOW)
    assert (
        result.mode == "manual_comparison"
        and result.items[0].benefit["status"] == "supported"
    )
    assert result.items[0].status == "requires_verification"
    for changes in (
        {"owner_id": str(uuid4())},
        {"budget_ars": 1.2},
        {"budget_ars": "NaN"},
        {"budget_ars": "0"},
        {"mode": "manual_comparison"},
        {
            "materials": [
                {
                    "kind": "thermal_compound",
                    "state": "available_confirmed",
                    "confirmed": 1,
                }
            ]
        },
    ):
        with pytest.raises(ValidationError):
            request(**changes)


def test_actual_preview_wire_actions_roundtrip_to_manual_and_shared_simulation():
    old, new = cpus()
    before = tower(old)
    data = catalog(old, new)
    preview = preview_snapshot(before, data, "synthetic-roundtrip", request(), NOW)
    # Use the actual response JSON shape, not a locally repaired action fixture.
    wire = preview.model_dump(mode="json")
    assert wire["items"]
    for item in wire["items"]:
        actions = item["actions"]
        manual = request(
            mode="manual_comparison",
            alternatives=[{"key": item["key"], "actions": actions}],
        )
        simulation = TowerSimulationDTO.model_validate(
            {"expected_pc_revision": before.revision, "actions": actions}
        )
        assert canonical_actions(manual.alternatives[0].actions) == actions
        assert canonical_actions(simulation.actions) == actions
        assert all("candidate_context" not in action for action in actions)
        assert all(
            "line_id" not in candidate and "declared_model" not in candidate
            for action in actions
            for candidate in action["candidates"]
        )
        again = preview_snapshot(before, data, "synthetic-roundtrip", manual, NOW)
        assert again.items[0].actions == actions
        assert again.items[0].evaluation == preview.items[0].evaluation
        assert again.items[0].status == item["status"]


def test_canonical_actions_preserve_declared_xor_line_ids_and_unknown_board_bios():
    line_id = uuid4()
    actions = [
        TowerAction(
            action="replace_category",
            category="motherboard",
            line_id=None,
            candidates=[
                {"declared_model": "Synthetic unrecognized board", "quantity": 1}
            ],
            candidate_context={"bios_version": None},
        ),
        TowerAction(
            action="remove_line",
            category="fan",
            line_id=line_id,
            candidates=[],
        ),
    ]
    wire = canonical_actions(actions)
    assert wire[0]["candidate_context"] == {"bios_version": None}
    assert "component_id" not in wire[0]["candidates"][0]
    assert wire[1]["line_id"] == str(line_id)
    parsed = TowerSimulationDTO.model_validate(
        {"expected_pc_revision": 3, "actions": wire}
    )
    assert parsed.actions[0].candidate_context.bios_version is None
    assert parsed.actions[0].candidates[0].component_id is None
    assert (
        parsed.actions[0].candidates[0].declared_model == "Synthetic unrecognized board"
    )
    assert parsed.actions[1].line_id == line_id
    assert canonical_actions(parsed.actions) == wire
    # Explicit unknown BIOS clears the old board context, never inherits it.
    before = tower()
    before.context.bios_version = "Synthetic-previous-board-BIOS"
    after = simulate(before, parsed.actions[:1], catalog())
    assert after.context.bios_version is None
    assert before.context.bios_version == "Synthetic-previous-board-BIOS"
