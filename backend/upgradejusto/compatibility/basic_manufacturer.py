"""Versioned exact-model manufacturer supplement to published structured samples.

No approval by component or PC ID. A published part must retain the complete
technical envelope and original manufacturer references. Added import provenance
does not invalidate independent manufacturer evidence; edits to it do.
"""

from upgradejusto.catalog.dataset import COMPONENTS

from .basic_specs import BasicSpecs, resolve_basic_specs
from .observations import EvidenceRef

MANUFACTURER_VERSION = "basic-manufacturer-evidence-1"
SUPPLEMENTAL_SOURCES = (
    {
        "source_id": "BASIC-PCIE-1",
        "url": "https://www.corsair.com/us/en/explorer/gamer/gaming-pcs/does-a-pcie-50-gpu-work-in-a-pcie-40-motherboard/",
        "consulted_on": "2026-10-25",
        "locator": "PCIe backwards compatibility; physical slot preserved; basic stock applicability, not bandwidth guarantee",
    },
    {
        "source_id": "BASIC-NVIDIA4060-1",
        "url": "https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/",
        "consulted_on": "2026-10-25",
        "locator": "Full Specs550W; note8 reference Ryzen9 5900X; CPU TDP class documented separately by AMD, not NVIDIA",
    },
    {
        "source_id": "BASIC-NVIDIA5070-1",
        "url": "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070-family/",
        "consulted_on": "2026-10-25",
        "locator": "Full Specs650W; note5 reference Ryzen9 9950X; PCIe CEM5.1 recommendation; CPU TDP class documented separately by AMD, not NVIDIA",
    },
    {
        "source_id": "BASIC-AMD-5900X-REF-1",
        "url": "https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-9-5900x.html",
        "consulted_on": "2026-10-25",
        "locator": "General Specifications Default TDP105W/socket AM4; lectura índice oficial comunicada por investigación25/10, GET directo timeout; clase NO máximo DC",
    },
    {
        "source_id": "BASIC-AMD-9950X-REF-1",
        "url": "https://ir.amd.com/news-events/press-releases/detail/1202/amd-unveils-next-gen-zen-5-ryzen-processors-to-power-advanced-ai-experiences",
        "consulted_on": "2026-10-25",
        "locator": "Tabla Ryzen9 9950X TDP170W; lectura índice oficial comunicada por investigación25/10, GET specs directo timeout; clase NO máximo DC",
    },
    {
        "source_id": "BASIC-AMD-STOCK-1",
        "url": "https://ir.amd.com/news-events/press-releases/detail/1053/amd-launches-the-ultimate-gaming-processor-brings-enthusiast-performance-to-an-expanded-lineup-of-ryzen-desktop-processors",
        "consulted_on": "2026-10-25",
        "locator": "Ryzen5600/5700X65W class;5600 boxed Wraith Stealth,5700X no included cooler; no installation or thermal certification",
    },
)
_ENVELOPES = {(part.category, part.name): part for part in COMPONENTS}
# HARDWARE_DEMO §2–§3 F01–F16/F22. No installed-slot, cooler or cable observations.
_FACTS = {
    "AMD Ryzen 5 5600 100-100000927BOX": {
        "memory_type": "DDR4",
        "jedec_mts": [3200],
        "cpu_platform": "AM4",
        "cpu_tdp_class_w": 65,
        "cpu_stock_family": "Ryzen5000",
    },
    "AMD Ryzen 7 5700X 100-100000926WOF": {
        "memory_type": "DDR4",
        "jedec_mts": [3200],
        "cpu_platform": "AM4",
        "cpu_tdp_class_w": 65,
        "cpu_stock_family": "Ryzen5000",
    },
    "ASRock B550M Pro4 original, no Pro SE": {
        "memory_type": "DDR4",
        "module_type": "UDIMM",
        "slots": 4,
        "max_total_gb": 128,
        "jedec_mts": [3200],
        "ecc": False,
        "buffered": False,
        "form_factor": "mATX",
        "pcie_slot": "PCIe x16",
        "atx24_count": 1,
        "eps8_count": 1,
    },
    "ASRock B550M Steel Legend original": {
        "memory_type": "DDR4",
        "module_type": "UDIMM",
        "slots": 4,
        "max_total_gb": 128,
        "jedec_mts": [3200],
        "ecc": False,
        "buffered": False,
        "form_factor": "mATX",
        "pcie_slot": "PCIe x16",
        "atx24_count": 1,
        "eps8_count": 1,
    },
    "Kingston KVR32N22S8/8": {
        "memory_type": "DDR4",
        "module_type": "UDIMM",
        "capacity_gb": 8,
        "jedec_mts": [3200],
        "ecc": False,
        "buffered": False,
    },
    "Kingston KVR32N22D8/16": {
        "memory_type": "DDR4",
        "module_type": "UDIMM",
        "capacity_gb": 16,
        "jedec_mts": [3200],
        "ecc": False,
        "buffered": False,
    },
    "ASUS DUAL-RTX4060-O8G-EVO, negra OC": {
        "length_mm": 227.2,
        "vram_gb": 8,
        "pcie_interface": "PCIe x16",
        "recommended_psu_w": 550,
        "gpu_power_kind": "PCIe8",
        "gpu_power_count": 1,
    },
    "ASUS PRIME-RTX5070-O12G": {
        "length_mm": 304,
        "vram_gb": 12,
        "pcie_interface": "PCIe x16",
        "recommended_psu_w": 750,
        "gpu_power_kind": "16pin",
        "gpu_power_count": 1,
        "adapter_pcie8_inputs": 2,
    },
    "ASUS TUF-RTX5070-O12G-GAMING": {"length_mm": 329},
    "Corsair CX550 2023 CP-9020277 RPS0127": {
        "continuous_power_w": 550,
        "length_mm": 125,
        "form_factor": "ATX",
        "atx24_count": 1,
        "eps8_count": 1,
        "pcie8_count": 2,
        "pcie8_independent_branches": 1,
        "native16_count": 0,
        "nominal_temperature_note": "CX550: rating nominal fabricante30°C; temperatura real no medida ni certificada.",
    },
    "Corsair RM750e 2025 CP-9020295-AR RPS0215": {
        "continuous_power_w": 750,
        "length_mm": 140,
        "form_factor": "ATX",
        "atx24_count": 1,
        "eps8_count": 2,
        "native16_count": 1,
        "pcie8_count": 1,
        "rail12v_conflict": True,
    },
    "Fractal Pop 2 Air Black Solid FD-C-POA2A-01": {
        "board_formats": ["ATX", "mATX", "ITX"],
        "psu_formats": ["ATX"],
        "gpu_limit_mm": 416,
        "psu_limit_mm": 180,
    },
    "Fractal Meshify C Black Solid FD-CA-MESH-C-BKO": {
        "board_formats": ["ATX", "mATX", "ITX"],
        "psu_formats": ["ATX"],
        "gpu_limit_mm": 315,
        "psu_limit_mm": 175,
    },
}


def manufacturer_specs(component, catalog):
    baseline = _ENVELOPES.get((component.category, component.name))
    published_rows = getattr(catalog, "source_rows", None)
    if baseline is None or published_rows is None:
        return BasicSpecs({}, {}, frozenset())
    attrs = {
        key: value
        for key, value in component.attributes.items()
        if key != "basic_stock_v1"
    }
    if attrs != baseline.attributes:
        return BasicSpecs({}, {}, frozenset())
    actual_sources = {(source.id, source.url) for source in component.sources}
    refs = []
    for source in baseline.sources:
        if (source.id, source.url) not in actual_sources:
            return BasicSpecs({}, {}, frozenset())
        matches = [
            row
            for row in published_rows
            if (row.get("source_id"), row.get("url")) == (source.id, source.url)
        ]
        if len(matches) != 1 or matches[0] != {
            "source_id": source.id,
            "url": source.url,
            "consulted_on": "2026-10-20",
            "locator": "Catálogo curado sprint31b-a-v1; referencia conservada",
        }:
            return BasicSpecs({}, {}, frozenset())
        refs.append(
            EvidenceRef(
                source_id=source.id,
                url=source.url,
                consulted_on="2026-10-20",
                locator="HARDWARE_DEMO §2–§3; " + MANUFACTURER_VERSION,
            )
        )
    fields = _FACTS.get(component.name, {})
    return BasicSpecs(fields, {key: tuple(refs) for key in fields}, frozenset())


def resolve_stock_specs(component, catalog):
    imported = resolve_basic_specs(component, catalog)
    manufacturer = manufacturer_specs(component, catalog)
    fields, refs = dict(imported.fields), dict(imported.references)
    conflicts = set(imported.conflicts)
    for key, value in manufacturer.fields.items():
        prior = imported.fact(key)
        # Mechanical DIMM descriptors do not assert registered/unbuffered type.
        # Refine only with independently valid exact-part DDR4/unbuffered proof;
        # never rewrite the publication or clear an actual source conflict.
        if (
            key == "module_type"
            and prior in ("DIMM", "288-PIN DIMM")
            and value == "UDIMM"
            and component.category == "ram"
            and manufacturer.fact("memory_type") == "DDR4"
            and manufacturer.fact("buffered") is False
            and manufacturer.evidence("module_type", "buffered", "memory_type")
            and imported.fact("buffered") in (None, False)
            and imported.fact("memory_type") in (None, "DDR4")
            and not {"module_type", "buffered", "memory_type"} & imported.conflicts
        ):
            fields["module_type_description"] = prior
            refs["module_type_description"] = imported.evidence("module_type")
            prior = value
        if key in ("board_formats", "psu_formats") and isinstance(prior, list):
            prior = sorted(prior)
            comparable = sorted(value)
        else:
            comparable = value
        if prior is not None and prior != comparable:
            conflicts.add(key)
        fields[key] = value if prior is None or prior == comparable else prior
        refs[key] = tuple(
            dict.fromkeys((*refs.get(key, ()), *manufacturer.evidence(key)))
        )
    supplement = publication_policy_specs(component, catalog, manufacturer)
    fields.update(supplement.fields)
    refs.update(supplement.references)
    return BasicSpecs(fields, refs, frozenset(conflicts), imported.import_digest)


def publication_policy_specs(component, catalog, manufacturer):
    """Sources must actually be published; constants alone grant no evidence."""
    rows = getattr(catalog, "source_rows", None) or []
    published = {}
    for source in SUPPLEMENTAL_SOURCES:
        matches = [row for row in rows if row.get("source_id") == source["source_id"]]
        if matches == [source]:
            published[source["source_id"]] = EvidenceRef(**source)
    fields, refs = {}, {}
    cooling = {
        "AMD Ryzen 5 5600 100-100000927BOX": "5600 BOX incluye Wraith Stealth; no se afirma cooler seleccionado/instalado ni certificación térmica.",
        "AMD Ryzen 7 5700X 100-100000926WOF": "5700X requiere cooler no incluido; soporte stock/montaje adicional no certificado. No se presume Noctua seleccionado ni instalado.",
    }.get(component.name)
    if (
        cooling
        and manufacturer.fact("cpu_tdp_class_w") is not None
        and "BASIC-AMD-STOCK-1" in published
    ):
        fields["stock_cooling_note"] = cooling
        refs["stock_cooling_note"] = (published["BASIC-AMD-STOCK-1"],)
    if manufacturer.fact("pcie_interface") is not None and "BASIC-PCIE-1" in published:
        fields["pcie_backward_compatible"] = True
        refs["pcie_backward_compatible"] = (published["BASIC-PCIE-1"],)
    reference = {
        "ASUS DUAL-RTX4060-O8G-EVO, negra OC": (
            "BASIC-NVIDIA4060-1",
            550,
            105,
            "AMD Ryzen9 5900X",
            "AM4",
        ),
        "ASUS PRIME-RTX5070-O12G": (
            "BASIC-NVIDIA5070-1",
            650,
            170,
            "AMD Ryzen9 9950X",
            "AM5",
        ),
    }.get(component.name)
    if reference and manufacturer.fact("recommended_psu_w") is not None:
        identity, watts, cpu_class, system, platform = reference
        if identity in published:
            fields.update(
                {
                    "nvidia_recommended_psu_w": watts,
                    "psu_reference_platform": platform,
                    "psu_reference_system": system,
                    "psu_recommendation_basis": "manufacturer_whole_system_minimum",
                }
            )
            combined = (
                *manufacturer.evidence("recommended_psu_w"),
                published[identity],
            )
            amd_identity = (
                "BASIC-AMD-5900X-REF-1"
                if identity == "BASIC-NVIDIA4060-1"
                else "BASIC-AMD-9950X-REF-1"
            )
            if amd_identity in published:
                fields["psu_reference_cpu_tdp_class_w"] = cpu_class
                combined = (*combined, published[amd_identity])
            refs.update(
                {key: combined for key in fields if key != "pcie_backward_compatible"}
            )
    return BasicSpecs(fields, refs, frozenset())
