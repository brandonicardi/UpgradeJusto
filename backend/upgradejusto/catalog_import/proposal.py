"""Pinned observations, exact variant selection and conservative proposal creation."""

import copy
import hashlib
import json
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

TRANSFORM = "basic-stock-import-1"
PINS = {
    "buildcores": ("2403cab88630625912cdd2f152f1bb1e27f8ff4d", "CC-BY-NC-SA-4.0"),
    "docyx": ("c52a04ca9465c83997ed335f7767b09a2005dd26", "MIT"),
}

# Exact SKU selections, not candidate_targets. Regional PSU SKUs are NOT aliases.
SKUS = {
    "P01": "100-100000927BOX",
    "P02": "100-100000926WOF",
    "P03": "B550M Pro4",
    "P04": "KVR32N22S8/8",
    "P05": "KVR32N22D8/16",
    "P06": "DUAL-RTX4060-O8G-EVO",
    "P07": "CP-9020277-NA",
    "P08": "CP-9020295-AR",
    "P09": "FD-C-POA2A-01",
    "P10": "FD-CA-MESH-C-BKO",
    "P15": "PRIME-RTX5070-O12G",
    "P16": "TUF-RTX5070-O12G-GAMING",
    "P17": "B550 Pro4",
    "P18": "B550M Steel Legend",
}
CHIPS = {"P01": "AMD Ryzen 5 5600", "P02": "AMD Ryzen 7 5700X"}
NAMES = {
    "P01": "AMD Ryzen 5 5600 100-100000927BOX",
    "P02": "AMD Ryzen 7 5700X 100-100000926WOF",
    "P03": "ASRock B550M Pro4 original, no Pro SE",
    "P04": "Kingston KVR32N22S8/8",
    "P05": "Kingston KVR32N22D8/16",
    "P06": "ASUS DUAL-RTX4060-O8G-EVO, negra OC",
    "P07": "Corsair CX550 2023 CP-9020277 RPS0127",
    "P08": "Corsair RM750e 2025 CP-9020295-AR RPS0215",
    "P09": "Fractal Pop 2 Air Black Solid FD-C-POA2A-01",
    "P10": "Fractal Meshify C Black Solid FD-CA-MESH-C-BKO",
    "P15": "ASUS PRIME-RTX5070-O12G",
    "P16": "ASUS TUF-RTX5070-O12G-GAMING",
    "P17": "ASRock B550 Pro4",
    "P18": "ASRock B550M Steel Legend original",
}
# Exact known curated values; only used while the corresponding legacy string
# remains unchanged. Free text is never interpreted as manufacturer evidence.
OVERLAP = {
    "socket": ("socket", {"AM4": "AM4"}),
    "cores": ("cores", {"6": 6, "8": 8}),
    "threads": ("threads", {"12": 12, "16": 16}),
    "tdp_w": ("tdp", {"65 W (no equivale a demanda DC)": 65}),
    "form_factor": ("form_factor", {"mATX": "mATX", "mATX 244×244 mm": "mATX"}),
    "memory_type": ("memory_type", {"DDR4": "DDR4", "DDR4-3200": "DDR4"}),
    "dimm_slots": ("dimm_slots", {"4": 4}),
    "max_memory_gb": ("max_memory", {"128 GB": 128}),
    "capacity_per_module_gb": ("capacity_per_module", {"8 GB": 8, "16 GB": 16}),
    "voltage_v": ("voltage", {"1,2 V": 1.2}),
    "length_mm": (
        "length",
        {"227,2 mm": 227.2, "125 mm": 125, "304 mm": 304, "329 mm": 329},
    ),
    "vram_gb": ("vram", {"8 GB": 8, "12 GB": 12}),
    "slots": ("slots", {"2,5": 2.5, "3,125": 3.125, "7": 7}),
    "continuous_power_w": ("continuous_power", {"550 W": 550, "750 W": 750}),
    "gpu_length_limit_mm": (
        "gpu_length_limit",
        {"416 mm": 416, "315 mm con ventiladores delanteros": 315},
    ),
    "cooler_height_limit_mm": ("cooler_height_limit", {"170 mm": 170}),
}

# Canonical key -> upstream path. Units are explicit in canonical field names.
BC = {
    "cpu": {
        "socket": "socket",
        "cores": "cores.total",
        "threads": "cores.threads",
        "tdp_w": "specifications.tdp",
        "ppt_w": "specifications.ppt",
        "memory_types": "specifications.memory.types",
    },
    "motherboard": {
        "socket": "socket",
        "form_factor": "form_factor",
        "memory_type": "memory.ram_type",
        "dimm_slots": "memory.slots",
        "max_memory_gb": "memory.max",
    },
    "ram": {
        "memory_type": "ram_type",
        "module_type": "form_factor",
        "capacity_per_module_gb": "modules.capacity_gb",
        "modules": "modules.quantity",
        "voltage_v": "voltage",
        "ecc": "ecc",
        "buffering": "registered",
    },
    "gpu": {
        "length_mm": "length",
        "vram_gb": "memory",
        "interface": "interface",
        "tdp_w": "tdp",
        "slots": "total_slot_width",
        "power_connectors": "power_connectors",
    },
    "psu": {
        "continuous_power_w": "wattage",
        "length_mm": "length",
        "form_factor": "form_factor",
        "psu_connectors": "connectors",
    },
    "case": {
        "board_formats": "supported_motherboard_form_factors",
        "psu_formats": "supported_power_supply_form_factors",
        "gpu_length_limit_mm": "max_video_card_length",
        "cooler_height_limit_mm": "max_cpu_cooler_height",
        "slots": "expansion_slots",
    },
}
DY = {
    "cpu": {"cores": "core_count", "tdp_w": "tdp"},
    "motherboard": {
        "socket": "socket",
        "form_factor": "form_factor",
        "max_memory_gb": "max_memory",
        "dimm_slots": "memory_slots",
    },
}
NUMERIC = {
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
FORMATS = {
    "MICRO ATX": "mATX",
    "MICROATX": "mATX",
    "MATX": "mATX",
    "MINI-ITX": "ITX",
    "ITX": "ITX",
    "ATX": "ATX",
}


def canonical(value):
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )


def digest(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def normalize(key, value):
    if value is None:
        return None
    if key in {"power_connectors", "psu_connectors"}:
        allowed = (
            {"pcie_6_pin", "pcie_8_pin", "pcie_12VHPWR", "pcie_12V_2x6"}
            if key == "power_connectors"
            else {
                "atx_24_pin",
                "eps_8_pin",
                "pcie_12vhpwr",
                "pcie_6_plus_2_pin",
                "sata",
                "molex_4_pin",
                "floppy_4_pin",
            }
        )
        if not isinstance(value, dict):
            raise ValueError("Invalid connector counts")
        return {name: normalize("modules", value.get(name)) for name in sorted(allowed)}
    if key in NUMERIC:
        if isinstance(value, bool):
            raise ValueError("Boolean is not a numeric observation")
        try:
            number = Decimal(str(value))
        except InvalidOperation:
            raise ValueError("Invalid numeric observation") from None
        if not number.is_finite() or number < 0:
            raise ValueError("Invalid numeric observation")
        return int(number) if number == number.to_integral() else float(number)
    if isinstance(value, list):
        return sorted({normalize(key, item) for item in value}) if value else None
    if not isinstance(value, str):
        raise ValueError("Invalid textual observation")
    text = " ".join(value.split())
    if not text:
        return None
    if key in {"form_factor", "board_formats", "psu_formats"}:
        return FORMATS.get(text.upper(), text.upper())
    if key == "interface":
        return text.upper().replace("PCIE", "PCIe")
    return text.upper()


def _get(record, path):
    value = record
    for segment in path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(segment)
    return value


def _source(entry, source):
    source_id = (
        "hw-"
        + digest(
            [
                entry["source"],
                source["revision"],
                entry["path"],
                entry["index"],
                entry["record_sha256"],
            ]
        )[:16]
    )
    repository = source["repository"].removeprefix("https://github.com/")
    url = f"https://raw.githubusercontent.com/{repository}/{source['revision']}/{entry['path']}"
    locator = canonical(
        {
            "revision": source["revision"],
            "sha256": entry["record_sha256"],
            "license": source["license"],
            "license_sha256": source["license_sha256"],
            "index": entry["index"],
            "schema": entry["path"].split("/")[-2],
            "upstream_updated_on": source["upstream_updated_on"],
            "transform": TRANSFORM,
            "changes": "normalized units; no prices/BIOS",
        }
    )
    return {
        "source_id": source_id,
        "url": url,
        "consulted_on": source["retrieved_on"],
        "locator": locator,
    }


@dataclass(frozen=True)
class ImportProposal:
    import_digest: str
    components: dict
    sources: tuple
    report: dict

    def as_dict(self):
        return {
            "import_digest": self.import_digest,
            "components": self.components,
            "sources": list(self.sources),
            "report": self.report,
        }


def _legacy_references(component, imported_urls):
    """Separate original curation from our reserved, checksum-derived namespace.

    Verify the full pinned identity before excluding an imported reference. An
    edited/foreign hw- reference must not silently become legacy evidence. Sorting
    and deduplication match publication's source ordering, including multi-URL IDs.
    """
    legacy = {}
    for reference in component["sources"]:
        identity, url = reference["id"], reference["url"]
        if identity.startswith("hw-"):
            if imported_urls.get(identity) != url:
                raise ValueError(
                    "Imported source identity changed; explicit recuration required"
                )
            continue
        legacy[(identity, url)] = reference
    return [legacy[key] for key in sorted(legacy)]


def build_proposal(sample, components, *, expected_sample_sha256=None):
    """components: trusted active CU10 {row_id: ComponentData}; never identity input.

    Caller may pin canonical acquisition-envelope checksum in addition to record
    hashes. Raw file byte checksum is verified by the CLI before JSON parsing.
    """
    if expected_sample_sha256 is not None and digest(sample) != expected_sample_sha256:
        raise ValueError("Acquisition checksum mismatch")
    if sample.get("format_version") != "hardware-sample-1":
        raise ValueError("Unsupported sample format")
    for name, (revision, license_name) in PINS.items():
        source = sample["sources"][name]
        expected_repo = (
            "buildcores/buildcores-open-db"
            if name == "buildcores"
            else "docyx/pc-part-dataset"
        )
        if (
            source["revision"] != revision
            or source["license"] != license_name
            or source["repository"] != "https://github.com/" + expected_repo
            or source["retrieved_on"] != "2026-10-25"
        ):
            raise ValueError("Source pin/license/date mismatch")
    entries = {}
    duplicates = []
    for entry in sample["records"]:
        if (
            entry["source"] not in PINS
            or digest(entry["record"]) != entry["record_sha256"]
        ):
            raise ValueError("Record acquisition checksum mismatch")
        if ".." in entry["path"].split("/") or not entry["path"].endswith(".json"):
            raise ValueError("Invalid upstream path")
        key = canonical([entry["source"], entry["path"], entry["index"]])
        if key in entries:
            if entries[key]["record_sha256"] != entry["record_sha256"]:
                raise ValueError("Conflicting duplicate acquisition locator")
            duplicates.append(key)
        entries[key] = entry
    ordered = [entries[key] for key in sorted(entries)]
    imported_urls = {}
    for entry in ordered:
        source = _source(entry, sample["sources"][entry["source"]])
        identity, url = source["source_id"], source["url"]
        if identity in imported_urls and imported_urls[identity] != url:
            raise ValueError("Imported source identity collision")
        imported_urls[identity] = url
    output, sources, report = (
        {},
        {},
        {"duplicates": sorted(set(duplicates)), "targets": {}},
    )
    for target, sku in SKUS.items():
        component = components.get(target)
        if component is None:
            report["targets"][target] = {"status": "missing_active_component"}
            continue
        category = component["category"]
        if component["name"] != NAMES[target]:
            report["targets"][target] = {"status": "active_identity_changed"}
            continue
        legacy_references = _legacy_references(component, imported_urls)
        accepted = []
        quarantine = []
        for entry in ordered:
            record = entry["record"]
            exact = False
            if entry["source"] == "buildcores":
                exact = sku in record.get("metadata", {}).get("part_numbers", [])
                # Ensure a shared/malformed MPN does not bridge variants/categories.
                folder = {
                    "cpu": "CPU",
                    "motherboard": "Motherboard",
                    "ram": "RAM",
                    "gpu": "GPU",
                    "psu": "PSU",
                    "case": "PCCase",
                }[category]
                exact = exact and entry["path"].startswith("open-db/" + folder + "/")
            elif target in CHIPS:
                # Only chip-level fields; cooler/packaging are deliberately excluded.
                exact = (
                    record.get("name") == CHIPS[target]
                    and entry["path"] == "data/json/cpu.json"
                )
                exact = (
                    exact
                    and sum(
                        e["source"] == "docyx"
                        and e["record"].get("name") == CHIPS[target]
                        for e in ordered
                    )
                    == 1
                )
            elif category == "motherboard":
                model = {
                    "P03": "ASRock B550M Pro4",
                    "P17": "ASRock B550 Pro4",
                    "P18": "ASRock B550M Steel Legend",
                }.get(target)
                exact = (
                    record.get("name") == model
                    and entry["path"] == "data/json/motherboard.json"
                )
            if exact:
                accepted.append(entry)
            elif target in entry.get("candidate_targets", []):
                quarantine.append([entry["source"], entry["path"], entry["index"]])
        # No SKU evidence means model-only docyx observations cannot establish the part.
        if not any(e["source"] == "buildcores" for e in accepted):
            accepted = []
        observations = {}
        refs = []
        for entry in accepted:
            source = _source(entry, sample["sources"][entry["source"]])
            sid = source["source_id"]
            sources[sid] = source
            refs.append({"id": sid, "url": source["url"]})
            mapping = BC[category] if entry["source"] == "buildcores" else DY[category]
            for field, path in mapping.items():
                value = normalize(field, _get(entry["record"], path))
                observations.setdefault(field, []).append(
                    {"value": value, "source": sid}
                )
        data, fields, conflicts = {}, {}, {}
        for field, values in sorted(observations.items()):
            if field in OVERLAP:
                legacy_key, known_legacy = OVERLAP[field]
                legacy = component["attributes"].get(legacy_key)
                if legacy in known_legacy:
                    if any(
                        v["value"] is not None and v["value"] != known_legacy[legacy]
                        for v in values
                    ):
                        if not legacy_references:
                            raise ValueError(
                                "Legacy conflict requires non-imported provenance"
                            )
                        values = values + [
                            {"value": known_legacy[legacy], "source": r["id"]}
                            for r in legacy_references
                        ]
                elif legacy is not None:
                    # Cannot certify agreement with an edited/unparsed legacy value.
                    if not legacy_references:
                        raise ValueError(
                            "Legacy conflict requires non-imported provenance"
                        )
                    conflicts[field] = values + [
                        {"value": legacy, "source": r["id"]} for r in legacy_references
                    ]
                    data[field] = None
                    fields[field] = sorted({v["source"] for v in values})
                    continue
            known = {
                canonical(v["value"]): v["value"]
                for v in values
                if v["value"] is not None
            }
            data[field] = next(iter(known.values())) if len(known) == 1 else None
            fields[field] = sorted({v["source"] for v in values})
            if len(known) > 1:
                conflicts[field] = sorted(values, key=canonical)
        if not accepted:
            report["targets"][target] = {
                "status": "identity_unresolved",
                "quarantine": quarantine,
            }
            continue
        item_digest = digest(
            {
                "pins": sample["sources"],
                "transform": TRANSFORM,
                "records": sorted(accepted, key=canonical),
                "target": target,
                "data": data,
                "conflicts": conflicts,
            }
        )
        metadata = canonical(
            {
                "version": 1,
                "data": data,
                "fields": fields,
                "conflicts": conflicts,
                "import_digest": item_digest,
            }
        )
        if len(metadata) > 2000:
            raise ValueError(f"Metadata exceeds CU10 limit: {target}")
        updated = copy.deepcopy(component)
        updated["attributes"]["basic_stock_v1"] = metadata
        combined = {(r["id"], r["url"]): r for r in component["sources"] + refs}
        updated["sources"] = [combined[key] for key in sorted(combined)]
        output[target] = updated
        report["targets"][target] = {
            "status": "proposed",
            "quarantine": quarantine,
            "missing_fields": sorted(k for k, v in data.items() if v is None),
            "conflicts": conflicts,
            "source_ids": sorted(r["id"] for r in refs),
        }
    proposal_digest = digest(
        {"transform": TRANSFORM, "components": output, "sources": sources}
    )
    return ImportProposal(
        proposal_digest, output, tuple(sources[k] for k in sorted(sources)), report
    )
