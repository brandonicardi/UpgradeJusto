"""Versioned, closed normalization of identified evidence; never parse free text.

The published snapshot is authoritative. Any identity/attribute/source change
invalidates this extract until recuration; price-only edits do not invalidate it.
No PC/base IDs and no installed context are encoded here.
"""

from upgradejusto.catalog.dataset import COMPONENTS

from .models import EvidenceRef, MountingInput, MountingSpec, RamInput, RamSpec

EXTRACT_VERSION = "platform-evidence-25.1"
_BASELINE = {component.id: component for component in COMPONENTS}
_RAM = {
    "P01": {"generation": "DDR4"},
    "P02": {"generation": "DDR4"},
    "P03": {"generation": "DDR4", "slots": 4, "max_total_gb": 128},
    "P18": {"generation": "DDR4", "slots": 4, "max_total_gb": 128},
    "P04": {
        "generation": "DDR4",
        "module_type": "UDIMM",
        "ecc": False,
        "buffered": False,
        "capacity_gb": 8,
        "jedec_mts": 3200,
        "voltage_mv": 1200,
        "rank": "1Rx8",
    },
    "P05": {
        "generation": "DDR4",
        "module_type": "UDIMM",
        "ecc": False,
        "buffered": False,
        "capacity_gb": 16,
        "jedec_mts": 3200,
        "voltage_mv": 1200,
        "rank": "2Rx8",
    },
}
_MOUNTING = {
    "P03": {"form_factor": "mATX"},
    "P18": {"form_factor": "mATX"},
    "P07": {"form_factor": "ATX", "length_mm": 125},
    "P08": {"form_factor": "ATX", "length_mm": 140},
    "P09": {
        "board_formats": ("ATX", "mATX", "ITX"),
        "psu_formats": ("ATX",),
        "nominal_psu_limit_mm": 180,
    },
    "P10": {
        "board_formats": ("ATX", "mATX", "ITX"),
        "psu_formats": ("ATX",),
        "nominal_psu_limit_mm": 175,
    },
}


def references(component, catalog=None):
    """Only return references when the complete technical envelope still matches."""
    baseline = _BASELINE.get(component.id)
    if (
        baseline is None
        or component.name != baseline.name
        or component.category != baseline.category
        or component.attributes != baseline.attributes
        or sorted((s.id, s.url) for s in component.sources)
        != sorted((s.id, s.url) for s in baseline.sources)
    ):
        return ()
    source_rows = getattr(catalog, "source_rows", None)
    if source_rows is not None:
        for source in baseline.sources:
            rows = [
                row
                for row in source_rows
                if (row.get("source_id"), row.get("url")) == (source.id, source.url)
            ]
            if len(rows) != 1 or rows[0] != {
                "source_id": source.id,
                "url": source.url,
                "consulted_on": "2026-10-20",
                "locator": "Catálogo curado sprint31b-a-v1; referencia conservada",
            }:
                return ()
    return tuple(
        EvidenceRef(
            source_id=source.id,
            url=source.url,
            locator="HARDWARE_DEMO §3; exact specifications; " + EXTRACT_VERSION,
            consulted_on="2026-10-20",
        )
        for source in baseline.sources
    )


def ram_spec(part, catalog):
    component = catalog[part.part_id]
    refs = references(component, catalog)
    values = _RAM.get(part.part_id)
    if not refs or values is None:
        return RamSpec(instance_id=part.instance_id, status="unknown")
    return RamSpec(instance_id=part.instance_id, evidence=refs, **values)


def resolve_platform(parts, catalog):
    def one(category, constructor, registry):
        selected = [part for part in parts if part.category == category]
        if len(selected) != 1:
            return None
        part = selected[0]
        refs = references(catalog[part.part_id], catalog)
        values = registry.get(part.part_id)
        if not refs or values is None:
            return constructor(instance_id=part.instance_id, status="unknown")
        return constructor(instance_id=part.instance_id, evidence=refs, **values)

    return (
        RamInput(
            cpu=one("cpu", RamSpec, _RAM),
            motherboard=one("motherboard", RamSpec, _RAM),
            modules=tuple(
                ram_spec(part, catalog) for part in parts if part.category == "ram"
            ),
        ),
        MountingInput(
            motherboard=one("motherboard", MountingSpec, _MOUNTING),
            psu=one("psu", MountingSpec, _MOUNTING),
            case=one("case", MountingSpec, _MOUNTING),
        ),
    )
