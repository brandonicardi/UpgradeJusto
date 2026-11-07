"""Synthetic publication observations only, never manufacturer evidence."""

import json
from copy import deepcopy

import pytest

from upgradejusto.administration.models import ComponentData
from upgradejusto.administration.validation import materialize
from upgradejusto.retail.technical_models import NominalResource
from upgradejusto.retail.technical_parser import load_technical_envelope
from upgradejusto.retail.technical_validation import validate_technical_binding


def technical_fixture(
    category="storage", component_id="synthetic-technical-38", name="SYNTHETIC ONLY"
):
    ref = {
        "source_id": "synthetic-manual",
        "url": "https://example.com/synthetic",
        "consulted_on": "2026-10-26",
        "locator": "SYNTHETIC fixture section",
    }
    data = {
        "storage_interface": "M2-NVMe",
        "storage_form": "2280",
        "sata_power_count": 0,
    }
    if category == "case":
        data = {"cooler_height_limit_mm": 150}
    if category == "motherboard":
        data = {
            "tower_ports": [
                {
                    "resource_id": "synthetic-port",
                    "kind": "M2-NVMe",
                    "accepts": ["2280"],
                    "voltage_mv": None,
                    "max_current_ma": None,
                    "excludes": [],
                    "group": "synthetic-group",
                    "cost": 1,
                }
            ],
            "shared_limits": [{"group": "synthetic-group", "capacity": 1}],
        }
    if category == "cpu":
        data = {"stock_cooler_included": True, "thermal_compound_included": False}
    payload = {
        "version": 1,
        "identity": {
            "component_id": component_id,
            "category": category,
            "name": name,
            "manufacturer_part_number": None,
            "source_refs": [ref],
        },
        "data": data,
        "fields": {key: [ref] for key in data},
        "conflicts": {},
        "import_digest": "a" * 64,
    }
    component = {
        "category": category,
        "name": name,
        "attributes": {"tower_stock_v1": json.dumps(payload)},
        "sources": [{"id": ref["source_id"], "url": ref["url"]}],
    }
    return payload, component, ref


def test_typed_loader_and_unknown_not_default():
    payload, _, _ = technical_fixture("motherboard")
    envelope = load_technical_envelope(json.dumps(payload))
    assert isinstance(envelope.data["tower_ports"][0], NominalResource)
    assert "fan_total_current_ma" not in envelope.data
    assert envelope.import_digest == "a" * 64


@pytest.mark.parametrize(
    "mutation",
    [
        "extra",
        "version_bool",
        "float",
        "bool_number",
        "null",
        "unknown_field",
        "fields_missing",
        "substring",
        "casefold",
        "wrong_category",
        "duplicate_ref",
        "nonfinite",
        "identity_extra",
        "ram",
        "fractional_mm",
    ],
)
def test_closed_strict_input(mutation):
    payload, _, ref = technical_fixture()
    if mutation == "extra":
        payload["compatible"] = True
    elif mutation == "version_bool":
        payload["version"] = True
    elif mutation in {"float", "bool_number", "null", "nonfinite"}:
        payload["data"]["sata_power_count"] = {
            "float": 1.0,
            "bool_number": True,
            "null": None,
            "nonfinite": float("nan"),
        }[mutation]
    elif mutation == "unknown_field":
        payload["data"]["sql"] = "DROP TABLE"
    elif mutation == "fields_missing":
        payload["fields"].pop("storage_form")
    elif mutation == "substring":
        payload["data"]["storage_form"] = "2280,22110"
    elif mutation == "casefold":
        payload["data"]["storage_interface"] = "m2-nvme"
    elif mutation == "wrong_category":
        payload["identity"]["category"] = "gpu"
    elif mutation == "duplicate_ref":
        payload["fields"]["storage_form"] = [ref, ref]
    elif mutation == "identity_extra":
        payload["identity"]["owner_id"] = "model-authorization"
    elif mutation == "ram":
        payload["identity"]["category"] = "ram"
    else:
        payload, _, _ = technical_fixture("case")
        payload["data"]["cooler_height_limit_mm"] = 150.5
    with pytest.raises(ValueError):
        load_technical_envelope(json.dumps(payload))


def test_duplicate_json_and_utf8_byte_limit():
    payload, _, _ = technical_fixture()
    raw = json.dumps(payload)
    with pytest.raises(ValueError):
        load_technical_envelope(
            raw.replace('"version": 1', '"version": 1, "version": 1')
        )
    payload["identity"]["name"] = "SYNTHETIC é"
    raw = json.dumps(payload, ensure_ascii=False)
    raw += " " * (24000 - len(raw))
    assert len(raw) == 24000 and len(raw.encode("utf-8")) > 24000
    with pytest.raises(ValueError):
        load_technical_envelope(raw)


def test_reference_count_501_independent_of_byte_cap(monkeypatch):
    import upgradejusto.retail.technical_parser as parser

    # Isolate reference-count guard: normal byte cap also rejects this payload.
    monkeypatch.setattr(parser, "MAX_BYTES", 200000)
    payload, _, ref = technical_fixture("case")
    payload["data"], payload["fields"] = {}, {}
    for key in ("cooler_height_limit_mm", "fan_positions"):
        payload["conflicts"][key] = [
            {
                "value": index + 1,
                "source_refs": [
                    {**ref, "locator": f"SYNTHETIC-{n}"} for n in range(30)
                ],
            }
            for index in range(8)
        ]
    payload["conflicts"]["fan_supported_sizes_mm"] = [
        {
            "value": [index + 1],
            "source_refs": [{**ref, "locator": f"SYNTHETIC-{n}"} for n in range(10)],
        }
        for index in range(2)
    ]
    with pytest.raises(ValueError, match="Too many technical references"):
        parser.load_technical_envelope(json.dumps(payload))


@pytest.mark.parametrize(
    "key",
    ["source_id", "url", "consulted_on", "locator", "component_id", "name", "category"],
)
def test_exact_reference_and_identity_binding(key):
    payload, component, ref = technical_fixture()
    row = deepcopy(ref)
    identity = payload["identity"]["component_id"]
    if key in row:
        row[key] = "wrong" if key != "url" else "https://example.com/other"
    elif key == "component_id":
        identity = "another-component"
    else:
        component[key] = "another-value"
    with pytest.raises(ValueError):
        validate_technical_binding(json.dumps(payload), identity, component, [row])


def test_materialize_sources_and_nonoverride_basic():
    payload, component, ref = technical_fixture("case")
    basic = {
        "version": 1,
        "data": {"cooler_height_limit_mm": 160},
        "fields": {"cooler_height_limit_mm": [ref["source_id"]]},
        "conflicts": {},
        "import_digest": "b" * 64,
    }
    component["attributes"]["basic_stock_v1"] = json.dumps(basic)
    identity = payload["identity"]["component_id"]
    with pytest.raises(ValueError, match="override"):
        validate_technical_binding(json.dumps(payload), identity, component, [ref])
    payload["data"], payload["fields"] = {}, {}
    payload["conflicts"] = {
        "cooler_height_limit_mm": [
            {"value": 150, "source_refs": [ref]},
            {"value": 160, "source_refs": [ref]},
        ]
    }
    component["attributes"]["tower_stock_v1"] = json.dumps(payload)
    entries = [
        {"collection": "components", "id": identity, "data": component},
        {"collection": "sources", "id": "synthetic-source-row", "data": ref},
    ]
    result = materialize(entries)
    assert result[0]["attributes"]["basic_stock_v1"] == json.dumps(basic)
    parsed = load_technical_envelope(result[0]["attributes"]["tower_stock_v1"])
    assert "cooler_height_limit_mm" not in parsed.data
    assert "cooler_height_limit_mm" in parsed.conflicts
    entries[1]["data"] = {**ref, "locator": "wrong section"}
    with pytest.raises(ValueError):
        materialize(entries)


def test_only_tower_attribute_gets_larger_limit():
    payload, component, _ = technical_fixture()
    for ref in [
        *payload["identity"]["source_refs"],
        *(r for refs in payload["fields"].values() for r in refs),
    ]:
        ref["locator"] = "SYNTHETIC " + "x" * 1800
    component["attributes"]["tower_stock_v1"] = json.dumps(payload)
    assert 2000 < len(component["attributes"]["tower_stock_v1"].encode()) < 24000
    ComponentData.model_validate(component)
    component["attributes"]["capacity_gb"] = "x" * 2001
    with pytest.raises(ValueError):
        ComponentData.model_validate(component)


@pytest.mark.parametrize("category", ["cooler", "cpu"])
def test_thermal_observations_strict_and_never_defaults(category):
    payload, _, ref = technical_fixture("cpu")
    payload["identity"]["category"] = category
    payload["data"] = {
        "thermal_compound_required_on_remount": True,
        "thermal_compound_included": False,
    }
    if category == "cpu":
        payload["data"]["stock_cooler_included"] = True
    payload["fields"] = {key: [ref] for key in payload["data"]}
    parsed = load_technical_envelope(json.dumps(payload))
    assert parsed.data["thermal_compound_included"] is False
    payload["data"]["thermal_compound_included"] = 0
    with pytest.raises(ValueError):
        load_technical_envelope(json.dumps(payload))
    payload["data"].pop("thermal_compound_included")
    payload["fields"].pop("thermal_compound_included")
    if category == "cpu":
        payload["data"]["stock_cooler_included"] = False
        with pytest.raises(ValueError):
            load_technical_envelope(json.dumps(payload))


@pytest.mark.parametrize(
    "mutation",
    [
        "bool_voltage",
        "unknown_group",
        "unknown_exclusion",
        "duplicate_resource",
        "fan_token",
    ],
)
def test_nominal_resource_closed_and_exact(mutation):
    payload, _, ref = technical_fixture("motherboard")
    resource = payload["data"]["tower_ports"][0]
    if mutation == "bool_voltage":
        resource["voltage_mv"] = True
    elif mutation == "unknown_group":
        resource["group"] = "unknown-group"
    elif mutation == "unknown_exclusion":
        resource["excludes"] = ["unknown-resource"]
    elif mutation == "duplicate_resource":
        payload["data"]["tower_ports"].append(deepcopy(resource))
    else:
        payload["data"]["fan_headers"] = [
            {
                "resource_id": "synthetic-fan-header",
                "kind": "fan",
                "accepts": ["fan4"],
                "voltage_mv": 12000,
                "max_current_ma": 1000,
                "excludes": [],
                "group": None,
                "cost": 1,
            }
        ]
        payload["fields"]["fan_headers"] = [ref]
    with pytest.raises(ValueError):
        load_technical_envelope(json.dumps(payload))
