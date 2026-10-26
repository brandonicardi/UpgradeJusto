"""SYNTHETIC service/adapter algorithms; NOT PostgreSQL or real hardware proof."""

import json
from copy import deepcopy
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from upgradejusto.catalog.models import Category, Component, Source
from upgradejusto.catalog.service import ResolvedCatalog
from upgradejusto.compatibility.http_models import EvaluateRequest
from upgradejusto.compatibility.tower_application import (
    TowerCompatibilityService,
    apply_tower_actions,
)
from upgradejusto.compatibility.tower_evidence import resolve_tower_evidence
from upgradejusto.compatibility.tower_http_models import TowerSimulationDTO
from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_models import Tower

SOURCE = {
    "source_id": "synthetic-tower-application-only",
    "url": "https://example.test/synthetic-algorithm",
    "locator": "SYNTHETIC TEST; not manufacturer evidence",
    "consulted_on": "2026-10-26",
}


def component(identity, category, fields=None):
    fields = fields or {}
    return Component(
        id=identity,
        category=Category(category),
        name="SYNTHETIC " + identity,
        attributes={
            "basic_stock_v1": json.dumps(
                {
                    "version": 1,
                    "data": fields,
                    "fields": {key: [SOURCE["source_id"]] for key in fields},
                    "conflicts": {},
                    "import_digest": "a" * 64,
                }
            )
        },
        sources=(Source(id=SOURCE["source_id"], url=SOURCE["url"]),),
    )


def setup():
    catalog = ResolvedCatalog(
        [component(f"cpu-{index:03}", "cpu") for index in range(61)]
        + [
            component("board", "motherboard"),
            component("ram-a", "ram"),
            component("ram-b", "ram"),
            component("gpu", "gpu", {"length_mm": 400}),
            component("case", "case", {"gpu_length_limit_mm": 300}),
            component("drive-a", "storage"),
            component("drive-b", "storage"),
        ],
        support_rows=(),
        source_rows=(SOURCE,),
    )
    categories = ("cpu", "motherboard", "ram", "gpu", "case", "storage")
    identities = ("cpu-060", "board", "ram-a", "gpu", "case", "drive-a")
    tower = Tower.model_validate(
        {
            "schema_version": 2,
            "id": uuid4(),
            "name": "SYNTHETIC tower",
            "revision": 3,
            "origin_schema": 2,
            "category_status": {
                category: "present" if category in categories else "unknown"
                for category in Category
            },
            "lines": [
                dict(
                    line_id=UUID(int=index),
                    category=category,
                    component_id=identity,
                    quantity=2 if category == "ram" else 1,
                )
                for index, (category, identity) in enumerate(
                    zip(categories, identities, strict=True), 1
                )
            ],
            "context": {"bios_version": "DECLARED", "notes": "PRIVATE TEST ONLY"},
        }
    )
    owner = uuid4()

    class ReadRepository:
        def get_for_evaluation(self, actor, identity, expected_revision):
            if actor != owner or identity != tower.id:
                raise PCError(404, "PC not found")
            if expected_revision != tower.revision:
                raise PCError(409, "PC revision conflict")
            return tower.model_copy(deep=True)

    class Catalog:
        repository = SimpleNamespace(dataset_version="synthetic-published")

        def resolution_snapshot(self):
            return catalog

    service = TowerCompatibilityService(ReadRepository(), Catalog())
    return tower, owner, catalog, service


def request(*actions):
    return TowerSimulationDTO.model_validate(
        {"expected_pc_revision": 3, "actions": list(actions)}
    )


def action(category, identity, **changes):
    return dict(
        action="replace_category",
        category=category,
        candidates=[dict(component_id=identity, quantity=1)],
        **changes,
    )


def test_service_resolves_all_ids_and_known_failure_keeps_unknown_without_writes():
    tower, owner, _, service = setup()
    original = deepcopy(tower.model_dump())
    result = service.run(owner, tower.id, EvaluateRequest(expected_pc_revision=3))
    assert result.verdict == "incompatible"
    assert "T04" in result.coverage.failed
    assert result.missing_fields and not result.coverage.complete
    assert len(result.coverage.required) == 12
    assert result.data_revision.startswith("synthetic-published|")
    assert result.evaluated_configuration.lines[0].component_id == "cpu-060"
    assert result.evaluated_configuration.id == tower.id
    assert tower.model_dump() == original
    assert not hasattr(service.repository, "update")


def test_import_adapter_does_not_infer_storage_or_parse_declarations():
    tower, _, catalog, _ = setup()
    evidence = resolve_tower_evidence(tower, catalog, "synthetic-published")
    assert evidence.components["cpu-060"].data_revision == evidence.data_revision
    assert evidence.components["drive-a"].specs.fact("storage_interface") is None
    tower.lines[-1].component_id = None
    tower.lines[-1].declared_model = "NVMe 2280 SATA power zero"
    evidence = resolve_tower_evidence(tower, catalog, "synthetic-published")
    assert "drive-a" not in evidence.components
    assert evidence.cpu_support is None  # no fallback demo CPU/BIOS table


def test_published_fractional_nominal_dimension_failure_survives_adapter():
    tower, owner, catalog, service = setup()
    catalog["gpu"] = component("gpu", "gpu", {"length_mm": 400.5})
    result = service.run(owner, tower.id, EvaluateRequest(expected_pc_revision=3))
    assert result.verdict == "incompatible"
    assert "T04" in result.coverage.failed
    assert result.missing_fields


def test_cumulative_actions_replace_ram_and_preserve_distinct_disks_ephemerally():
    tower, owner, _, service = setup()
    original = tower.model_dump()
    data = request(
        action("ram", "ram-b"),
        dict(
            action="add_line",
            category="storage",
            candidates=[dict(component_id="drive-b", quantity=2)],
        ),
        action("motherboard", "board"),
    )
    result = service.run(owner, tower.id, data).evaluated_configuration
    assert [line.component_id for line in result.lines if line.category == "ram"] == [
        "ram-b"
    ]
    assert [
        (line.component_id, line.quantity)
        for line in result.lines
        if line.category == "storage"
    ] == [("drive-a", 1), ("drive-b", 2)]
    assert len({line.line_id for line in result.lines}) == len(result.lines)
    assert result.context.bios_version is None
    assert result.revision == tower.revision
    assert tower.model_dump() == original


def test_explicit_new_board_bios_and_own_line_remove_replace():
    tower, _, catalog, _ = setup()
    disk = tower.lines[-1]
    data = request(
        dict(
            action="replace_line",
            category="storage",
            line_id=str(disk.line_id),
            candidates=[dict(component_id="drive-b", quantity=3)],
        ),
        action("motherboard", "board", candidate_context={"bios_version": "EXACT NEW"}),
    )
    result = apply_tower_actions(tower, data.actions, catalog)
    assert result.context.bios_version == "EXACT NEW"
    assert not any(line.line_id == disk.line_id for line in result.lines)
    data = request(
        dict(
            action="remove_line",
            category="storage",
            line_id=str(disk.line_id),
            candidates=[],
        )
    )
    result = apply_tower_actions(tower, data.actions, catalog)
    assert result.category_status["storage"] == "absent"


@pytest.mark.parametrize("case", ["owner", "revision", "catalog"])
def test_owner_and_revision_conflicts(case):
    tower, owner, catalog, service = setup()
    if case == "catalog":
        del catalog["cpu-060"]
    with pytest.raises(PCError) as raised:
        service.run(
            uuid4() if case == "owner" else owner,
            tower.id,
            EvaluateRequest(expected_pc_revision=99 if case == "revision" else 3),
        )
    assert raised.value.status == (404 if case == "owner" else 409)


@pytest.mark.parametrize("category", ["storage", "fan"])
def test_foreign_or_wrong_category_line_id_is_rejected(category):
    tower, _, catalog, _ = setup()
    data = request(
        dict(
            action="remove_line",
            category=category,
            line_id=str(uuid4()),
            candidates=[],
        )
    )
    with pytest.raises(PCError) as raised:
        apply_tower_actions(tower, data.actions, catalog)
    assert raised.value.status == 422


@pytest.mark.parametrize(
    "change",
    [
        {"action": "replace_line", "line_id": str(UUID(int=3))},
        {"action": "add_line"},
        {"candidate_context": {"bios_version": "X"}},
        {"owner_id": str(UUID(int=1))},
        {"coverage": {"complete": True}},
        {
            "candidates": [
                {"declared_model": "label", "component_id": "ram-b", "quantity": 1}
            ]
        },
    ],
)
def test_action_dto_rejects_forbidden_semantics(change):
    with pytest.raises(ValidationError):
        request({**action("ram", "ram-b"), **change})


def test_simulation_quantity_caps_and_wrong_catalog_category():
    tower, _, catalog, _ = setup()
    data = request(action("storage", "drive-b"))
    data.actions[0].candidates[0].quantity = 17
    with pytest.raises(PCError) as raised:
        apply_tower_actions(tower, data.actions, catalog)
    assert raised.value.status == 422
    with pytest.raises(PCError) as raised:
        apply_tower_actions(tower, request(action("storage", "board")).actions, catalog)
    assert raised.value.status == 422
