"""G determinístico: acumulación real de reemplazos; no positivos hardware sintéticos."""

import json
from copy import deepcopy
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError
from test_recommendations import resolved_cpu_support_only_catalog

from upgradejusto.catalog.dataset import COMPONENTS, DATASET_VERSION
from upgradejusto.compatibility.http_models import Replacement
from upgradejusto.pcs.models import PC
from upgradejusto.plans.calculation import calculate_plan
from upgradejusto.plans.models import Plan, PlanCreate, PlanSnapshot
from upgradejusto.plans.repository import PlanRepository


def selection(category="ram", component="P05", quantity=2, **extra):
    return {
        "category": category,
        "candidates": [{"component_id": component, "quantity": quantity}],
        **extra,
    }


def pc():
    return PC(
        id=uuid4(),
        name="Private PC",
        revision=1,
        components=[
            {"category": "cpu", "component_id": "P01", "quantity": 1},
            {"category": "motherboard", "component_id": "P03", "quantity": 1},
            {"category": "ram", "component_id": "P04", "quantity": 2},
        ],
        context={"bios_version": "P2.30", "notes": "Private notes"},
    )


def data(identity, **changes):
    return PlanCreate.model_validate(
        {
            "name": " Plan ",
            "pc_id": identity,
            "expected_pc_revision": 1,
            "objective": "general",
            "budget_ars": "2000000.00",
            "stages": [{"name": " RAM ", "replacements": [selection()]}],
            **changes,
        }
    )


def test_acquired_twice_counts_twice_without_mutation():
    original = pc()
    before = deepcopy(original.model_dump())
    request = data(
        original.id,
        stages=[
            {"name": "First", "replacements": [selection()]},
            {"name": "Acquire again", "replacements": [selection()]},
        ],
    )
    catalog = {part.id: part for part in COMPONENTS}
    result = calculate_plan(original, request, catalog, DATASET_VERSION)
    assert result.cost.total_ars == "1532835.96"
    assert len(result.cost.lines) == 2
    assert result.stages[0].cumulative_cost.total_ars == "766417.98"
    assert result.stages[1].cumulative_cost == result.cost
    assert result.status == "requires_verification"
    assert result.benefit.status == "supported"
    assert original.model_dump() == before
    assert calculate_plan(original, request, catalog, DATASET_VERSION) == result
    assert request.name == "Plan"
    low = data(
        original.id, stages=request.model_dump()["stages"], budget_ars="1532835.95"
    )
    assert calculate_plan(original, low, catalog, DATASET_VERSION).status == "blocked"


def test_bios_chain_unknown_and_known_failure_preserved():
    original = pc()
    request = data(
        original.id,
        stages=[
            {
                "name": "Board unknown",
                "replacements": [selection("motherboard", "P03", 1)],
            },
            {"name": "CPU", "replacements": [selection("cpu", "P02", 1)]},
            {
                "name": "Board unsupported BIOS",
                "replacements": [
                    selection(
                        "motherboard",
                        "P03",
                        1,
                        candidate_context={"bios_version": "P1.20"},
                    )
                ],
            },
            {"name": "RAM", "replacements": [selection()]},
        ],
    )
    result = calculate_plan(
        original, request, resolved_cpu_support_only_catalog(), DATASET_VERSION
    )
    assert result.stages[0].evaluated_configuration.context.bios_version is None
    assert result.stages[1].evaluation.rule_results[0].state == "unknown"
    assert result.stages[2].evaluation.verdict == "incompatible"
    assert result.stages[3].evaluation.verdict == "incompatible"
    assert result.status == "blocked" and result.missing_fields
    assert result.cost.total_ars is None and result.cost.within_budget is None
    assert result.cost.known_subtotal_ars != "0"
    assert any("thermal_compound" in path for path in result.cost.missing_fields)


def test_ram_entire_set_replaced_and_return_to_base_not_improvement():
    original = pc()
    request = data(
        original.id,
        stages=[
            {"name": "New", "replacements": [selection()]},
            {"name": "Back", "replacements": [selection(component="P04")]},
        ],
    )
    result = calculate_plan(
        original, request, {p.id: p for p in COMPONENTS}, DATASET_VERSION
    )
    final_ram = [
        g
        for g in result.stages[1].evaluated_configuration.components
        if g.category == "ram"
    ]
    assert len(final_ram) == 1 and final_ram[0].component_id == "P04"
    assert final_ram[0].quantity == 2
    assert result.benefit.status == "not_an_improvement" and result.status == "blocked"
    assert result.cost.total_ars is None
    assert result.cost.known_subtotal_ars == "766417.98"


@pytest.mark.parametrize(
    "changes",
    [
        {"stages": []},
        {"owner_id": "x"},
        {"expected_pc_revision": True},
        {"budget_ars": 123},
        {"budget_ars": "1e6"},
        {"name": "\0"},
        {"stages": [{"name": "x", "replacements": [selection()], "evaluation": {}}]},
        {"stages": [{"name": "x", "replacements": [selection(), selection()]}]},
    ],
)
def test_strict_input(changes):
    with pytest.raises(ValidationError):
        data(uuid4(), **changes)


def test_snapshot_json_roundtrip_preserves_unknowns_and_strict_input():
    original = pc()
    request = data(
        original.id,
        stages=[
            {"name": "RAM", "replacements": [selection()]},
            {
                "name": "Unknown motherboard BIOS",
                "replacements": [
                    selection(
                        "motherboard",
                        "P03",
                        1,
                        candidate_context={"bios_version": None},
                    )
                ],
            },
        ],
    )
    snapshot = calculate_plan(
        original, request, {part.id: part for part in COMPONENTS}, DATASET_VERSION
    )
    # Imita exactamente los tipos JSONB sin conexión: no es prueba de PG.
    stored = json.loads(snapshot.model_dump_json())
    assert "candidate_context" not in stored["stages"][0]["replacements"][0]
    assert stored["stages"][1]["replacements"][0]["candidate_context"] == {
        "bios_version": None
    }
    assert stored["cost"]["total_ars"] is None
    assert stored["cost"]["within_budget"] is None
    assert (
        stored["stages"][1]["evaluated_configuration"]["context"]["bios_version"]
        is None
    )
    assert isinstance(stored["stages"][0]["evaluation"]["rule_results"], list)
    restored = PlanSnapshot.model_validate_json(json.dumps(stored))
    assert restored == snapshot
    assert isinstance(restored.stages[0].evaluation.rule_results, tuple)
    # La validación Python del motor sigue siendo estricta ante listas.
    with pytest.raises(ValidationError):
        PlanSnapshot.model_validate(stored)
    now = datetime.now(UTC)
    row = {
        "snapshot": stored,
        "id": uuid4(),
        "name": request.name,
        "revision": 1,
        "pc_id": original.id,
        "created_at": now,
        "updated_at": now,
    }
    plan = PlanRepository.public(row)
    assert plan.stages == snapshot.stages and plan.cost == snapshot.cost
    assert Plan.model_validate_json(plan.model_dump_json()) == plan
    assert PlanRepository.public({**row, "pc_id": None}).pc_id is None
    for category, component, quantity in (
        ("ram", "P05", 2),
        ("motherboard", "P03", 1),
    ):
        with pytest.raises(ValidationError):
            Replacement.model_validate(
                selection(category, component, quantity, candidate_context=None)
            )
