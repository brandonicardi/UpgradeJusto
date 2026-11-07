"""Money spent and remaining are derived per read from the frozen snapshot prices."""

from datetime import UTC, datetime
from uuid import uuid4

from upgradejusto.plans.tower_models import TowerPlanRead
from upgradejusto.plans.tower_progress import money_progress


def snapshot(*totals):
    return {
        "stages": [
            {"position": i, "cost": {"total_ars": total}}
            for i, total in enumerate(totals, 1)
        ]
    }


def test_spent_and_remaining_split_the_frozen_stage_totals():
    spent, remaining = money_progress(
        snapshot("92500.00", "389900.00", "60000.00"), ["a", "b", "c"], {"a": 1}
    )
    assert (spent, remaining) == ("92500.00", "449900.00")


def test_nothing_marked_spends_zero_and_all_marked_leaves_zero():
    plan = snapshot("10.10", "20.20")
    assert money_progress(plan, ["a", "b"], {}) == ("0.00", "30.30")
    assert money_progress(plan, ["a", "b"], {"a": 1, "b": 1}) == ("30.30", "0.00")


def test_a_missing_price_is_unknown_never_zero():
    plan = snapshot("10.00", None, "5.00")
    assert money_progress(plan, ["a", "b", "c"], {"a": 1}) == ("10.00", None)
    assert money_progress(plan, ["a", "b", "c"], {"b": 1}) == (None, "15.00")


def test_a_stage_without_cost_counts_as_unknown():
    plan = {"stages": [{"position": 1}]}
    assert money_progress(plan, ["a"], {}) == ("0.00", None)


def test_plan_read_exposes_the_derived_amounts_as_strings_or_null():
    base = {
        "id": uuid4(),
        "name": "Plan",
        "revision": 1,
        "pc_id": None,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
        "snapshot": {},
    }
    plan = TowerPlanRead(**base, spent_ars="1.00", remaining_ars=None)
    dumped = plan.model_dump(mode="json")
    assert dumped["spent_ars"] == "1.00" and dumped["remaining_ars"] is None
    assert TowerPlanRead(**base).spent_ars is None
