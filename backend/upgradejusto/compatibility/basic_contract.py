"""Versioned stock scope. These are server constants, never request options."""

from typing import Literal

from pydantic import model_validator

from .observations import DomainModel, EvidenceRef, Text

SCOPE_ID = "cu05-basic-stock-1"
POLICY_VERSION = "basic-stock-policy-1"
INVENTORY_VERSION = "basic-stock-inventory-1"
RULES_VERSION = "cu05-basic-stock-engine-1"
INVENTORY_REASON = (
    "Alcance básico stock autorizado25/10; inventario separado del legacy de12 "
    "controles. No certifica geometría avanzada ni comportamiento térmico/eléctrico."
)


class BasicScope(DomainModel):
    id: Literal["cu05-basic-stock-1"] = SCOPE_ID
    policy_version: Literal["basic-stock-policy-1"] = POLICY_VERSION
    inventory_version: Literal["basic-stock-inventory-1"] = INVENTORY_VERSION
    label: Text = "Compatibilidad básica stock; no certificación física"
    operating_regime: Literal["stock_no_oc"] = "stock_no_oc"
    inventory_reason: Text = INVENTORY_REASON
    includes: tuple[Text, ...] = (
        "CPU exacta/socket/BIOS declarada y relación documental",
        "RAM nativa JEDEC: tipo, formato, cantidades y límites documentados",
        "GPU: interfaz, longitud nominal y alimentación",
        "PSU: recomendación de sistema completo aplicable y conectores",
        "Formatos y límites nominales de placa, PSU y gabinete",
    )
    excludes: tuple[Text, ...] = (
        "Geometría avanzada, curvatura de cables e interferencias milimétricas",
        "Medición de transitorios y certificación térmica/eléctrica exhaustiva",
        "Mapa instalado de almacenamiento, puertos y conservación de funciones frontales",
    )
    assumptions: tuple[Text, ...] = (
        "Sin OC/PBO, una GPU, un NVMe y hasta cuatro ventiladores; sin bombas, otras tarjetas ni cargas USB de alta demanda",
        "Cables propios del kit de la PSU; no mezclar cables modulares",
        "No se afirma instalación física ni estabilidad ensayada",
    )


class AdditionalCheck(DomainModel):
    id: Text
    status: Literal["outside_scope", "unknown", "pass", "fail"]
    reason: Text
    evidence_refs: tuple[EvidenceRef, ...] = ()

    @model_validator(mode="after")
    def documented_conclusion(self):
        if self.status in ("pass", "fail") and not self.evidence_refs:
            raise ValueError("Additional conclusive check requires evidence")
        return self


def scope_notices():
    return (
        AdditionalCheck(
            id="advanced_geometry",
            status="outside_scope",
            reason="No se certifican interferencias ni curvas/rutas de cables; se conservan límites nominales.",
        ),
        AdditionalCheck(
            id="electrical_thermal_certification",
            status="outside_scope",
            reason="Selección stock no equivale a medición de transitorios ni certificación térmica/eléctrica.",
        ),
        AdditionalCheck(
            id="stock_cooling",
            status="unknown",
            reason="Requiere refrigeración apta stock; seis categorías no registran cooler ni prueban instalación o temperatura.",
        ),
        AdditionalCheck(
            id="original_psu_cables",
            status="unknown",
            reason="Usar exclusivamente cables propios del kit de esta PSU; no se verifica instalación ni mezcla modular.",
        ),
    )
