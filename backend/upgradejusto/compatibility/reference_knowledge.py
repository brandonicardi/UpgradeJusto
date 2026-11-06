"""General hardware reference: identify a part by its name, return sourced facts.

Pure and deterministic. It only fills facts the manufacturer evidence left empty,
and an unclear or contradictory name yields nothing. Every fact carries a REF-*
source so the verdict can say it rests on reference data, not on a model datasheet.
"""

import json
import re
from functools import cache
from pathlib import Path

from .basic_specs import BasicSpecs
from .observations import EvidenceRef

REFERENCE_VERSION = "hardware-reference-1"
REFERENCE_PREFIX = "REF-"
NAME_SOURCE_ID = "REF-NOMBRE"
DOCUMENT_URL = "https://github.com/brandonicardi/UpgradeJusto"
TABLES = Path(__file__).parent / "conocimiento"
SOCKET_TEXT = re.compile(r"\b(AM[45])\b|\b(?:LGA|S|SOCKET)\s?(1151|1200|1700|1851)\b")
MEMORY_TEXT = re.compile(r"\bDDR([345])\b")
AMD_SERIES = {
    "1": "zen",
    "2": "zen+",
    "3": "zen2",
    "4": "zen2",
    "5": "zen3",
    "7": "zen4",
    "8": "zen4",
    "9": "zen5",
}
# Laptop chips (U, H, HS, HX) come soldered: a desktop socket would be false.
DESKTOP_RYZEN = {"", "X", "X3D", "XT", "G", "GE", "GT", "F", "T", "E"}
DESKTOP_INTEL = {"", "K", "KF", "KS", "F", "T", "S", "TE"}
INTEL_ENTRY = {"G49": 8, "G54": 8, "G55": 9, "G59": 10, "G64": 10, "G69": 12, "G74": 12}


@cache
def table(name):
    path = TABLES / f"{name}.json"
    if not path.exists():
        return {"consulted_on": "2026-11-06", "sources": []}
    return json.loads(path.read_text(encoding="utf-8"))


@cache
def source_refs(name):
    data = table(name)
    refs = {}
    for row in data["sources"]:
        identity = row["source_id"]
        refs[identity] = EvidenceRef(
            source_id=identity
            if identity.startswith(REFERENCE_PREFIX)
            else REFERENCE_PREFIX + identity,
            url=row["url"],
            locator=row["locator"],
            consulted_on=data["consulted_on"],
        )
    return refs


@cache
def chipsets():
    found = {}
    for platform in table("plataformas")["platforms"]:
        for name, generations in platform["chipsets"].items():
            found[name] = (platform, tuple(generations))
    return found


@cache
def chipset_pattern():
    names = sorted(chipsets(), key=len, reverse=True)
    return re.compile(r"(?<![A-Z0-9])(" + "|".join(names) + r")(?=[A-Z]{0,2}\b|[-/ ])")


def socket_in(text):
    matched = SOCKET_TEXT.search(text)
    if matched is None:
        return None
    return matched.group(1) or "LGA" + matched.group(2)


def amd_generation(series, suffix):
    if suffix.startswith("G") and series in ("2200", "2400"):
        return "zen"
    if suffix.startswith("G") and series in ("3200", "3400"):
        return "zen+"
    return AMD_SERIES.get(series[0])


def cpu_identity(text):
    """Return (canonical model, generation) or None; the name decides, nothing else."""
    ryzen = re.search(
        r"\bRYZEN (?:PRO )?([3579]) (?:PRO )?(\d{4})(X3D|[A-Z]{0,2})\b", text
    )
    if ryzen:
        tier, series, suffix = ryzen.groups()
        generation = amd_generation(series, suffix)
        if suffix not in DESKTOP_RYZEN or generation is None:
            return None
        return (f"Ryzen {tier} {series}{suffix}", generation)
    if re.search(
        r"\bATHLON (?:GOLD |SILVER )?(?:3000G|200GE|220GE|240GE|300GE|320GE)\b", text
    ):
        return ("Athlon", "zen")
    ultra = re.search(r"\bCORE ULTRA ([3579]) (2\d{2})([A-Z]{0,2})\b", text)
    if ultra:
        tier, series, suffix = ultra.groups()
        return (f"Core Ultra {tier} {series}{suffix}", "ultra2")
    core = re.search(r"\b(?:CORE )?I([3579])[- ]?(\d{4,5})([A-Z]{0,2})\b", text)
    if core:
        tier, series, suffix = core.groups()
        generation = int(series[:-3])
        if 8 <= generation <= 14 and suffix in DESKTOP_INTEL:
            return (f"Core i{tier} {series}{suffix}", f"intel{generation}")
        return None
    entry = re.search(r"\b(?:CELERON|PENTIUM(?: GOLD)?) (G\d{4})", text)
    if entry:
        generation = INTEL_ENTRY.get(entry.group(1)[:3])
        return (entry.group(1), f"intel{generation}") if generation else None
    return None


def gpu_key(text):
    """Normalize the chip mentioned in a name; workstation boards stay unidentified."""
    if re.search(r"\b(?:ARC PRO|QUADRO|RADEON PRO)\b", text):
        return None
    geforce = re.search(r"\b(RTX|GTX) ?(\d{3,4})( ?TI)?( ?SUPER)?\b", text)
    if geforce:
        family, number, ti, sup = geforce.groups()
        parts = (family, number, "Ti" if ti else "", "Super" if sup else "")
        return " ".join(part for part in parts if part)
    radeon = re.search(r"\bRX ?(\d{3,4})( ?XTX| ?XT| ?GRE)?\b", text)
    if radeon:
        number, suffix = radeon.groups()
        return f"RX {number} {suffix.strip()}" if suffix else f"RX {number}"
    arc = re.search(r"\bARC ([AB]\d{3})\b", text)
    return f"Arc {arc.group(1)}" if arc else None


@cache
def gpu_rows():
    return {row["chip"].upper(): row for row in table("gpus").get("gpus", ())}


@cache
def cpu_rows():
    return {row["model"].upper(): row for row in table("cpus").get("cpus", ())}


class Builder:
    def __init__(self, source_url, name):
        self.fields, self.references = {}, {}
        self.name_ref = EvidenceRef(
            source_id=NAME_SOURCE_ID,
            url=source_url or DOCUMENT_URL,
            locator=f"Nombre publicado de la pieza: {name[:160] or 'sin nombre'}",
            consulted_on=table("plataformas")["consulted_on"],
        )

    def add(self, key, value, ref=None):
        if value is not None:
            self.fields[key] = value
            self.references[key] = (ref or self.name_ref,)

    def clear(self):
        self.fields.clear()
        self.references.clear()

    def specs(self):
        return BasicSpecs(self.fields, self.references, frozenset())


def platform_ref(platform):
    return source_refs("plataformas")[platform["source"]]


def cpu_facts(built, text):
    identity = cpu_identity(text)
    if identity is None:
        return
    model, generation = identity
    known = table("plataformas")["generations"][generation]
    declared = socket_in(text)
    if declared is not None and declared != known["socket"]:
        return
    source = next(
        platform_ref(platform)
        for platform in table("plataformas")["platforms"]
        if platform["socket"] == known["socket"]
    )
    built.add("socket", known["socket"], source)
    built.add("cpu_generation", generation, source)
    if len(known["memory"]) == 1:
        built.add("memory_type", known["memory"][0], source)
    else:
        built.add("memory_types_supported", tuple(known["memory"]), source)
    row = cpu_rows().get(model.upper())
    if row:
        refs = source_refs("cpus")
        built.add("cpu_tdp_w", row.get("tdp_w"), refs.get(row.get("tdp_source")))
        built.add("perf_index", row.get("perf_index"), refs.get(row.get("perf_source")))


def board_facts(built, text):
    matches = {found.group(1) for found in chipset_pattern().finditer(text)}
    if len(matches) != 1:
        return
    chipset = matches.pop()
    platform, generations = chipsets()[chipset]
    declared = socket_in(text)
    named = {f"DDR{value}" for value in MEMORY_TEXT.findall(text)}
    if (declared is not None and declared != platform["socket"]) or (
        named - set(platform["memory"])
    ):
        return
    source = platform_ref(platform)
    built.add("socket", platform["socket"], source)
    built.add("chipset", chipset, source)
    built.add("supported_generations", generations, source)
    # Works only on some boards and BIOS: a question, not a yes or a no.
    built.add(
        "verify_generations",
        tuple(platform.get("verify", {}).get(chipset, ())) or None,
        source,
    )
    built.add("pcie_slot", "PCIe x16", source)
    built.add("module_type", "UDIMM", source)
    if len(platform["memory"]) == 1:
        built.add("memory_type", platform["memory"][0], source)
    elif len(named) == 1:
        built.add("memory_type", next(iter(named)))


def ram_facts(built, text):
    generations = set(MEMORY_TEXT.findall(text))
    if len(generations) != 1:
        return
    built.add("memory_type", f"DDR{generations.pop()}")
    laptop = re.search(r"SO-?DIMM|NOTEBOOK", text)
    built.add("module_type", "SODIMM" if laptop else "UDIMM")
    kit = re.search(r"\b(\d)\s?X\s?(\d+)\s?GB\b", text)
    single = re.search(r"\b(\d+)\s?GB\b", text)
    if kit:
        built.add("capacity_gb", int(kit.group(2)))
        built.add("kit_modules", int(kit.group(1)))
    elif single:
        built.add("capacity_gb", int(single.group(1)))
        built.add("kit_modules", 1)


def gpu_row(text):
    """Some chips are published per memory size; the name says which one it is."""
    key = gpu_key(text)
    if key is None:
        return None
    memory = re.search(r"\b(\d{1,2})\s?GB\b", text)
    sized = f"{key} {memory.group(1)}GB".upper() if memory else None
    return gpu_rows().get(sized) or gpu_rows().get(key.upper())


def gpu_facts(built, text):
    row = gpu_row(text)
    if row is None:
        return
    refs = source_refs("gpus")
    built.add("reference_chip", row["chip"])
    built.add("pcie_interface", "PCIe x16")
    built.add("recommended_psu_w", row.get("psu_w"), refs.get(row.get("psu_source")))
    built.add("gpu_tdp_w", row.get("tdp_w"), refs.get(row.get("tdp_source")))
    built.add("perf_index", row.get("perf_index"), refs.get(row.get("perf_source")))


def psu_facts(built, text):
    watts = {int(value) for value in re.findall(r"\b(\d{3,4})\s?W\b", text)}
    if len(watts) == 1:
        built.add("continuous_power_w", watts.pop())


def storage_facts(built, text):
    if re.search(r"\bNVME\b", text):
        built.add("storage_interface", "M2-NVMe")
        built.add("storage_form", "2280")
    elif re.search(r"\bM\.2\b", text):
        return
    elif re.search(r"\bSSD\b", text) and "SATA" in text:
        built.add("storage_interface", "SATA")
        built.add("storage_form", "2.5-inch")
        built.add("sata_power_count", 1)
    elif re.search(r"\bDISCO R[IÍ]GIDO\b", text):
        built.add("storage_interface", "SATA")
        built.add("storage_form", "2.5-inch" if "2.5" in text else "3.5-inch")
        built.add("sata_power_count", 1)


READERS = {
    "cpu": cpu_facts,
    "motherboard": board_facts,
    "ram": ram_facts,
    "gpu": gpu_facts,
    "psu": psu_facts,
    "storage": storage_facts,
}


def reference_specs(category, name, source_url=None):
    built = Builder(source_url, name or "")
    reader = READERS.get(category)
    if reader and name:
        reader(built, name.upper())
    return built.specs()


def merge_reference(base, reference):
    """Manufacturer evidence always wins; a conflicted field stays conflicted."""
    fields, references = dict(base.fields), dict(base.references)
    for key, value in reference.fields.items():
        if key in base.conflicts or base.fact(key) is not None:
            continue
        fields[key] = value
        references[key] = reference.references[key]
    return BasicSpecs(fields, references, base.conflicts, base.import_digest)


def public_reference_facts(category, name):
    """Plain facts for screens: same reader as the engine, never a verdict."""
    return dict(reference_specs(category, name).fields)


def is_reference_ref(ref):
    return ref.source_id.startswith(REFERENCE_PREFIX)
