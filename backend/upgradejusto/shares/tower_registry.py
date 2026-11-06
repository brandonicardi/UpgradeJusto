"""Frozen v1 classification/URL vocabulary, never a network client or motor."""

import math
import re
from urllib.parse import urlsplit

from upgradejusto.retail.models import retail_url

PROJECTION_VERSION = "tower-share-projection-1"
VERSIONS = {
    "classification": "tower-share-classification-1",
    "facts": "tower-share-facts-1",
    "labels": "tower-share-labels-es-1",
    "urls": "tower-share-url-policy-1",
}
ORIGIN = {
    "scope": "cu05-tower-stock-1",
    "policy": "tower-stock-policy-1",
    "inventory": "tower-stock-inventory-1",
    "rules": "cu05-tower-stock-engine-1",
    "calculation": "tower-plan-calculation-1",
    "references": "tower-benefit-references-1",
    "identity": "tower-reference-identity-2",
}
ESSENTIAL_ORIGIN = {
    **ORIGIN,
    "scope": "cu05-tower-essential-1",
    "policy": "tower-essential-policy-1",
    "inventory": "tower-essential-inventory-1",
    "rules": "cu05-tower-essential-engine-1",
}
CATEGORIES = {
    "cpu": "CPU",
    "motherboard": "Placa base",
    "ram": "RAM",
    "gpu": "GPU",
    "psu": "Fuente",
    "case": "Gabinete",
    "storage": "Almacenamiento",
    "cooler": "Refrigeración",
    "fan": "Ventiladores",
}
RULE_LABELS = dict(
    zip(
        (f"T{i:02}" for i in range(1, 13)),
        (
            "CPU/placa/BIOS",
            "RAM",
            "Interfaz GPU",
            "Largo GPU",
            "Fuente stock",
            "Conexiones de alimentación",
            "Formatos y montaje",
            "Almacenamiento",
            "Refrigeración",
            "Ventiladores",
            "Identificación y presencia",
            "Recursos compartidos y cargas",
        ),
        strict=True,
    )
)
STATE_LABELS = {
    "pass": "comprobación aprobada dentro del alcance nominal",
    "fail": "incompatibilidad conocida; no ejecutar sin resolver",
    "unknown": "requiere verificación; faltan datos necesarios",
}
EXCLUDES = (
    "Geometría avanzada e interferencias milimétricas y curvas de cables",
    "Transitorios medidos y certificación térmica/eléctrica exhaustiva",
    "Conservación de funciones frontales y periféricos",
)
LOCATORS = {
    "manufacturer_spec": "Ficha técnica del fabricante",
    "manufacturer_manual": "Manual del fabricante",
    "manufacturer_support": "Soporte CPU/BIOS publicado",
    "manufacturer_policy": "Política nominal del fabricante",
    "retail_product": "Producto comercial histórico",
    "benchmark_blender_cpu": "Referencia Blender CPU4.5.0",
    "benchmark_tpu_raster": "Referencia raster1440",
}
NV3_URL = "https://www.kingston.com/datasheets/SNV3S_us.pdf"
NV3_SOURCE = (
    "manufacturer38-kingston-nv3-500g-pdf",
    NV3_URL,
    "2026-10-26",
    "PDF p1 Specifications M.2 2280: Form factor and Interface; p2 Part Numbers M.2 2280: SNV3S/500G; MKD-06162025",
)

# These paths are literals, not URL prefixes or discovery from arbitrary sources.
PATHS = {
    "www.amd.com": (
        "/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-5-5600.html",
        "/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-7-5700x.html",
        "/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-9-5900x.html",
    ),
    "ir.amd.com": (
        "/news-events/press-releases/detail/1053/amd-launches-the-ultimate-gaming-processor-brings-enthusiast-performance-to-an-expanded-lineup-of-ryzen-desktop-processors",
        "/news-events/press-releases/detail/1202/amd-unveils-next-gen-zen-5-ryzen-processors-to-power-advanced-ai-experiences",
    ),
    "www.asrock.com": (
        "/mb/AMD/B550M%20Pro4/index.us.asp",
        "/mb/AMD/B550%20Pro4/index.asp",
        "/mb/AMD/B550M%20Steel%20Legend/index.us.asp",
    ),
    "download.asrock.com": (
        "/Manual/B550M%20Pro4.pdf",
        "/Manual/B550%20Pro4.pdf",
        "/Manual/B550M%20Steel%20Legend.pdf",
    ),
    "www.kingston.com": (
        "/en/memory/client/ddr4-3200mts-non_ecc-unbuffered-dimm",
        "/datasheets/KVR32N22S8_8.pdf",
        "/datasheets/KVR32N22D8_16.pdf",
        "/datasheets/SNV3S_us.pdf",
    ),
    "www.asus.com": (
        "/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g-evo/techspec/",
        "/us/motherboards-components/graphics-cards/prime/prime-rtx5070-o12g/techspec/",
        "/us/motherboards-components/graphics-cards/tuf-gaming/tuf-rtx5070-o12g-gaming/techspec/",
    ),
    "www.nvidia.com": (
        "/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/",
        "/en-us/geforce/graphics-cards/50-series/rtx-5070-family/",
    ),
    "www.corsair.com": (
        "/us/en/p/psu/cp-9020277-na/cx-series-cx550-550-watt-80-plus-bronze-atx-power-supply-cp-9020277-na",
        "/us/en/explorer/diy-builder/power-supply-units/corsair-rme-series-2025/",
        "/us/en/p/psu/cp-9020295-na/rme-series-rm750e-fully-modular-low-noise-atx-power-supply-cp-9020295-na",
        "/us/en/explorer/gamer/gaming-pcs/does-a-pcie-50-gpu-work-in-a-pcie-40-motherboard/",
    ),
    "www.fractal-design.com": (
        "/products/cases/pop-series/pop-2-air/pop-2-air-black-solid/",
        "/products/cases/meshify-series/meshify-c/meshify-c/",
    ),
    "support.fractal-design.com": (
        "/support/solutions/articles/4000119088-will-my-graphics-card-fit-in-the-meshify-c-or-meshify-c-mini-with-a-radiator-installed-in-the-front-",
    ),
}
MANUFACTURER = {
    "https://" + host + path for host, paths in PATHS.items() for path in paths
}
BLENDER = {
    "https://opendata.blender.org/benchmarks/query/?device_name="
    + name
    + "&device_type=CPU&blender_version=4.5.0&group_by=device_name&response_type=datatables"
    for name in (
        "AMD+Ryzen+5+5600+6-Core+Processor",
        "AMD+Ryzen+7+5700X+8-Core+Processor",
    )
}
TPU = {
    "https://www.techpowerup.com/review/nvidia-geforce-rtx-5070-founders-edition/35.html",
    "https://www.techpowerup.com/review/nvidia-geforce-rtx-5070-founders-edition/7.html",
    "https://tpucdn.com/review/nvidia-geforce-rtx-5070-founders-edition/images/relative-performance-2560-1440.png",
}
# Tom's and production HTTP intentionally have no entries in this v1.


def url_class(url, retail_identity=None, image=False):
    if type(url) is not str or len(url) > 2000:
        return None
    if any(ord(c) <= 32 for c in url) or "\\" in url:
        return None
    parsed = urlsplit(url)
    if (
        parsed.scheme != "https"
        or parsed.username
        or parsed.password
        or parsed.fragment
    ):
        return None
    if retail_identity is not None:
        try:
            retail_url(url, retail_identity["store"], image=image)
        except (ValueError, KeyError, TypeError):
            return None
        if image:
            return "retail_image"
        return "retail_product" if url == retail_identity.get("source_url") else None
    if image:
        return None
    if url in MANUFACTURER:
        if parsed.path.endswith(".pdf"):
            return "manufacturer_manual"
        if parsed.netloc == "www.asrock.com":
            return "manufacturer_support"
        if parsed.netloc in ("ir.amd.com", "www.nvidia.com", "www.corsair.com"):
            return "manufacturer_policy"
        return "manufacturer_spec"
    if url in BLENDER:
        return "benchmark_blender_cpu"
    if url in TPU:
        return "benchmark_tpu_raster"
    return None


SOCKETS = {"AM4", "AM5", "LGA1700", "LGA1851"}
ENUMS = {
    "socket": SOCKETS,
    "memory_type": {"DDR4", "DDR5"},
    "module_type": {"UDIMM", "RDIMM", "SODIMM"},
    "pcie": {"PCIe x16", "PCIe x8"},
    "board_form": {"ATX", "mATX", "ITX"},
    "psu_form": {"ATX", "SFX", "SFX-L"},
    "power_kind": {"PCIe8", "16pin"},
    "platform": {"AM4", "AM5"},
    "family": {"Ryzen5000"},
    "basis": {"manufacturer_whole_system_minimum"},
}
# name -> (type, category, published field). None field is a registered computed
# boolean, requiring bound rule references; free strings never qualify that way.
FACTS = {
    "T01": {
        "cpu_model": ("model", "cpu", None),
        "motherboard_model": ("model", "motherboard", None),
        "bios_requirement_met": ("bool", None, None),
        **{
            f"{cat}.socket_source_conflict": ("bool", None, None)
            for cat in ("cpu", "motherboard")
        },
        **{
            name: ("socket", cat, "socket")
            for name, cat in (
                ("cpu_socket", "cpu"),
                ("motherboard_socket", "motherboard"),
                ("cpu.socket_published_value", "cpu"),
                ("motherboard.socket_published_value", "motherboard"),
            )
        },
    },
    "T02": {
        "cpu.memory_type": ("memory_type", "cpu", "memory_type"),
        "motherboard.memory_type": ("memory_type", "motherboard", "memory_type"),
        "motherboard.module_type": ("module_type", "motherboard", "module_type"),
        "motherboard.ram_slots": ("count", "motherboard", "slots"),
        "motherboard.max_total_gb": ("num", "motherboard", "max_total_gb"),
        "motherboard.max_module_gb": ("num", "motherboard", "max_module_gb"),
        "motherboard.admitted_ecc": ("bool", "motherboard", "ecc"),
        "motherboard.admitted_buffered": ("bool", "motherboard", "buffered"),
        **{
            f"{cat}.native_jedec_mts": ("rates", cat, "jedec_mts")
            for cat in ("cpu", "motherboard")
        },
        **{
            f"ram.module_{i}.{name}": (kind, f"ram:{i}", key)
            for i in range(1, 5)
            for name, kind, key in (
                ("memory_type", "memory_type", "memory_type"),
                ("module_type", "module_type", "module_type"),
                ("capacity_gb", "num", "capacity_gb"),
                ("native_jedec_mts", "rates", "jedec_mts"),
                ("ecc", "bool", "ecc"),
                ("buffered", "bool", "buffered"),
            )
        },
    },
    "T03": {
        "motherboard.pcie_slot": ("pcie", "motherboard", "pcie_slot"),
        "gpu.pcie_interface": ("pcie", "gpu", "pcie_interface"),
        "gpu.pcie_backward_compatible": ("bool", "gpu", "pcie_backward_compatible"),
    },
    "T04": {
        "gpu.length_mm": ("num", "gpu", "length_mm"),
        "case.gpu_limit_mm": ("num", "case", "gpu_limit_mm"),
    },
    "T05": {
        name: (kind, cat, key)
        for name, kind, cat, key in (
            ("psu.continuous_power_w", "num", "psu", "continuous_power_w"),
            (
                "gpu.manufacturer_system_recommendation_w",
                "num",
                "gpu",
                "recommended_psu_w",
            ),
            (
                "gpu.nvidia_system_recommendation_w",
                "num",
                "gpu",
                "nvidia_recommended_psu_w",
            ),
            ("cpu.documented_tdp_class_w", "num", "cpu", "cpu_tdp_class_w"),
            (
                "gpu.psu_reference_cpu_tdp_class_w",
                "num",
                "gpu",
                "psu_reference_cpu_tdp_class_w",
            ),
            ("cpu.platform", "platform", "cpu", "cpu_platform"),
            ("cpu.documented_stock_family", "family", "cpu", "cpu_stock_family"),
            ("gpu.psu_reference_platform", "platform", "gpu", "psu_reference_platform"),
            (
                "gpu.psu_recommendation_basis",
                "basis",
                "gpu",
                "psu_recommendation_basis",
            ),
        )
    },
    "T06": {
        **{
            f"{cat}.{key}": ("count", cat, key)
            for cat, keys in (
                (
                    "psu",
                    (
                        "atx24_count",
                        "eps8_count",
                        "pcie8_count",
                        "native16_count",
                        "pcie8_independent_branches",
                    ),
                ),
                ("motherboard", ("atx24_count", "eps8_count")),
            )
            for key in keys
        },
        "gpu.power_count": ("count", "gpu", "gpu_power_count"),
        "gpu.adapter_pcie8_inputs": ("count", "gpu", "adapter_pcie8_inputs"),
        "gpu.power_kind": ("power_kind", "gpu", "gpu_power_kind"),
    },
    "T07": {
        "motherboard.form_factor": ("board_form", "motherboard", "form_factor"),
        "psu.form_factor": ("psu_form", "psu", "form_factor"),
        "case.board_formats": ("board_forms", "case", "board_formats"),
        "case.psu_formats": ("psu_forms", "case", "psu_formats"),
        "psu.length_mm": ("num", "psu", "length_mm"),
        "case.psu_limit_mm": ("num", "case", "psu_limit_mm"),
    },
}


def typed_value(kind, value):
    if value is None:
        return True
    if kind == "bool":
        return type(value) is bool
    if kind in ("count", "num"):
        return (
            type(value) in ((int,) if kind == "count" else (int, float))
            and math.isfinite(value)
            and 0 <= value <= (1000000 if kind == "count" else 1000000000)
        )
    if kind in ("rates", "board_forms", "psu_forms"):
        if type(value) is not list or not value:
            return False
        return all(
            type(v) is int and 1 <= v <= 1000000000
            if kind == "rates"
            else type(v) is str
            and v in ENUMS["board_form" if kind == "board_forms" else "psu_form"]
            for v in value
        )
    return type(value) is str and value in ENUMS.get(kind, set())


def money(value, nullable=False):
    if value is None and nullable:
        return None
    if type(value) is not str or not re.fullmatch(
        r"(?:0|[1-9][0-9]{0,23})\.[0-9]{2}", value
    ):
        raise ValueError("Invalid public money")
    return value
