"""First PC proposals are complete, within budget and judged by the engine."""

from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace

from upgradejusto.compatibility.reference_knowledge import reference_specs
from upgradejusto.recommendations import first_build as module
from upgradejusto.recommendations.first_build import first_build, storage_gb

NOW = datetime(2026, 11, 6, tzinfo=UTC)
PARTS = {
    "cpu": [
        ("Procesador AMD Ryzen 5 5600 AM4 + Wraith Stealth Cooler", 200000),
        ("Procesador AMD Ryzen 7 5700X AM4 - No incluye Cooler", 300000),
    ],
    "gpu": [
        ("Placa de Video ASUS GeForce RTX 3060 12GB", 400000),
        ("Placa de Video ASUS GeForce RTX 5070 12GB", 1200000),
    ],
    "motherboard": [
        ("Mother Asrock B550M AM4", 100000),
        ("Mother ASUS B650EM-A AM5 DDR5", 90000),
    ],
    "ram": [
        ("Memoria Corsair DDR5 16GB 5600MHz", 50000),
        ("Memoria Corsair DDR4 16GB 3200MHz", 80000),
    ],
    "psu": [
        ("Fuente Segotep 500W 80 Plus", 40000),
        ("Fuente Asrock 750W 80 Plus Gold", 90000),
    ],
    "storage": [("Disco Solido SSD M.2 Team 1TB NVMe PCIe Gen4", 90000)],
    "case": [("Gabinete Simple", 50000)],
    "cooler": [("Cooler CPU Simple", 30000)],
}


class Catalog(dict):
    source_rows = ()
    support_rows = ()


def offer(identity, amount):
    return SimpleNamespace(
        offer_id=f"o-{identity}", amount=str(amount), component_id=identity
    )


def catalog():
    data = Catalog()
    for category, rows in PARTS.items():
        for index, (name, amount) in enumerate(rows):
            identity = f"{category}-{index}"
            data[identity] = SimpleNamespace(
                id=identity,
                category=SimpleNamespace(value=category),
                name=name,
                attributes={},
                sources=(),
                offers=(offer(identity, amount),),
            )
    return data


def patched(monkeypatch):
    monkeypatch.setattr(
        module,
        "select_offer",
        lambda component, *_: component.offers[0],
    )
    monkeypatch.setattr(
        module,
        "parts_of",
        lambda category, data, *_: sorted(
            (
                module.Part(
                    component,
                    component.offers[0],
                    Decimal(component.offers[0].amount),
                    reference_specs(category, component.name),
                )
                for component in data.values()
                if component.category.value == category
            ),
            key=lambda part: part.price,
        ),
    )
    monkeypatch.setattr(module, "resolve_tower_evidence", fake_evidence)


def fake_evidence(tower, data, version):
    from upgradejusto.compatibility.reference_knowledge import reference_specs
    from upgradejusto.compatibility.tower_contract import (
        TowerComponentEvidence,
        TowerTechnicalEvidenceDTO,
    )

    return TowerTechnicalEvidenceDTO(
        data_revision=version,
        components={
            line.component_id: TowerComponentEvidence(
                line.category.value,
                data[line.component_id].name,
                version,
                reference_specs(line.category.value, data[line.component_id].name),
            )
            for line in tower.lines
        },
        cpu_support=None,
    )


def test_proposal_is_complete_compatible_and_within_budget(monkeypatch):
    patched(monkeypatch)
    result = first_build(catalog(), "v", "gaming", Decimal(1200000), NOW)
    assert result["status"] == "proposed" and result["verdict"] == "compatible"
    assert Decimal(result["total_ars"]) <= 1200000
    chosen = {line["category"]: line["component_id"] for line in result["lines"]}
    assert {"cpu", "gpu", "motherboard", "ram", "psu", "storage", "case"} <= set(chosen)
    assert chosen["motherboard"] == "motherboard-0", "AM4 CPU needs the AM4 board"
    assert chosen["ram"] == "ram-1", "the board asks for DDR4, even if DDR5 is cheaper"


def test_cpu_without_cooler_gets_one(monkeypatch):
    patched(monkeypatch)
    data = catalog()
    del data["cpu-0"]
    result = first_build(data, "v", "gaming", Decimal(1300000), NOW)
    assert "cooler" in {line["category"] for line in result["lines"]}


def test_small_budget_says_so_instead_of_inventing(monkeypatch):
    patched(monkeypatch)
    result = first_build(catalog(), "v", "gaming", Decimal(100000), NOW)
    assert result["status"] == "not_enough" and result["lines"] == []


def test_storage_size_reads_terabytes_and_gigabytes():
    assert storage_gb("SSD Team 1TB") == 1000
    assert storage_gb("SSD Kingston 480GB") == 480
    assert storage_gb("SSD sin dato") == 0
