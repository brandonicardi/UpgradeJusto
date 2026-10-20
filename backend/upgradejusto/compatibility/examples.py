"""Extracto documental 28.1 de HARDWARE_DEMO 25.1, no catálogo ni PCs medidas."""

from dataclasses import dataclass
from typing import Literal

from .models import (
    AdapterRoute,
    AdapterSpec,
    Assignment,
    CableInventory,
    Connector,
    EffectiveLimit,
    EvidenceRef,
    GpuLengthInput,
    Measurement,
    PartInstance,
    ResolvedConfiguration,
)

DATA_REVISION = "hardware-demo-25.1/extract-28.1"
_F07 = EvidenceRef(
    source_id="F07",
    url="https://www.asus.com/us/motherboards-components/graphics-cards/prime/prime-rtx5070-o12g/techspec/",
    locator="Tech Specs / Accessories: adaptador incluido 1 a 2",
    consulted_on="2026-10-20",
)
_F08 = EvidenceRef(
    source_id="F08",
    url="https://www.asus.com/us/motherboards-components/graphics-cards/tuf-gaming/tuf-rtx5070-o12g-gaming/techspec/",
    locator="Dimensions: 329 x 140 x 62,5 mm; primer eje longitudinal",
    consulted_on="2026-10-20",
)
_F09 = EvidenceRef(
    source_id="F09",
    url="https://www.corsair.com/us/en/p/psu/cp-9020277-na/cx-series-cx550-550-watt-80-plus-bronze-atx-power-supply-cp-9020277-na",
    locator="Cable Table CP-9020277/RPS0127: un ramal PCIe con dos 6+2, sin nativo 16-pin",
    consulted_on="2026-10-20",
)
_F13 = EvidenceRef(
    source_id="F13",
    url="https://support.fractal-design.com/support/solutions/articles/4000119088-will-my-graphics-card-fit-in-the-meshify-c-or-meshify-c-mini-with-a-radiator-installed-in-the-front-",
    locator="FAQ: Meshify C admite 315 mm con ventiladores delanteros; restar radiador si hay",
    consulted_on="2026-10-20",
)
_F19 = EvidenceRef(
    source_id="F19",
    url="https://rog.asus.com/uk/support/faq/1047391/",
    locator="II/b: un cable PCIe independiente por entrada del adaptador, no ambas puntas",
    consulted_on="2026-10-20",
)


@dataclass(frozen=True)
class Example:
    example_id: str
    kind: Literal["documentary", "derived_omission"]
    description: str
    configuration: ResolvedConfiguration


def demo_examples() -> tuple[Example, ...]:
    """Datos recién construidos en cada llamada; el evaluador ignora sus nombres."""
    s08 = ResolvedConfiguration(
        pc_revision="S08-documentary-25.1",
        data_revision=DATA_REVISION,
        conditions=("Extracto parcial de escenario documental, no PC física medida",),
        parts=(
            PartInstance(
                instance_id="gpu",
                part_id="P15",
                category="gpu",
                model="PRIME-RTX5070-O12G",
            ),
            PartInstance(
                instance_id="psu",
                part_id="P07",
                category="psu",
                model="CX550 2023 CP-9020277/RPS0127",
            ),
        ),
        adapter_route=AdapterRoute(
            gpu_instance_id="gpu",
            psu_instance_id="psu",
            mode="pcie8_adapter",
            adapter=AdapterSpec(
                input_ids=("adapter-8pin-1", "adapter-8pin-2"),
                independent_cables=True,
                evidence=(_F07, _F19),
            ),
            inventory=CableInventory(
                complete=True,
                evidence=(_F09,),
                connectors=tuple(
                    Connector(
                        connector_id=tip,
                        kind="pcie6+2",
                        branch_id="CX-PCI1",
                        availability="free",
                    )
                    for tip in ("CX-PCI1.a", "CX-PCI1.b")
                ),
            ),
            assignments=(
                Assignment(input_id="adapter-8pin-1", connector_id="CX-PCI1.a"),
                Assignment(input_id="adapter-8pin-2", connector_id="CX-PCI1.b"),
            ),
            conditions=(
                "P06 retirada; GPU P15 instalada como entrada ya resuelta de S08",
                "Solo cables originales CX550; ambos conectores PCIe libres",
                "Sin otra ruta válida disponible en el escenario; no añadir adaptadores/cables",
            ),
            alternatives_excluded=True,
            alternatives_evidence=(_F09,),
        ),
    )
    s10 = ResolvedConfiguration(
        pc_revision="S10-documentary-25.1",
        data_revision=DATA_REVISION,
        conditions=("Extracto parcial de escenario documental, no PC física medida",),
        parts=(
            PartInstance(
                instance_id="gpu",
                part_id="P16",
                category="gpu",
                model="TUF-RTX5070-O12G-GAMING",
            ),
            PartInstance(
                instance_id="case",
                part_id="P10",
                category="case",
                model="Meshify C Black Solid FD-CA-MESH-C-BKO",
            ),
        ),
        gpu_length=GpuLengthInput(
            gpu_instance_id="gpu",
            case_instance_id="case",
            mounting_id="horizontal_front_fans_no_radiator",
            gpu_length=Measurement(value=329, evidence=(_F08,)),
            effective_limit=EffectiveLimit(
                value=315,
                evidence=(_F13,),
                mounting_id="horizontal_front_fans_no_radiator",
                conditions=(
                    "GPU horizontal, ventiladores delanteros instalados, sin radiador frontal",
                ),
            ),
        ),
    )
    omitted = s10.model_dump()
    omitted["gpu_length"]["gpu_length"]["value"] = None
    omitted["pc_revision"] = "D01-derived-S10-omission-28.1"
    omitted["conditions"] += (
        "Largo GPU omitido intencionalmente; no representa otra PC real",
    )
    return (
        Example(
            "S08",
            "documentary",
            "P15 + adaptador incluido y P07: insuficiencia de ramales",
            s08,
        ),
        Example(
            "S10", "documentary", "P16 329 mm frente a P10 315 mm con front fans", s10
        ),
        Example(
            "D01-S10-omitted-length",
            "derived_omission",
            "Derivado de S10 con largo GPU omitido; sin fallos conocidos en datos restantes",
            ResolvedConfiguration.model_validate(omitted),
        ),
    )
