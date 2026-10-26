"""Publication-owned structured facts adapter; no fixtures or dataset fallback.

The importer publishes compact JSON in attributes.basic_stock_v1. Every field
has its own source IDs. Unpublished/missing/conflicting facts remain unknown.
Numbers retain source decimals with units in keys, never parsed display strings.
"""

import json
import math
from dataclasses import dataclass

from .observations import EvidenceRef

# Importer's publication schema is intentionally distinct from domain specs.
IMPORT_KEYS = {
    "socket",
    "cores",
    "threads",
    "tdp_w",
    "ppt_w",
    "memory_types",
    "form_factor",
    "memory_type",
    "dimm_slots",
    "max_memory_gb",
    "module_type",
    "capacity_per_module_gb",
    "modules",
    "voltage_v",
    "ecc",
    "buffering",
    "length_mm",
    "vram_gb",
    "interface",
    "slots",
    "power_connectors",
    "continuous_power_w",
    "psu_connectors",
    "board_formats",
    "psu_formats",
    "gpu_length_limit_mm",
    "cooler_height_limit_mm",
}
NUMERIC_KEYS = {
    "cores",
    "threads",
    "tdp_w",
    "ppt_w",
    "dimm_slots",
    "max_memory_gb",
    "capacity_per_module_gb",
    "modules",
    "voltage_v",
    "length_mm",
    "vram_gb",
    "slots",
    "continuous_power_w",
    "gpu_length_limit_mm",
    "cooler_height_limit_mm",
}
LIST_KEYS = {"memory_types", "board_formats", "psu_formats"}
CONNECTOR_KEYS = {"power_connectors", "psu_connectors"}
DOMAIN_NAMES = {
    "dimm_slots": "slots",
    "max_memory_gb": "max_total_gb",
    "capacity_per_module_gb": "capacity_gb",
    "gpu_length_limit_mm": "gpu_limit_mm",
    "interface": "interface_description",
    "buffering": "buffered",
}


def validate_envelope(raw):
    if not isinstance(raw, str) or len(raw) > 2000:
        raise ValueError("basic_stock_v1 must be JSON text of at most2000 characters")

    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("Duplicate structured fact key")
            result[key] = value
        return result

    data = json.loads(raw, object_pairs_hook=unique_object)
    if not isinstance(data, dict) or set(data) != {
        "version",
        "data",
        "fields",
        "conflicts",
        "import_digest",
    }:
        raise ValueError("Invalid basic stock envelope")
    if type(data["version"]) is not int or data["version"] != 1:
        raise ValueError("Unsupported basic stock facts version")
    fields, refs, conflicts = data["data"], data["fields"], data["conflicts"]
    if not isinstance(fields, dict) or not isinstance(refs, dict):
        raise ValueError("Facts and field sources must be objects")
    if set(fields) - IMPORT_KEYS or set(refs) - fields.keys():
        raise ValueError("Unsupported fact or source key")
    if not isinstance(conflicts, dict) or any(type(k) is not str for k in conflicts):
        raise ValueError("Conflicts must be field names")
    if set(conflicts) - IMPORT_KEYS:
        raise ValueError("Invalid conflict keys")
    digest = data["import_digest"]
    if (
        not isinstance(digest, str)
        or len(digest) != 64
        or any(c not in "0123456789abcdef" for c in digest)
    ):
        raise ValueError("SHA256 import digest required")
    for key, value in fields.items():
        if value is None:
            continue
        if key in NUMERIC_KEYS and (
            type(value) not in (int, float) or not math.isfinite(value) or value < 0
        ):
            raise ValueError("Negative structured count or dimension")
        if key not in NUMERIC_KEYS and type(value) not in (str, list, dict, bool):
            raise ValueError("Incorrect structured fact type")
        if key in LIST_KEYS and type(value) is not list:
            raise ValueError("Structured format/type collections require lists")
        if key in CONNECTOR_KEYS and type(value) is not dict:
            raise ValueError("Structured connectors require count objects")
        if (
            key not in NUMERIC_KEYS | LIST_KEYS | CONNECTOR_KEYS | {"ecc", "buffering"}
            and type(value) is not str
        ):
            raise ValueError("Structured textual fact requires text")
        if key in ("ecc", "buffering") and type(value) not in (str, bool):
            raise ValueError("Structured ECC/buffering must be explicit text or bool")
        if type(value) is str and not value.strip():
            raise ValueError("Empty structured fact")
        if type(value) is list:
            expected = str
            if not value or any(type(item) is not expected for item in value):
                raise ValueError("Invalid structured fact list")
        if type(value) is dict:
            if (
                key not in ("power_connectors", "psu_connectors")
                or any(type(name) is not str for name in value)
                or any(
                    type(count) is not int or count < 0
                    for count in value.values()
                    if count is not None
                )
            ):
                raise ValueError("Invalid structured connector counts")
    for ids in refs.values():
        if (
            not isinstance(ids, list)
            or not ids
            or any(type(i) is not str or not i.strip() for i in ids)
        ):
            raise ValueError("Nonempty per-field source IDs required")
        if len(set(ids)) != len(ids):
            raise ValueError("Duplicate field source IDs")
    for observations in conflicts.values():
        if not isinstance(observations, list) or any(
            not isinstance(item, dict)
            or set(item) != {"value", "source"}
            or type(item["source"]) is not str
            for item in observations
        ):
            raise ValueError("Invalid conflict observations")
    return data


@dataclass(frozen=True)
class BasicSpecs:
    fields: dict
    references: dict
    conflicts: frozenset
    import_digest: str | None = None

    def fact(self, key):
        if key in self.conflicts or not self.references.get(key):
            return None
        return self.fields.get(key)

    def evidence(self, *keys):
        return tuple(
            dict.fromkeys(ref for key in keys for ref in self.references.get(key, ()))
        )


def resolve_basic_specs(component, catalog):
    empty = BasicSpecs({}, {}, frozenset())
    raw = component.attributes.get("basic_stock_v1")
    # PG publication source rows are authoritative, including an empty collection.
    rows = getattr(catalog, "source_rows", None)
    if raw is None or rows is None:
        return empty
    try:
        data = validate_envelope(raw)
        component_sources = {(s.id, s.url) for s in component.sources}
        refs = {}
        for key, ids in data["fields"].items():
            selected = []
            for identity in ids:
                matches = [
                    row
                    for row in rows
                    if row.get("source_id") == identity
                    and (identity, row.get("url")) in component_sources
                ]
                if len(matches) != 1:
                    break
                row = matches[0]
                selected.append(
                    EvidenceRef(
                        source_id=identity,
                        url=row["url"],
                        locator=row["locator"],
                        consulted_on=row["consulted_on"],
                    )
                )
            else:
                refs[DOMAIN_NAMES.get(key, key)] = tuple(selected)
        fields = {
            DOMAIN_NAMES.get(key, key): value for key, value in data["data"].items()
        }
        for key in ("ecc", "buffered"):
            if fields.get(key) in (
                "NO",
                "FALSE",
                "NON-ECC",
                "UNBUFFERED",
                "UNREGISTERED",
            ):
                fields[key] = False
            elif fields.get(key) in ("YES", "TRUE", "ECC", "REGISTERED", "BUFFERED"):
                fields[key] = True
        conflicts = frozenset(DOMAIN_NAMES.get(key, key) for key in data["conflicts"])
        # A CPU array documents types, not a native speed. Do not synthesize JEDEC.
        if component.category == "cpu" and len(fields.get("memory_types") or []) == 1:
            fields["memory_type"] = fields["memory_types"][0]
            refs["memory_type"] = refs.get("memory_types", ())
            if "memory_types" in conflicts:
                conflicts = conflicts | {"memory_type"}
        return BasicSpecs(fields, refs, conflicts, data["import_digest"])
    except (ValueError, TypeError, KeyError):
        return empty
