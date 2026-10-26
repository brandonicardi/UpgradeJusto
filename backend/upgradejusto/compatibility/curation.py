"""Extracto D histórico HARDWARE_DEMO F01–F04; sin red ni contexto instalado."""

from .models import CpuSupportRow, EvidenceRef, TextObservation

EXTRACT_REVISION = "hardware-demo-25.1/r01-extract-32d.1"
BOARD_MODEL = "ASRock B550M Pro4 original, no Pro SE"
CPU_MODELS = {
    "P01": "AMD Ryzen 5 5600 100-100000927BOX",
    "P02": "AMD Ryzen 7 5700X 100-100000926WOF",
}
REVISION = "no diferenciada por fabricante para P03 original"


def ref(source_id, url, locator):
    return EvidenceRef(
        source_id=source_id, url=url, locator=locator, consulted_on="2026-10-20"
    )


BOARD_REF = ref(
    "F03",
    "https://www.asrock.com/mb/AMD/B550M%20Pro4/index.us.asp",
    "Specifications; P03 original, no Pro SE; HARDWARE_DEMO F03 histórico",
)
SUPPORT_ROWS = tuple(
    CpuSupportRow(
        cpu_model=model,
        motherboard_model=BOARD_MODEL,
        applicable_revision=REVISION,
        minimum_bios="P2.30",
        earlier_bios=("P1.20",),
        evidence=(
            ref(
                "F04",
                "https://www.asrock.com/support/cpu.asp?s=AM4&u=695"
                if part == "P01"
                else "https://www.asrock.com/support/cpu.us.asp?s=AM4&u=694",
                "Fila P03 histórico mínimo P2.30; relación P1.20 anterior acotada por CU05 sección9",
            ),
        ),
    )
    for part, model in CPU_MODELS.items()
)


def documented(value, evidence):
    return TextObservation(value=value, evidence=tuple(evidence))
