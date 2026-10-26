"""Bounded JSON loader, no HTTP/DB/LLM, no technical facts synthesized."""

import json
import re

from upgradejusto.retail.technical_models import (
    ConflictObservation,
    NominalResource,
    SharedLimit,
    SourceRef,
    TechnicalEnvelope,
    TechnicalIdentity,
)

MAX_BYTES = 24000
MAX_REFERENCES = 500
FORMS = {"2.5-inch", "3.5-inch", "2242", "2260", "2280", "22110"}
INTERFACES = {"SATA", "M2-NVMe", "M2-SATA"}
PCIE_FORMS = {"x1", "x4", "x8", "x16"}
CONNECTORS = {"3pin", "4pin"}
COOLER = {
    "cooler_sockets": "texts",
    "cooler_type": {"air", "liquid", "passive"},
    "cooler_height_mm": "positive",
    "fan_count": "count",
    "fan_voltage_mv": "positive",
    "fan_current_ma": "positive",
    "fan_connector": CONNECTORS,
    "thermal_compound_required_on_remount": "bool",
    "thermal_compound_included": "bool",
}
SCHEMA = {
    "motherboard": {
        "tower_ports": "resources",
        "fan_headers": "resources",
        "shared_limits": "limits",
        "fan_total_current_ma": "count",
    },
    "case": {
        "storage_bays": "resources",
        "cooler_height_limit_mm": "positive",
        "fan_positions": "count",
        "fan_supported_sizes_mm": "positives",
    },
    "storage": {
        "storage_interface": INTERFACES,
        "storage_form": FORMS,
        "sata_power_count": "count",
    },
    "cooler": COOLER,
    "fan": {
        "fan_size_mm": "positive",
        "fan_voltage_mv": "positive",
        "fan_current_ma": "positive",
        "fan_connector": CONNECTORS,
    },
    "gpu": {"tower_port_kind": {"PCIe"}, "tower_port_form": PCIE_FORMS},
    "psu": {"sata_power_count": "count"},
    "cpu": {"stock_cooler_included": "bool", **COOLER},
}


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate technical JSON key")
        result[key] = value
    return result


def invalid_constant(value):
    raise ValueError("Nonfinite JSON number")


def text(value):
    if (
        type(value) is not str
        or not 1 <= len(value) <= 100
        or not value.strip()
        or any(ord(c) < 32 for c in value)
    ):
        raise ValueError("Invalid technical text")
    return value


def distinct(values):
    if len(set(values)) != len(values):
        raise ValueError("Duplicate technical item")


def reference_list(value):
    if type(value) is not list or not 1 <= len(value) <= 30:
        raise ValueError("Bounded references required")
    refs = tuple(SourceRef.model_validate(item) for item in value)
    distinct(tuple(ref.model_dump_json() for ref in refs))
    return refs


def parse_value(key, value, schema):
    kind = schema[key]
    if isinstance(kind, set):
        if type(value) is not str or value not in kind:
            raise ValueError("Unsupported nominal token")
    elif kind in {"positive", "count"}:
        lower, upper = (1, 1000000000) if kind == "positive" else (0, 1000000)
        if type(value) is not int or not lower <= value <= upper:
            raise ValueError("Strict bounded integer required")
    elif kind == "bool":
        if type(value) is not bool:
            raise ValueError("Strict boolean required")
    else:
        if type(value) is not list or len(value) > 64:
            raise ValueError("Bounded technical array required")
        if kind in {"texts", "positives"}:
            if not value:
                raise ValueError("Empty supported-value array")
            for item in value:
                if kind == "texts":
                    text(item)
                elif type(item) is not int or not 1 <= item <= 1000000000:
                    raise ValueError("Positive integer array required")
            distinct(value)
        elif kind == "limits":
            value = [SharedLimit.model_validate(item) for item in value]
            distinct([text(item.group) for item in value])
        else:
            value = [NominalResource.model_validate(item) for item in value]
            distinct([text(item.resource_id) for item in value])
            ids = {item.resource_id for item in value}
            for item in value:
                distinct(item.accepts)
                distinct(item.excludes)
                for token in (*item.accepts, *item.excludes):
                    text(token)
                if item.group is not None:
                    text(item.group)
                if item.resource_id in item.excludes or set(item.excludes) - ids:
                    raise ValueError("Unbound resource exclusion")
                if key == "fan_headers":
                    allowed, expected = CONNECTORS, {"fan"}
                elif key == "storage_bays":
                    allowed, expected = FORMS, {"storage-bay"}
                else:
                    expected = INTERFACES | {"PCIe"}
                    allowed = PCIE_FORMS if item.kind == "PCIe" else FORMS
                if item.kind not in expected or set(item.accepts) - allowed:
                    raise ValueError("Invalid nominal resource vocabulary")
                if key != "fan_headers" and (
                    item.voltage_mv is not None or item.max_current_ma is not None
                ):
                    raise ValueError("Electrical values only on fan headers")
    return value


def load_technical_envelope(raw: str) -> TechnicalEnvelope:
    if type(raw) is not str or len(raw.encode("utf-8")) > MAX_BYTES:
        raise ValueError("Bounded tower_stock_v1 JSON text required")
    try:
        payload = json.loads(
            raw, object_pairs_hook=unique_object, parse_constant=invalid_constant
        )
    except (RecursionError, json.JSONDecodeError):
        raise ValueError("Invalid technical JSON") from None
    if type(payload) is not dict or set(payload) != {
        "version",
        "identity",
        "data",
        "fields",
        "conflicts",
        "import_digest",
    }:
        raise ValueError("Closed technical envelope required")
    if type(payload["version"]) is not int or payload["version"] != 1:
        raise ValueError("Unsupported technical version")
    identity = TechnicalIdentity.model_validate(payload["identity"])
    if identity.name != identity.name.strip() or identity.category not in SCHEMA:
        raise ValueError("Canonical technical identity required")
    schema = SCHEMA[identity.category]
    data, fields, conflicts = (payload[k] for k in ("data", "fields", "conflicts"))
    if any(type(v) is not dict for v in (data, fields, conflicts)):
        raise ValueError("Technical objects required")
    if (
        set(data) - schema.keys()
        or set(conflicts) - schema.keys()
        or set(fields) != set(data)
        or set(conflicts) & set(data)
    ):
        raise ValueError("Unbound or conflicting technical fields")
    digest = payload["import_digest"]
    if type(digest) is not str or not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise ValueError("Technical SHA256 required")
    parsed_data = {k: parse_value(k, v, schema) for k, v in data.items()}
    parsed_fields = {k: reference_list(v) for k, v in fields.items()}
    parsed_conflicts = {}
    for key, observations in conflicts.items():
        if type(observations) is not list or not 2 <= len(observations) <= 8:
            raise ValueError("Conflicting observations required")
        parsed = []
        for observation in observations:
            if type(observation) is not dict or set(observation) != {
                "value",
                "source_refs",
            }:
                raise ValueError("Closed conflict required")
            parsed.append(
                ConflictObservation(
                    parse_value(key, observation["value"], schema),
                    reference_list(observation["source_refs"]),
                )
            )
        if all(item.value == parsed[0].value for item in parsed):
            raise ValueError("Conflict requires different values")
        parsed_conflicts[key] = tuple(parsed)
    envelope = TechnicalEnvelope(
        1, identity, parsed_data, parsed_fields, parsed_conflicts, digest
    )
    if len(envelope.references()) > MAX_REFERENCES:
        raise ValueError("Too many technical references")
    distinct([ref.model_dump_json() for ref in identity.source_refs])
    resources = [
        item
        for k, values in parsed_data.items()
        if schema[k] == "resources"
        for item in values
    ]
    distinct([item.resource_id for item in resources])
    groups = {item.group for item in parsed_data.get("shared_limits", [])}
    for observation in parsed_conflicts.get("shared_limits", ()):
        groups.update(item.group for item in observation.value)
    if any(item.group is not None and item.group not in groups for item in resources):
        raise ValueError("Unbound nominal group")
    for key, observations in parsed_conflicts.items():
        if schema[key] == "resources" and any(
            item.group is not None and item.group not in groups
            for observation in observations
            for item in observation.value
        ):
            raise ValueError("Unbound conflicting nominal group")
    if (
        identity.category == "cpu"
        and any(k in parsed_data or k in parsed_conflicts for k in COOLER)
        and parsed_data.get("stock_cooler_included") is not True
    ):
        raise ValueError("Bundled cooler details require documented inclusion")
    return envelope
