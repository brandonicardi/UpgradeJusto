"""The closed per-category attribute list must cover what the policy reports."""

from test_tower38_engine import fixture
from test_tower_essential import evaluate

from upgradejusto.compatibility.tower_essential import ESSENTIAL_ATTRIBUTES

# Reported without one attribute behind them, or read from two alternatives.
STRUCTURAL = {
    "cpu_support",
    "gpu.manufacturer_system_recommendation_w",
    "ram.modules",
}
ALIASES = {
    ("motherboard", "ram_slots"): "slots",
    ("gpu", "power_kind"): "gpu_power_kind",
    ("gpu", "power_count"): "gpu_power_count",
}


def reported_attributes(tower, missing_fields):
    by_line = {str(line.line_id): line.category.value for line in tower.lines}
    reported = {category: set() for category in ESSENTIAL_ATTRIBUTES}
    for path in missing_fields:
        if path in STRUCTURAL:
            continue
        parts = path.split(".")
        category, attribute = parts[0], parts[-1]
        category = by_line.get(category, category)
        assert category in ESSENTIAL_ATTRIBUTES, path
        reported[category].add(ALIASES.get((category, attribute), attribute))
    return reported


def test_every_reported_attribute_is_in_the_closed_list():
    tower, fields, support = fixture()
    empty = {category: {} for category in fields}
    result = evaluate(tower, empty, support)
    reported = reported_attributes(tower, result.missing_fields)
    for category, attributes in reported.items():
        assert attributes <= ESSENTIAL_ATTRIBUTES[category] | {
            "pcie_interface",
            "module_1",
        }, category


def test_cooling_and_fans_are_not_flagged_as_missing_data():
    assert not {"cooler", "fan"} & set(ESSENTIAL_ATTRIBUTES)
