"""First PC from zero: a complete priced proposal the engine has already judged.

Search picks parts by rules and reference data; the verdict always comes from the
same engine as any other PC. Nothing is saved: it opens as an editable draft.
"""

import re
from dataclasses import dataclass
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from upgradejusto.compatibility.tower_essential import evaluate_tower_essential
from upgradejusto.compatibility.tower_evidence import resolve_tower_evidence

from .tower_cost import select_offer
from .tower_references import line_specs

# How much each part matters for the objective: GPU first when playing.
WEIGHTS = {
    "gaming": (Decimal("0.75"), Decimal("0.25")),
    "productivity": (Decimal("0.3"), Decimal("0.7")),
    "general": (Decimal("0.4"), Decimal("0.6")),
}
MEMORY_GB = {"gaming": 16, "productivity": 32, "general": 16}
STORAGE_GB = 500
# Sound buying rules, not compatibility: the engine still judges the result.
NO_COOLER = re.compile(
    r"NO INCLUYE|SIN COOLER|\bOEM\b|\bTRAY\b|\bBULK\b|\bI[3579][- ]?\d{4,5}KF?S?\b",
    re.I,
)
HIGH_END = re.compile(r"\bI[79][- ]?\d|\bULTRA [79]\b|\bRYZEN [79]\b", re.I)
ENTRY_CHIPSETS = {"A320", "A520", "A620", "H310", "H410", "H510", "H610", "H810"}
HIGH_END_PSU_MARGIN_W = 100


@dataclass(frozen=True)
class Part:
    component: object
    offer: object
    price: Decimal
    specs: object

    def fact(self, key):
        return self.specs.fact(key)


def parts_of(category, catalog, condition, now):
    found = []
    for component in catalog.values():
        if component.category != category:
            continue
        identity = getattr(catalog, "retail_identities", {}).get(component.id)
        offer = select_offer(component, condition, now, identity)
        if offer is None:
            continue
        line = SimpleNamespace(
            category=component.category, component_id=component.id, declared_model=None
        )
        found.append(
            Part(component, offer, Decimal(offer.amount), line_specs(line, catalog))
        )
    return sorted(found, key=lambda part: (part.price, part.component.id))


def storage_gb(name):
    terabytes = re.search(r"\b(\d+)\s?TB\b", name, re.I)
    gigabytes = re.search(r"\b(\d{3,4})\s?GB\b", name, re.I)
    if terabytes:
        return int(terabytes.group(1)) * 1000
    return int(gigabytes.group(1)) if gigabytes else 0


def memory_total(part):
    return (part.fact("capacity_gb") or 0) * (part.fact("kit_modules") or 1)


def cheapest(parts, accepted):
    return next((part for part in parts if accepted(part)), None)


def rest_of_build(cpu, gpu, stock, objective):
    """Cheapest supporting parts that the chosen CPU and GPU actually need."""
    generation = cpu.fact("cpu_generation")
    high_end = HIGH_END.search(cpu.component.name) is not None
    board = cheapest(
        stock["motherboard"],
        lambda part: (
            part.fact("socket") == cpu.fact("socket")
            and generation in (part.fact("supported_generations") or ())
            and part.fact("memory_type") is not None
            and not (high_end and part.fact("chipset") in ENTRY_CHIPSETS)
        ),
    )
    if board is None:
        return None
    kind = board.fact("memory_type")
    ram = cheapest(
        stock["ram"],
        lambda part: (
            part.fact("memory_type") == kind
            and part.fact("module_type") == "UDIMM"
            and memory_total(part) >= MEMORY_GB[objective]
        ),
    )
    watts = gpu.fact("recommended_psu_w") + (HIGH_END_PSU_MARGIN_W if high_end else 0)
    psu = cheapest(
        stock["psu"],
        lambda part: (
            (part.fact("continuous_power_w") or 0) >= watts
            and "80 PLUS" in part.component.name.upper()
        ),
    )
    drive = cheapest(
        stock["storage"],
        lambda part: (
            part.fact("storage_interface") == "M2-NVMe"
            and storage_gb(part.component.name) >= STORAGE_GB
        ),
    )
    # A case that ships with its own unknown PSU would pay for that part twice.
    case = cheapest(
        stock["case"], lambda part: "FUENTE" not in part.component.name.upper()
    )
    needed = [board, ram, psu, drive, case]
    if NO_COOLER.search(cpu.component.name):
        needed.append(stock["cooler"][0] if stock["cooler"] else None)
    return None if any(part is None for part in needed) else needed


def candidates(stock, budget, objective):
    """Best CPU and GPU pair that fits, by the objective's weights."""
    gpus = [
        part
        for part in stock["gpu"]
        if part.fact("perf_index") and part.fact("recommended_psu_w")
    ]
    cpus = [part for part in stock["cpu"] if part.fact("perf_index")]
    if not gpus or not cpus:
        return []
    top_gpu = max(Decimal(str(part.fact("perf_index"))) for part in gpus)
    top_cpu = max(Decimal(str(part.fact("perf_index"))) for part in cpus)
    gpu_weight, cpu_weight = WEIGHTS[objective]
    found = []
    for cpu in cpus:
        for gpu in gpus:
            if cpu.price + gpu.price >= budget:
                continue
            rest = rest_of_build(cpu, gpu, stock, objective)
            if rest is None:
                continue
            total = cpu.price + gpu.price + sum(part.price for part in rest)
            if total > budget:
                continue
            score = gpu_weight * Decimal(str(gpu.fact("perf_index"))) / top_gpu
            score += cpu_weight * Decimal(str(cpu.fact("perf_index"))) / top_cpu
            found.append(
                (-score, total, cpu.component.id, gpu.component.id, cpu, gpu, rest)
            )
    found.sort(key=lambda item: item[:4])
    return found


def as_tower(parts):
    lines = [
        SimpleNamespace(
            line_id=uuid4(),
            category=part.component.category,
            component_id=part.component.id,
            declared_model=None,
            quantity=1,
        )
        for part in parts
    ]
    status = {
        getattr(line.category, "value", str(line.category)): "present" for line in lines
    }
    return SimpleNamespace(
        schema_version=2,
        revision=1,
        lines=lines,
        category_status=status,
        context=SimpleNamespace(assembly_state="new", bios_version=None),
    )


def first_build(catalog, version, objective, budget, now, condition="cash"):
    """Return the best proposal the engine accepts, or the reason there is none."""
    stock = {
        category: parts_of(category, catalog, condition, now)
        for category in (
            "cpu",
            "gpu",
            "motherboard",
            "ram",
            "psu",
            "storage",
            "case",
            "cooler",
        )
    }
    for *_, cpu, gpu, rest in candidates(stock, budget, objective)[:20]:
        parts = [cpu, gpu, *rest]
        tower = as_tower(parts)
        evaluation = evaluate_tower_essential(
            tower, resolve_tower_evidence(tower, catalog, version)
        )
        if evaluation.verdict != "compatible":
            continue
        return {
            "status": "proposed",
            "lines": [
                {
                    "category": getattr(
                        part.component.category, "value", part.component.category
                    ),
                    "component_id": part.component.id,
                    "offer_id": part.offer.offer_id,
                    "quantity": 1,
                }
                for part in parts
            ],
            "total_ars": str(sum(part.price for part in parts)),
            "verdict": evaluation.verdict,
            "notices": list(evaluation.warnings),
        }
    return {
        "status": "not_enough",
        "lines": [],
        "total_ars": None,
        "verdict": None,
        "notices": [],
    }
