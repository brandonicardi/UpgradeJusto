"""H puro: proyección por allowlist y rechazo de token/identidad elegidos por cliente."""

import json
from copy import deepcopy

import pytest
from pydantic import ValidationError
from test_plans import data, pc

from upgradejusto.administration.initial import initial_entries
from upgradejusto.administration.models import SupportData
from upgradejusto.catalog.dataset import COMPONENTS, DATASET_VERSION
from upgradejusto.compatibility.curation import BOARD_REF
from upgradejusto.plans.calculation import calculate_plan
from upgradejusto.shares.models import PublishRequest
from upgradejusto.shares.projection import (
    PublicCatalogContext,
    missing_fields,
    public_fact,
    public_snapshot,
)


def source_context():
    # Explicit unit-only authority, never an application fallback for PostgreSQL.
    entries = initial_entries([p.model_dump(mode="json") for p in COMPONENTS])
    support = [
        SupportData.model_validate_json(json.dumps(entry["data"]))
        for entry in entries
        if entry["collection"] == "cpu_support"
    ]
    return PublicCatalogContext(COMPONENTS, support)


def snapshot():
    original = pc()
    return calculate_plan(
        original,
        data(original.id),
        {p.id: p for p in COMPONENTS},
        DATASET_VERSION,
    ).model_dump(mode="json")


def poison(value):
    if isinstance(value, dict):
        for child in list(value.values()):
            poison(child)
        for key in (
            "notes",
            "pc_id",
            "plan_id",
            "owner_id",
            "email",
            "conversation",
            "token",
        ):
            value[key] = "PRIVATE-SENTINEL"
    elif isinstance(value, list):
        for child in value:
            poison(child)


def test_projection_recursive_does_not_publish_private_fields_or_urls():
    private = snapshot()
    poison(private)
    private["stages"][0]["name"] = "PRIVATE-SENTINEL"
    rule = private["stages"][0]["evaluation"]["rule_results"][0]
    rule["facts"].extend(
        [
            {"name": "notes", "value": "PRIVATE-SENTINEL"},
            {"name": "minimum_bios", "value": {"notes": "PRIVATE-SENTINEL"}},
        ]
    )
    rule["evidence"].extend(
        [
            {
                "source_id": "evil",
                "url": "http://localhost/private?token=PRIVATE-SENTINEL",
            },
            {
                "source_id": "evil",
                "url": "https://user:PRIVATE-SENTINEL@example.test/private",
            },
            {**BOARD_REF.model_dump(mode="json"), "locator": "PRIVATE-SENTINEL"},
        ]
    )
    rule["conditions"].append("PRIVATE-SENTINEL")
    rule["missing_fields"].append("cpu_support.notes.PRIVATE-SENTINEL")
    private["cost"]["lines"].append(
        {
            "component_id": "P05",
            "quantity": 1,
            "unit_amount": "1",
            "currency": "ARS",
            "date": "2026-10-20",
            "source": "https://user:PRIVATE-SENTINEL@localhost/private",
        }
    )
    private["benefit"]["evidence"] = [{"url": "http://localhost/PRIVATE-SENTINEL"}]
    before = deepcopy(private)
    public = public_snapshot(private, "Explicit public title", source_context())
    assert private == before
    encoded = json.dumps(public)
    assert "PRIVATE-SENTINEL" not in encoded
    assert "localhost" not in encoded
    assert "base_snapshot" not in public
    assert public["cost"]["total_ars"] is None
    assert public["status"] == private["status"] == "requires_verification"
    assert public["stages"][0]["name"] == "Etapa 1"
    assert public["stages"][0]["evaluated_configuration"]["context"] == {
        "bios_version": "P2.30"
    }
    nested = public["stages"][0]["evaluation"]["evaluated_configuration"]
    assert nested["context"] == {"bios_version": "P2.30"}
    for key in (
        "pc_id",
        "plan_id",
        "owner_id",
        "notes",
        "email",
        "conversation",
        "token",
    ):
        assert f'"{key}"' not in encoded


def test_normal_projection_preserves_technical_result_and_historical_cost():
    private = snapshot()
    public = public_snapshot(private, "Public title", source_context())
    assert public["cost"] == private["cost"]
    assert public["benefit"] == {"status": "unknown", "evidence": []}
    assert public["status"] == private["status"]
    assert (
        public["stages"][0]["evaluation"]["coverage"]
        == private["stages"][0]["evaluation"]["coverage"]
    )
    assert public["stages"][0]["evaluation"]["verdict"] == "requiere_verificacion"
    assert public["warnings"] and public["missing_fields"]


def test_resource_facts_are_typed_not_a_new_text_or_url_publication_channel():
    assert public_fact({"name": "pcie_gpu_generation", "value": 4}) == {
        "name": "pcie_gpu_generation",
        "value": 4,
        "unit": None,
    }
    assert public_fact(
        {"name": "front_effective_rate_mbps", "value": 5000, "unit": "PRIVATE"}
    ) == {
        "name": "front_effective_rate_mbps",
        "value": 5000,
        "unit": "Mb/s",
    }
    for name in (
        "pcie_gpu_generation",
        "power_voltage",
        "resource_available",
        "front_effective_rate_mbps",
    ):
        assert public_fact({"name": name, "value": "http://localhost/PRIVATE"}) is None
    assert public_fact({"name": "power_voltage", "value": True})["value"] is True
    assert missing_fields(
        [
            "front.routes",
            "power.loads.0.assignment",
            "storage.inventory",
            "pcie.notes.PRIVATE",
        ]
    ) == [
        "front.routes",
        "power.loads.0.assignment",
        "storage.inventory",
    ]


@pytest.mark.parametrize(
    "changes",
    [
        {"expected_plan_revision": True},
        {"title": "\0"},
        {"title": " "},
        {"token": "chosen"},
        {"owner_id": "chosen"},
        {"snapshot": {}},
    ],
)
def test_publish_input_rejects_authority_and_extra_fields(changes):
    with pytest.raises(ValidationError):
        PublishRequest.model_validate(
            {"expected_plan_revision": 1, "title": "Public", **changes}
        )
