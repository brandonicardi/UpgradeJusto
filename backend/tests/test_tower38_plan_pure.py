"""Synthetic domain fixtures; a patched green gate is NOT actual hardware proof."""

from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError
from test_tower38_recommend_pure import NOW, catalog, cpus, offer, part, tower

from upgradejusto.compatibility.tower_contract import REQUIRED, TowerRuleResult
from upgradejusto.pcs.service import PCError
from upgradejusto.plans.tower_calculation import (
    finish_snapshot,
    iter_stages,
    purchase_cost,
)
from upgradejusto.plans.tower_models import TowerPlanCreate
from upgradejusto.plans.tower_service import Generation, canonical_request, request_hash
from upgradejusto.recommendations.tower_service import canonical_actions, replacement


def priced(component, amount="100.00", stock=10):
    quote = offer(
        component.id,
        amount=amount,
        stock_quantity=stock,
        store="compragamer",
        product_id="synthetic-" + component.id,
        source_url="https://example.test/quote",
    )
    return component.model_copy(update={"offers": (quote,)})


def draft(base, stages, **changes):
    return TowerPlanCreate.model_validate(
        {
            "kind": "tower_plan",
            "schema_version": 2,
            "client_request_id": str(uuid4()),
            "name": "Synthetic plan",
            "pc_id": str(base.id),
            "expected_pc_revision": base.revision,
            "expected_catalog_version": "synthetic-publication",
            "objective": "productivity",
            "workload": "blender-cpu",
            "budget_ars": "1000.00",
            "price_condition": "cash",
            "stages": stages,
            **changes,
        }
    )


def stage(*actions, budget="1000.00", materials=None):
    return {
        "name": "Synthetic stage",
        "budget_ars": budget,
        "materials": materials or [],
        "actions": canonical_actions(actions),
    }


def calculate(base, request, data):
    stages = list(iter_stages(base, request, data, "synthetic-publication", NOW))
    return finish_snapshot(base, request, data, "synthetic-publication", NOW, stages)


def test_accumulated_ram_bios_storage_unknown_and_immutable_base():
    from upgradejusto.compatibility.tower_http_models import TowerAction

    old, new = cpus()
    ram = priced(part("ram", "ram", "Synthetic RAM16", capacity_per_module_gb=16))
    board = priced(part("board", "motherboard", "Synthetic board"))
    drive = priced(part("drive", "storage", "Synthetic drive"))
    data = catalog(old, new, ram, board, drive)
    base = tower(old)
    base.context.bios_version = "Declared-old-board"
    saved = base.model_dump()
    add = TowerAction(
        action="add_line",
        category="storage",
        candidates=[{"component_id": drive.id, "quantity": 1}],
    )
    request = draft(base, [stage(replacement(ram, 2)), stage(replacement(board), add)])
    result = calculate(base, request, data)
    first, second = result["stages"]
    assert (
        first["evaluated_configuration"]["context"]["bios_version"]
        == "Declared-old-board"
    )
    assert second["evaluated_configuration"]["context"]["bios_version"] is None
    assert (
        sum(
            line["quantity"]
            for line in second["evaluated_configuration"]["lines"]
            if line["category"] == "ram"
        )
        == 2
    )
    assert any(
        line["component_id"] == drive.id
        for line in second["evaluated_configuration"]["lines"]
    )
    assert result["status"] != "ready" and result["missing_fields"]
    assert result["versions"]["catalog"] == "synthetic-publication"
    assert result["versions"]["calculation"] == "tower-plan-calculation-1"
    assert base.model_dump() == saved
    assert calculate(base, request, data) == result


def test_prefix_stock_six_plus_six_cannot_reuse_ten_known_units():
    from upgradejusto.compatibility.tower_http_models import TowerAction

    old, _ = cpus()
    fan = priced(part("fan", "fan", "Synthetic fan"), stock=10)
    base, data = tower(old), catalog(old, fan)
    add = TowerAction(
        action="add_line",
        category="fan",
        candidates=[{"component_id": fan.id, "quantity": 6}],
    )
    request = draft(base, [stage(add), stage(add)], budget_ars="2000.00")
    result = calculate(base, request, data)
    assert result["stages"][0]["cost"]["total_ars"] == "600.00"
    assert result["stages"][1]["cost"]["total_ars"] is None
    assert result["cost"]["known_subtotal_ars"] == "600.00"
    assert result["cost"]["total_ars"] is None
    assert any(
        "prefix_available_quantity" in field for field in result["missing_fields"]
    )
    add_four = add.model_copy(deep=True)
    add_four.candidates[0].quantity = 4
    extended = calculate(
        base,
        draft(base, [stage(add), stage(add), stage(add_four)], budget_ars="2000.00"),
        data,
    )
    assert extended["stages"][2]["cost"]["total_ars"] is None
    assert extended["cost"]["known_subtotal_ars"] == "600.00"


def test_stage_budget_and_total_known_failure_preserve_unknown_subtotals():
    old, new = cpus()
    new = priced(new, "300.00")
    unpriced = part("unpriced-psu", "psu", "Unpriced PSU")
    base, data = tower(old), catalog(old, new, unpriced)
    request = draft(
        base,
        [stage(replacement(new), budget="200.00"), stage(replacement(unpriced))],
        budget_ars="250.00",
    )
    result = calculate(base, request, data)
    assert result["stages"][0]["cost"]["within_budget"] is False
    assert result["cost"]["total_ars"] is None
    assert result["cost"]["known_subtotal_ars"] == "300.00"
    assert result["cost"]["within_budget"] is False
    assert result["status"] == "blocked" and result["missing_fields"]


def test_preparation_and_green_status_are_only_synthetic_gate_proofs(monkeypatch):
    import upgradejusto.plans.tower_calculation as module

    original = module.evaluate_tower

    def synthetic_green(*args):
        result = original(*args)
        return result.model_copy(
            update={
                "verdict": "compatible",
                "missing_fields": (),
                "coverage": result.coverage.model_copy(
                    update={
                        "complete": True,
                        "passed": REQUIRED,
                        "failed": (),
                        "unknown": (),
                        "not_applicable": (),
                        "not_implemented": (),
                    }
                ),
                "rule_results": tuple(
                    TowerRuleResult(rule_id=r, family=r, state="pass") for r in REQUIRED
                ),
            }
        )

    monkeypatch.setattr(module, "evaluate_tower", synthetic_green)
    old, new = cpus()
    new = priced(new)
    psu = priced(part("synthetic-psu", "psu", "Synthetic PSU"))
    base, data = tower(old), catalog(old, new, psu)
    result = calculate(
        base, draft(base, [stage(replacement(psu)), stage(replacement(new))]), data
    )
    assert result["status"] == "ready"
    assert "preparation" in result["stages"][0]["benefit"]["label"]
    assert result["benefit"]["status"] == "supported"

    def fail_and_missing(*args):
        result = synthetic_green(*args)
        rules = list(result.rule_results)
        rules[0] = TowerRuleResult(rule_id="T01", family="T01", state="fail")
        rules[1] = TowerRuleResult(
            rule_id="T02",
            family="T02",
            state="unknown",
            missing_fields=("synthetic.missing",),
        )
        return result.model_copy(
            update={
                "verdict": "incompatible",
                "missing_fields": ("synthetic.missing",),
                "rule_results": tuple(rules),
                "coverage": result.coverage.model_copy(
                    update={
                        "complete": False,
                        "passed": REQUIRED[2:],
                        "failed": ("T01",),
                        "unknown": ("T02",),
                    }
                ),
            }
        )

    monkeypatch.setattr(module, "evaluate_tower", fail_and_missing)
    failed = calculate(base, draft(base, [stage(replacement(new))]), data)
    assert failed["status"] == "blocked"
    assert any("synthetic.missing" in path for path in failed["missing_fields"])


def test_canonical_hash_decimal_normalization_and_closed_cardinality():
    from upgradejusto.compatibility.tower_http_models import TowerAction

    base = tower()
    board = TowerAction(
        action="replace_category",
        category="motherboard",
        candidates=[{"declared_model": "Unknown board", "quantity": 1}],
        candidate_context={"bios_version": None},
    )
    request = draft(base, [stage(board, budget="100")], budget_ars="100")
    same = request.model_copy(deep=True)
    assert request_hash(same) == request_hash(request)
    assert canonical_request(request)["stages"][0]["actions"][0][
        "candidate_context"
    ] == {"bios_version": None}
    assert request.budget_ars == "100.00" and request.stages[0].budget_ars == "100.00"
    changed = request.model_copy(update={"expected_pc_revision": 99})
    assert request_hash(changed) != request_hash(request)
    body = request.model_dump(mode="json")
    for changes in (
        {"owner_id": str(uuid4())},
        {"budget_ars": 1.0},
        {"schema_version": 2.0},
        {"stages": []},
    ):
        with pytest.raises(ValidationError):
            TowerPlanCreate.model_validate({**body, **changes})
    too_many = [
        {**body["stages"][0], "actions": [body["stages"][0]["actions"][0]] * 36}
    ] * 3
    with pytest.raises(ValidationError):
        TowerPlanCreate.model_validate({**body, "stages": too_many})


def test_generation_deadline_expiry_and_size_fail_closed(monkeypatch):
    import upgradejusto.plans.tower_service as module

    old, new = cpus()
    base, data = tower(old), catalog(old, priced(new))
    request = draft(base, [stage(replacement(new))])
    clock = [0.0]
    generation = Generation(request, clock=lambda: clock[0])
    clock[0] = 5.0
    with pytest.raises(PCError) as expired:
        generation.calculate(base, data, "synthetic", NOW)
    assert expired.value.status == 408
    generation = Generation(request, clock=lambda: 0.0)
    snapshot = generation.calculate(base, data, "synthetic", NOW)
    with pytest.raises(PCError) as quote_expired:
        generation.before_commit(snapshot, NOW.replace(year=2027))
    assert quote_expired.value.status == 409
    monkeypatch.setattr(
        module, "finish_snapshot", lambda *args: {"oversized": "x" * 1048577}
    )
    with pytest.raises(PCError) as oversized:
        generation.calculate(base, data, "synthetic", NOW)
    assert oversized.value.status == 422


def test_full_snapshot_over50_and_reacquisition_are_not_free():
    from upgradejusto.plans.tower_calculation import stage_configuration

    old, new = cpus()
    new = priced(new)
    noise = [part(f"noise-{i:03}", "cpu", "Unknown") for i in range(70)]
    data, base = catalog(old, *noise, new), tower(old)
    first = stage_configuration(base, [replacement(new)], data, 1)
    second = stage_configuration(first, [replacement(new)], data, 2)
    consumed = {}
    one, _ = purchase_cost(base, first, data, "cash", Decimal("1000"), NOW, consumed)
    two, _ = purchase_cost(first, second, data, "cash", Decimal("1000"), NOW, consumed)
    assert one["total_ars"] == two["total_ars"] == "100.00"


def test_material_included_in_stage_one_is_not_redeemed_on_stage_two(monkeypatch):
    from dataclasses import replace

    import upgradejusto.plans.tower_calculation as module
    from upgradejusto.compatibility.basic_specs import BasicSpecs
    from upgradejusto.compatibility.observations import EvidenceRef

    old, _ = cpus()
    cooler = priced(part("new-cooler", "cooler", "Synthetic cooler package"))
    board = priced(part("new-board", "motherboard", "Synthetic board"))
    data, base = catalog(old, cooler, board), tower(old)
    original = module.resolve_tower_evidence
    ref = EvidenceRef(
        source_id="synthetic-cooler-operation",
        url="https://example.test/cooler",
        locator="Synthetic package/operation fixture",
        consulted_on="2026-10-26",
    )

    def resolve(*args):
        evidence = original(*args)
        item = evidence.components[cooler.id]
        facts = {
            "thermal_compound_required_on_remount": True,
            "thermal_compound_included": True,
        }
        evidence.components[cooler.id] = replace(
            item,
            specs=BasicSpecs(
                {**item.specs.fields, **facts},
                {**item.specs.references, **{key: (ref,) for key in facts}},
                item.specs.conflicts,
                item.specs.import_digest,
            ),
        )
        return evidence

    monkeypatch.setattr(module, "resolve_tower_evidence", resolve)
    request = draft(base, [stage(replacement(cooler)), stage(replacement(board))])
    result = calculate(base, request, data)
    assert result["stages"][0]["dependencies"][0]["state"] == "included"
    assert result["stages"][1]["dependencies"][0]["state"] == "missing"
    assert result["cost"]["total_ars"] is None
    assert result["cost"]["known_subtotal_ars"] == "200.00"
    confirmed = draft(
        base,
        [
            stage(replacement(cooler)),
            stage(
                replacement(board),
                materials=[
                    {
                        "kind": "thermal_compound",
                        "state": "available_confirmed",
                        "confirmed": True,
                    }
                ],
            ),
        ],
    )
    confirmed_result = calculate(base, confirmed, data)
    assert (
        confirmed_result["stages"][1]["dependencies"][0]["state"]
        == "available_confirmed"
    )
    assert confirmed_result["cost"]["total_ars"] == "200.00"


def test_maximum_action_prefixes_use_actual_generation_deadline_without_green_claim():
    # Build measures execution:12*8=96 actions over a densely populated synthetic
    # tower. This exercises the real deadline, not a fabricated timing result.
    parts = []
    for category, count in (
        ("cpu", 1),
        ("motherboard", 1),
        ("ram", 4),
        ("gpu", 1),
        ("psu", 1),
        ("case", 1),
        ("storage", 16),
        ("cooler", 1),
        ("fan", 8),
    ):
        parts.extend(
            part(f"dense-{category}-{i}", category, "Synthetic unidentified part")
            for i in range(count)
        )
    base = tower(*parts)
    for line in base.lines:
        if line.category in ("ram", "fan"):
            line.quantity = 4
    cpu = next(component for component in parts if component.category == "cpu")
    actions = [replacement(cpu)] * 8
    request = draft(base, [stage(*actions) for _ in range(12)])
    result = Generation(request).calculate(
        base, catalog(*parts), "synthetic-dense", NOW
    )
    assert len(result["stages"]) == 12
    assert sum(len(stage["actions"]) for stage in result["stages"]) == 96
    assert result["status"] != "ready" and result["missing_fields"]
