"""Curated benchmark identities, independent of HTTP/DB/catalog IDs."""

from decimal import Decimal

from upgradejusto.compatibility.basic_manufacturer import resolve_stock_specs
from upgradejusto.compatibility.basic_specs import resolve_basic_specs
from upgradejusto.compatibility.reference_knowledge import (
    merge_reference,
    reference_specs,
)
from upgradejusto.compatibility.tower_technical_resolver import (
    resolve_published_technical,
)

REFERENCE_VERSION = "tower-benefit-references-1"
IDENTITY_VERSION = "tower-reference-identity-2"
IDENTITY_KEYS = {
    "store",
    "product_id",
    "variant_key",
    "mpn",
    "gtin",
    "source_url",
    "category",
    "rights_note",
}
CPU_URL = "https://opendata.blender.org/benchmarks/query/"
GPU_URL = "https://www.techpowerup.com/review/nvidia-geforce-rtx-5070-founders-edition/35.html"
GPU_HASH = "cc86969af873d864355e5715c2a1860fb1f95726e4c35f8adeff6ef2bb0ff74e"
GPU_BENCHMARKS = {
    "RTX4060 8GB": "48",
    "RTX5070 FE12GB": "100",
    "RTX5070 Ti16GB": "123",
}
CPU = {
    "100-100000927BOX": (
        "AMD Ryzen 5 5600 6-Core Processor",
        "149.8979371914048",
        131,
        "03fca95c706283a06e213b20f8c2719589528651618946375ef3c550ad5a54c9",
    ),
    "100-100000926WOF": (
        "AMD Ryzen 7 5700X 8-Core Processor",
        "214.38925258002163",
        424,
        "12ef15b24d8e498655281a6eb172ab05fd6253247edefb427e58e5285c4d9a6f",
    ),
}
# Explicit manufacturer model -> chip reference crosswalk, NOT fuzzy matching.
GPU = {
    "DUAL-RTX4060-O8G-EVO": ("RTX4060 8GB", "48"),
    "PRIME-RTX5070-O12G": ("RTX5070 FE12GB", "100"),
    "TUF-RTX5070-O12G-GAMING": ("RTX5070 FE12GB", "100"),
}
CURATED_NAMES = {
    "AMD Ryzen 5 5600 100-100000927BOX": "100-100000927BOX",
    "AMD Ryzen 7 5700X 100-100000926WOF": "100-100000926WOF",
    "ASUS DUAL-RTX4060-O8G-EVO, negra OC": "DUAL-RTX4060-O8G-EVO",
    "ASUS PRIME-RTX5070-O12G": "PRIME-RTX5070-O12G",
    "ASUS TUF-RTX5070-O12G-GAMING": "TUF-RTX5070-O12G-GAMING",
}


def exact_mpn(component, catalog):
    """Retail display name alone never establishes identity."""
    if component is None or not component.sources:
        return None
    identities = getattr(catalog, "retail_identities", {})
    if component.id in identities:
        identity = identities[component.id]
        # Published B2 resource FK binds identity to this exact component/version.
        # GTIN and display names are never alternate MPNs. Invalid resource
        # identity must not fall through to the curated-name crosswalk.
        if (
            not isinstance(identity, dict)
            or set(identity) != IDENTITY_KEYS
            or identity["category"] != component.category.value
            or identity["store"] not in ("compragamer", "venex")
            or not isinstance(identity["product_id"], str)
            or not identity["product_id"].strip()
            or not isinstance(identity["variant_key"], str)
            or not identity["variant_key"].strip()
            or not isinstance(identity["source_url"], str)
            or not identity["source_url"].startswith("https://")
            or not isinstance(identity["mpn"], str)
            or not identity["mpn"]
            or identity["mpn"] != identity["mpn"].strip()
        ):
            return None
        return identity["mpn"]
    specs = resolve_basic_specs(component, catalog)
    if not specs.import_digest:
        return None
    mpn = component.attributes.get("mpn")
    if mpn and component.attributes.get("mpn_source_id") in {
        s.id for s in component.sources
    }:
        return mpn
    # Existing curated exact models must also retain sourced technical facts.
    if not specs.references:
        return None
    return CURATED_NAMES.get(component.name)


def reference(component, catalog, objective, workload):
    mpn = exact_mpn(component, catalog)
    identity = getattr(catalog, "retail_identities", {}).get(
        component.id if component else None
    )
    match = {
        "matched_mpn": mpn,
        "identity_version": IDENTITY_VERSION,
        "identity_source_url": identity.get("source_url")
        if isinstance(identity, dict)
        else None,
        "identity_kind": "published_retail_mpn"
        if identity is not None
        else "sourced_curated_model",
    }
    if (
        component is not None
        and component.category == "cpu"
        and objective == "productivity"
        and workload == "blender-cpu"
        and mpn in CPU
    ):
        name, score, count, digest = CPU[mpn]
        query = name.replace(" ", "+")
        return {
            **match,
            "model": name,
            "score": score,
            "samples": count,
            "source_url": CPU_URL
            + "?device_name="
            + query
            + "&device_type=CPU&blender_version=4.5.0&group_by=device_name&response_type=datatables",
            "raw_sha256": digest,
            "version": "Blender 4.5.0 Cycles CPU",
            "observed_on": "2026-10-26",
            "workload": "blender-cpu",
            "unit": "samples/minute aggregate median",
            "limitations": "Community heterogeneous systems/OC; not universal productivity or guaranteed speedup",
        }
    if (
        component is not None
        and component.category == "gpu"
        and objective == "gaming"
        and mpn in GPU
    ):
        name, score = GPU[mpn]
        return {
            **match,
            "model": name,
            "score": score,
            "source_url": GPU_URL,
            "method_url": "https://www.techpowerup.com/review/nvidia-geforce-rtx-5070-founders-edition/7.html",
            "raw_url": "https://tpucdn.com/review/nvidia-geforce-rtx-5070-founders-edition/images/relative-performance-2560-1440.png",
            "raw_sha256": GPU_HASH,
            "version": "TPU GPU2025.1 raster1440",
            "observed_on": "2026-10-26",
            "published_on": "2025-03-04",
            "workload": "raster-native-2560x1440-RT-DLSS-FSR-off",
            "unit": "relative index, RTX5070 FE=100, NOT FPS",
            "limitations": "Reference chip, not measured ASUS OC variant or user's PC; not every game",
        }
    return None


def line_specs(line, catalog):
    """Same evidence the engine reads, for a catalog part or a typed model."""
    category = getattr(line.category, "value", str(line.category))
    component = catalog.get(line.component_id) if line.component_id else None
    if component is None:
        return reference_specs(category, getattr(line, "declared_model", None))
    published = resolve_published_technical(
        component, catalog, resolve_stock_specs(component, catalog)
    ).specs
    return merge_reference(published, reference_specs(category, component.name))


def index_reference(line, catalog):
    """Relative index by chip or model: one scale, so never mixed with curated."""
    specs = line_specs(line, catalog)
    score = specs.fact("perf_index")
    if score is None:
        return None
    ref = specs.evidence("perf_index")[0]
    return {
        "matched_mpn": None,
        "identity_version": IDENTITY_VERSION,
        "identity_kind": "reference_by_name",
        "model": specs.fact("reference_chip")
        or line.declared_model
        or line.component_id,
        "score": str(score),
        "source_url": ref.url,
        "version": ref.locator,
        "observed_on": ref.consulted_on,
        "workload": "relative-index",
        "unit": "relative index, NOT FPS",
        "limitations": "Reference chip or model, not the exact variant or your PC",
    }


def benefit(before, after, catalog, objective, workload):
    category = {"gaming": "gpu", "productivity": "cpu", "general": "ram"}[objective]
    old = [line for line in before.lines if line.category == category]
    new = [line for line in after.lines if line.category == category]
    result = {
        "status": "unknown",
        "before": None,
        "after": None,
        "source": [],
        "workload": workload,
    }
    if [(line.component_id, line.quantity) for line in old] == [
        (line.component_id, line.quantity) for line in new
    ]:
        return {**result, "status": "not_an_improvement"}
    if objective == "general":
        totals = []
        refs = []
        for tower, lines in ((before, old), (after, new)):
            if tower.category_status[category] != "present" or not lines:
                return result
            total = Decimal(0)
            for line in lines:
                # Same facts the engine reads, retail pieces included.
                specs = line_specs(line, catalog)
                value = specs.fact("capacity_gb")
                if value is None:
                    return result
                modules = specs.fact("kit_modules") or 1
                total += Decimal(str(value)) * line.quantity * modules
                refs.extend(
                    r.model_dump(mode="json") for r in specs.evidence("capacity_gb")
                )
            totals.append(total)
        return {
            "status": "supported" if totals[1] > totals[0] else "not_an_improvement",
            "before": str(totals[0]),
            "after": str(totals[1]),
            "source": refs,
            "workload": None,
            "label": "RAM capacity GB only; not universal performance",
        }
    if len(old) != 1 or len(new) != 1:
        return result
    refs = [
        reference(catalog.get(line.component_id), catalog, objective, workload)
        for line in (old[0], new[0])
    ]
    if any(r is None for r in refs):
        refs = [index_reference(line, catalog) for line in (old[0], new[0])]
    if any(r is None for r in refs):
        return result
    return {
        "status": "supported"
        if Decimal(refs[1]["score"]) > Decimal(refs[0]["score"])
        else "not_an_improvement",
        "before": refs[0]["score"],
        "after": refs[1]["score"],
        "source": refs,
        "workload": refs[1]["workload"],
        "label": "Reference score difference, not guaranteed PC improvement",
    }
