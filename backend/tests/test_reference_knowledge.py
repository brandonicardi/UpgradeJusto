"""Reference tables identify parts by name; the engine stays the only judge."""

from types import SimpleNamespace
from uuid import uuid4

from upgradejusto.compatibility.basic_specs import BasicSpecs
from upgradejusto.compatibility.observations import EvidenceRef
from upgradejusto.compatibility.reference_knowledge import (
    gpu_key,
    merge_reference,
    reference_specs,
)
from upgradejusto.compatibility.tower_contract import (
    TowerComponentEvidence,
    TowerTechnicalEvidenceDTO,
)
from upgradejusto.compatibility.tower_essential import evaluate_tower_essential

REVISION = "reference-test"
NAMES = {
    "cpu": "Procesador AMD Ryzen 7 5700G 4.6GHz Turbo AM4 + Wraith Stealth Cooler",
    "motherboard": "Mother ASUS PRIME B550M-A AC WIFI AM4",
    "ram": "Memoria Corsair DDR4 8GB 3200MHz Vengeance RGB PRO",
    "gpu": "Placa de Video Gigabyte GeForce RTX 3060 12GB GDDR6 GAMING OC",
    "psu": "Fuente ASRock 750W 80 Plus Gold Steel Legend",
    "storage": "Disco Solido SSD Team 1TB T-Force Vulcan Z SATA 550MB/s",
}
GPU = {
    "reference_chip": "RTX 3060",
    "pcie_interface": "PCIe x16",
    "recommended_psu_w": 550,
}
REF = EvidenceRef(
    source_id="REF-TEST",
    url="https://example.com/ref",
    locator="tabla",
    consulted_on="2026-11-06",
)


def gpu_specs(**changes):
    fields = {**GPU, **changes}
    return BasicSpecs(fields, {key: (REF,) for key in fields}, frozenset())


def specs_for(names):
    return {
        category: gpu_specs()
        if category == "gpu"
        else reference_specs(category, name, "https://example.com/pieza")
        for category, name in names.items()
    }


def evaluate(names, specs=None):
    specs = specs or specs_for(names)
    lines = [
        SimpleNamespace(
            line_id=uuid4(), category=category, component_id=category, quantity=1
        )
        for category in names
    ]
    tower = SimpleNamespace(
        schema_version=2,
        revision=1,
        lines=lines,
        category_status={category: "present" for category in names},
        context=SimpleNamespace(assembly_state="assembled", bios_version=None),
    )
    evidence = TowerTechnicalEvidenceDTO(
        data_revision=REVISION,
        components={
            category: TowerComponentEvidence(category, name, REVISION, specs[category])
            for category, name in names.items()
        },
        cpu_support=None,
    )
    return evaluate_tower_essential(tower, evidence)


def test_real_pc_fits_by_reference_and_says_so():
    result = evaluate(NAMES)
    states = {rule.rule_id: rule.state for rule in result.rule_results}
    assert result.verdict == "compatible", states
    assert states["T01"] == states["T02"] == states["T05"] == "pass"
    assert states["T06"] == "not_applicable"
    assert "tower_reference_data" in {c.id for c in result.additional_checks}


def test_ddr5_module_on_b550_is_incompatible():
    names = {**NAMES, "ram": "Memoria Corsair DDR5 16GB 5600MHz Vengeance"}
    result = evaluate(names)
    assert result.verdict == "incompatible"
    assert "T02" in result.coverage.failed


def test_am5_cpu_on_am4_board_is_incompatible():
    names = {**NAMES, "cpu": "Procesador AMD Ryzen 7 7700X 5.4GHz Turbo AM5"}
    result = evaluate(names)
    assert result.verdict == "incompatible"
    assert "T01" in result.coverage.failed


def test_same_socket_generation_outside_chipset_is_incompatible():
    names = {**NAMES, "cpu": "Procesador AMD Ryzen 5 3400G 4.2GHz Turbo AM4"}
    assert "T01" in evaluate(names).coverage.failed


def test_small_psu_is_incompatible():
    names = {**NAMES, "psu": "Fuente Segotep 500W ATX"}
    assert "T05" in evaluate(names).coverage.failed


def test_lga1700_board_memory_decides_for_a_dual_memory_cpu():
    names = {
        **NAMES,
        "cpu": "Procesador Intel Core i5 14400 4.7GHz Turbo Socket 1700",
        "motherboard": "Mother ASUS PRIME B760M-K DDR5 LGA1700",
        "ram": "Memoria Corsair DDR5 16GB 5600MHz",
    }
    assert evaluate(names).verdict == "compatible"
    assert evaluate({**names, "ram": NAMES["ram"]}).verdict == "incompatible"


def test_unidentified_part_stays_requires_verification():
    names = {**NAMES, "motherboard": "Mother genérica sin modelo"}
    assert evaluate(names).verdict == "requiere_verificacion"


def test_contradictory_name_gives_nothing():
    assert not reference_specs("motherboard", "Mother Asrock B550M AM5").fields
    assert not reference_specs("cpu", "Ryzen 7 7700X AM4").fields
    assert not reference_specs("ram", "Memoria DDR4 DDR5 8GB").fields


def test_workstation_board_is_not_a_gaming_chip():
    assert gpu_key("PLACA DE VIDEO PNY QUADRO RTX A1000 8GB") is None
    assert gpu_key("ASUS DUAL GEFORCE RTX 5060 TI 16GB") == "RTX 5060 Ti"
    assert gpu_key("XFX RADEON RX 9070 XT 16GB") == "RX 9070 XT"


def test_manufacturer_fact_wins_over_reference():
    base = BasicSpecs({"socket": "AM5"}, {"socket": (REF,)}, frozenset())
    merged = merge_reference(base, reference_specs("cpu", NAMES["cpu"]))
    assert merged.fact("socket") == "AM5"
    assert merged.fact("memory_type") == "DDR4"


def test_conflicted_fact_stays_conflicted():
    base = BasicSpecs({}, {"socket": (REF,)}, frozenset({"socket"}))
    merged = merge_reference(base, reference_specs("cpu", NAMES["cpu"]))
    assert merged.fact("socket") is None
