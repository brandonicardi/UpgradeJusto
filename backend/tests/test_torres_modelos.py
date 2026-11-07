"""38A pure model gates, not PostgreSQL or compatibility certification."""

from copy import deepcopy
from uuid import uuid4

import pytest
from pydantic import ValidationError

from upgradejusto.catalog.models import Category
from upgradejusto.pcs.models import PCCreate
from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_models import TowerCreate
from upgradejusto.pcs.tower_repository import TowerRepository


def payload():
    return {
        "schema_version": 2,
        "name": " Synthetic tower ",
        "category_status": {category.value: "unknown" for category in Category},
        "lines": [],
        "context": {"bios_version": None, "notes": None},
    }


def declared(category, model="Unrecognized model", quantity=1, **extra):
    return {
        "category": category,
        "component_id": None,
        "declared_model": model,
        "quantity": quantity,
        **extra,
    }


def test_unknown_absent_and_declared_are_distinct_without_spec_invention():
    data = payload()
    data["category_status"].update(storage="present", fan="present", gpu="absent")
    data["lines"] = [
        declared("storage", "Disk A"),
        declared("storage", "Disk B"),
        declared("fan", quantity=4),
    ]
    before = deepcopy(data)
    tower = TowerCreate.model_validate(data)
    assert tower.name == "Synthetic tower" and len(tower.lines) == 3
    assert tower.category_status[Category.GPU] == "absent"
    assert tower.category_status[Category.PSU] == "unknown"
    assert all(
        line.component_id is None and line.line_id is None for line in tower.lines
    )
    assert tower.lines[2].quantity == 4
    assert data == before


@pytest.mark.parametrize(
    "changes",
    [
        {"schema_version": True},
        {"schema_version": "2"},
        {"owner_id": str(uuid4())},
        {"category_status": {"cpu": "unknown"}},
        {"name": " "},
    ],
)
def test_invalid_schema_and_client_authority(changes):
    with pytest.raises(ValidationError):
        TowerCreate.model_validate({**payload(), **changes})


@pytest.mark.parametrize(
    "category,quantity",
    [("cpu", 2), ("storage", 17), ("ram", 17), ("fan", 33), ("ram", True)],
)
def test_population_limits(category, quantity):
    data = payload()
    data["category_status"][category] = "present"
    data["lines"] = [declared(category, quantity=quantity)]
    with pytest.raises(ValidationError):
        TowerCreate.model_validate(data)


def test_present_requires_lines_and_unknown_or_absent_forbids_them():
    for status, lines in (
        ("present", []),
        ("unknown", [declared("storage")]),
        ("absent", [declared("storage")]),
    ):
        data = payload()
        data["category_status"]["storage"] = status
        data["lines"] = lines
        with pytest.raises(ValidationError):
            TowerCreate.model_validate(data)


def test_no_catalog_and_declaration_double_selection_or_duplicate_line_ids():
    for lines in (
        [{**declared("storage"), "component_id": "P11"}],
        [declared("storage", line_id=uuid4())] * 2,
    ):
        data = payload()
        data["category_status"]["storage"] = "present"
        data["lines"] = lines
        with pytest.raises(ValidationError):
            TowerCreate.model_validate(data)


def test_new_line_identity_is_server_owned_and_legacy_dto_stays_six_categories():
    data = payload()
    data["category_status"]["storage"] = "present"
    data["lines"] = [declared("storage", line_id=uuid4())]
    with pytest.raises(PCError) as error:
        TowerRepository._validate_line_ids(TowerCreate.model_validate(data), None)
    assert error.value.status == 422
    with pytest.raises(ValidationError):
        PCCreate(
            name="Legacy",
            components=[{"category": "storage", "component_id": "X", "quantity": 1}],
            context={"bios_version": None, "notes": None},
        )
