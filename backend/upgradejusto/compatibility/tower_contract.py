"""Internal, publication-owned tower evidence; never a request-body contract."""

from dataclasses import dataclass, field
from typing import Literal

from .basic_contract import AdditionalCheck
from .basic_specs import BasicSpecs
from .models import Coverage, CpuSupportInput, Fact
from .observations import DomainModel, EvidenceRef, Text

REQUIRED = tuple(f"T{i:02}" for i in range(1, 13))
RULES_VERSION = "cu05-tower-stock-engine-1"
# New evaluations use the essential policy; stored stock snapshots keep their version.
ESSENTIAL_REQUIRED = (*REQUIRED[:8], "T11")
ESSENTIAL_RULES_VERSION = "cu05-tower-essential-engine-1"


class TowerScope(DomainModel):
    id: Literal["cu05-tower-stock-1"] = "cu05-tower-stock-1"
    policy_version: Literal["tower-stock-policy-1"] = "tower-stock-policy-1"
    inventory_version: Literal["tower-stock-inventory-1"] = "tower-stock-inventory-1"
    label: Text = "Torre stock: asignación nominal, no certificación física"
    operating_regime: Literal["stock_no_oc"] = "stock_no_oc"
    excludes: tuple[Text, ...] = (
        "Geometría avanzada e interferencias milimétricas y curvas de cables",
        "Transitorios medidos y certificación térmica/eléctrica exhaustiva",
        "Conservación de funciones frontales y periféricos",
    )


class EssentialScope(DomainModel):
    id: Literal["cu05-tower-essential-1"] = "cu05-tower-essential-1"
    policy_version: Literal["tower-essential-policy-1"] = "tower-essential-policy-1"
    inventory_version: Literal["tower-essential-inventory-1"] = (
        "tower-essential-inventory-1"
    )
    label: Text = "Comprobaciones esenciales de una PC de casa, no certificación física"
    operating_regime: Literal["stock_no_oc"] = "stock_no_oc"
    excludes: tuple[Text, ...] = (
        "La refrigeración y los ventiladores no se evalúan todavía",
        "Velocidades de memoria, ECC y memoria de servidor",
        "Medidas finas de instalación, cables y consumo medido",
    )


class TowerRuleResult(DomainModel):
    rule_id: Text
    family: Text
    state: Literal["pass", "fail", "unknown"]
    facts: tuple[Fact, ...] = ()
    evidence: tuple[EvidenceRef, ...] = ()
    conditions: tuple[Text, ...] = ()
    missing_fields: tuple[Text, ...] = ()


class TowerEvaluationResult(DomainModel):
    verdict: Literal["compatible", "incompatible", "requiere_verificacion"]
    rule_results: tuple[TowerRuleResult, ...]
    missing_fields: tuple[Text, ...]
    rules_version: Literal[
        "cu05-tower-stock-engine-1", "cu05-tower-essential-engine-1"
    ] = RULES_VERSION
    data_revision: Text
    pc_revision: Text
    scope: TowerScope | EssentialScope = TowerScope()
    coverage: Coverage
    additional_checks: tuple[AdditionalCheck, ...]
    warnings: tuple[Text, ...]


@dataclass(frozen=True)
class TowerComponentEvidence:
    """Exact catalog variant and publication; fields use BasicSpecs provenance."""

    category: str
    model: str
    data_revision: str
    specs: BasicSpecs


@dataclass(frozen=True)
class TowerTechnicalEvidenceDTO:
    data_revision: str
    components: dict[str, TowerComponentEvidence] = field(default_factory=dict)
    # Instance IDs must be tower line UUID strings; BIOS always comes from tower.
    cpu_support: CpuSupportInput | None = None


class NominalResource(DomainModel):
    """A single documented slot/header/bay; no implicit splitters or hubs."""

    resource_id: Text
    kind: Text
    accepts: tuple[Text, ...]
    voltage_mv: int | None = None
    max_current_ma: int | None = None
    # Documented pair exclusions, not an inference from chipset or model name.
    excludes: tuple[Text, ...] = ()
    group: Text | None = None
    cost: int = 1


class SharedLimit(DomainModel):
    group: Text
    capacity: int
