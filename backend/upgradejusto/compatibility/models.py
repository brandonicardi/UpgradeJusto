"""Contrato interno estricto para datos ya resueltos; no resuelve identidad."""

from typing import Annotated, Literal, Self

from pydantic import (
    Field,
    field_validator,
    model_serializer,
    model_validator,
)

from .basic_contract import AdditionalCheck, BasicScope
from .observations import DomainModel, EvidenceRef, EvidenceStatus, Text
from .resource_models import ResourceInputs

Family = Literal[
    "R01",
    "R02",
    "R03",
    "R04",
    "R05",
    "R06",
    "R07",
    "R08",
    "R09",
    "R10",
    "B01",
    "B02",
    "B03",
    "B04",
    "B05",
    "B06",
    "B07",
    "B08",
    "B09",
]
State = Literal["pass", "fail", "unknown", "not_applicable", "not_implemented"]


def unique(values: tuple[str, ...], label: str) -> None:
    if len(values) != len(set(values)):
        raise ValueError(f"{label}: IDs duplicados")


class Measurement(DomainModel):
    value: Annotated[float, Field(gt=0)] | None = None
    unit: Literal["mm"] = "mm"
    axis: Literal["longitudinal"] = "longitudinal"
    status: EvidenceStatus = "documented"
    evidence: tuple[EvidenceRef, ...] = ()

    @field_validator("value", mode="before")
    @classmethod
    def real_number_only(cls, value):
        if value is not None and type(value) not in (int, float):
            raise ValueError("Medición: solo int/float reales, no bool o strings")
        return value


class EffectiveLimit(Measurement):
    mounting_id: Text | None = None
    conditions: tuple[Text, ...] = ()


class PartInstance(DomainModel):
    instance_id: Text
    part_id: Text
    category: Literal["cpu", "motherboard", "ram", "gpu", "case", "psu", "other"]
    model: Text | None = None
    quantity: Annotated[int, Field(gt=0)] = 1


class GpuLengthInput(DomainModel):
    gpu_instance_id: Text
    case_instance_id: Text
    mounting_id: Text | None = None
    gpu_length: Measurement | None = None
    effective_limit: EffectiveLimit | None = None


class Connector(DomainModel):
    connector_id: Text
    kind: Literal["pcie6+2", "pcie8", "other"]
    branch_id: Text | None = None
    availability: Literal["free", "occupied", "unknown"] = "unknown"
    occupied_by: Text | None = None

    @model_validator(mode="after")
    def consistent_occupation(self) -> Self:
        if (self.availability == "occupied") != (self.occupied_by is not None):
            raise ValueError(
                "occupied requiere carga; free/unknown no admiten carga asignada"
            )
        return self


class CableInventory(DomainModel):
    """Inventario de candidatos para esta ruta, no de todos los conectores de la PSU."""

    connectors: tuple[Connector, ...] | None = None
    complete: bool | None = None
    evidence: tuple[EvidenceRef, ...] = ()
    status: EvidenceStatus = "documented"

    @model_validator(mode="after")
    def distinct_connectors(self) -> Self:
        if self.connectors is not None:
            unique(tuple(c.connector_id for c in self.connectors), "connectors")
        return self


class AdapterSpec(DomainModel):
    input_ids: Annotated[tuple[Text, ...], Field(min_length=1)]
    input_kind: Literal["pcie8", "other"] = "pcie8"
    independent_cables: bool | None = None
    evidence: tuple[EvidenceRef, ...] = ()
    status: EvidenceStatus = "documented"

    @model_validator(mode="after")
    def distinct_inputs(self) -> Self:
        unique(self.input_ids, "adapter.input_ids")
        return self


class Assignment(DomainModel):
    input_id: Text
    connector_id: Text


class AdapterRoute(DomainModel):
    gpu_instance_id: Text
    psu_instance_id: Text
    mode: Literal["pcie8_adapter", "native", "other"]
    adapter: AdapterSpec | None = None
    inventory: CableInventory | None = None
    assignments: tuple[Assignment, ...] | None = None
    conditions: tuple[Text, ...] = ()
    status: EvidenceStatus = "documented"
    alternatives_excluded: bool | None = None
    alternatives_evidence: tuple[EvidenceRef, ...] = ()

    @model_validator(mode="after")
    def distinct_assignments(self) -> Self:
        if self.assignments is not None:
            unique(tuple(a.input_id for a in self.assignments), "assignments.input_id")
            unique(
                tuple(a.connector_id for a in self.assignments),
                "assignments.connector_id",
            )
            if self.adapter is not None:
                if any(
                    a.input_id not in self.adapter.input_ids for a in self.assignments
                ):
                    raise ValueError("Asignación referencia entrada inexistente")
            if self.inventory is not None and self.inventory.connectors is not None:
                ids = {c.connector_id for c in self.inventory.connectors}
                if any(a.connector_id not in ids for a in self.assignments):
                    raise ValueError("Asignación referencia conector no inventariado")
        return self


class TextObservation(DomainModel):
    value: Text | None = None
    status: EvidenceStatus = "documented"
    evidence: tuple[EvidenceRef, ...] = ()


class CpuSupportRow(DomainModel):
    cpu_model: Text
    motherboard_model: Text
    applicable_revision: Text
    minimum_bios: Text
    # Relación explícita anterior→mínimo, jamás orden genérico de versiones.
    earlier_bios: tuple[Text, ...] = ()
    evidence: tuple[EvidenceRef, ...] = ()


class CpuSupportInput(DomainModel):
    cpu_instance_id: Text
    motherboard_instance_id: Text
    cpu_socket: TextObservation | None = None
    motherboard_socket: TextObservation | None = None
    applicable_revision: TextObservation | None = None
    support_rows: tuple[CpuSupportRow, ...] = ()
    installed_bios: Text | None = None


class RamSpec(DomainModel):
    """Curated specifications, not an installed population or an approval."""

    instance_id: Text
    generation: Literal["DDR4", "DDR5"] | None = None
    module_type: Literal["UDIMM", "SODIMM"] | None = None
    ecc: bool | None = None
    buffered: bool | None = None
    capacity_gb: Annotated[int, Field(gt=0)] | None = None
    slots: Annotated[int, Field(gt=0)] | None = None
    max_total_gb: Annotated[int, Field(gt=0)] | None = None
    max_module_gb: Annotated[int, Field(gt=0)] | None = None
    jedec_mts: Annotated[int, Field(gt=0)] | None = None
    voltage_mv: Annotated[int, Field(gt=0)] | None = None
    rank: Literal["1Rx8", "2Rx8"] | None = None
    supported_ranks: tuple[Literal["1Rx8", "2Rx8"], ...] | None = None
    status: EvidenceStatus = "documented"
    evidence: tuple[EvidenceRef, ...] = ()


class RamInput(DomainModel):
    cpu: RamSpec | None = None
    motherboard: RamSpec | None = None
    modules: tuple[RamSpec, ...] = ()
    # Installed slots/rate are never inferred from module specifications or notes.
    installed_slots: tuple[Text, ...] | None = None
    supported_populations: tuple[tuple[Text, ...], ...] | None = None
    operating_mts: Annotated[int, Field(gt=0)] | None = None
    operating_voltage_mv: Annotated[int, Field(gt=0)] | None = None
    regime_evidence: tuple[EvidenceRef, ...] = ()


class MountingSpec(DomainModel):
    instance_id: Text
    form_factor: Literal["ATX", "mATX", "ITX", "SFX"] | None = None
    board_formats: tuple[Literal["ATX", "mATX", "ITX"], ...] | None = None
    psu_formats: tuple[Literal["ATX", "SFX"], ...] | None = None
    length_mm: Annotated[int, Field(gt=0)] | None = None
    nominal_psu_limit_mm: Annotated[int, Field(gt=0)] | None = None
    status: EvidenceStatus = "documented"
    evidence: tuple[EvidenceRef, ...] = ()


class MountingInput(DomainModel):
    motherboard: MountingSpec | None = None
    psu: MountingSpec | None = None
    case: MountingSpec | None = None
    # Effective space includes plugs/cables/cages, not the external case length.
    effective_psu_limit: EffectiveLimit | None = None
    mounting_id: Text | None = None
    required_standoffs: tuple[Text, ...] | None = None
    installed_standoffs: tuple[Text, ...] | None = None
    mounting_evidence: tuple[EvidenceRef, ...] = ()


class ResolvedConfiguration(DomainModel):
    pc_revision: Text
    data_revision: Text
    parts: tuple[PartInstance, ...]
    conditions: tuple[Text, ...] = ()
    gpu_length: GpuLengthInput | None = None
    adapter_route: AdapterRoute | None = None
    cpu_support: CpuSupportInput | None = None
    ram: RamInput | None = None
    mounting: MountingInput | None = None
    resources: ResourceInputs | None = None

    @model_validator(mode="after")
    def valid_instances(self) -> Self:
        unique(tuple(p.instance_id for p in self.parts), "parts.instance_id")
        instances = {p.instance_id: p for p in self.parts}
        references = []
        if self.resources is not None:
            references.extend(self.resources.part_references())
        if self.ram is not None:
            for spec, category in (
                (self.ram.cpu, "cpu"),
                (self.ram.motherboard, "motherboard"),
                *((module, "ram") for module in self.ram.modules),
            ):
                if spec is not None:
                    references.append((spec.instance_id, category))
            unique(tuple(m.instance_id for m in self.ram.modules), "ram.modules")
        if self.mounting is not None:
            for category in ("motherboard", "psu", "case"):
                spec = getattr(self.mounting, category)
                if spec is not None:
                    references.append((spec.instance_id, category))
        if self.cpu_support is not None:
            references.extend(
                (
                    (self.cpu_support.cpu_instance_id, "cpu"),
                    (self.cpu_support.motherboard_instance_id, "motherboard"),
                )
            )
        if self.gpu_length is not None:
            references.extend(
                (
                    (self.gpu_length.gpu_instance_id, "gpu"),
                    (self.gpu_length.case_instance_id, "case"),
                )
            )
        if self.adapter_route is not None:
            references.extend(
                (
                    (self.adapter_route.gpu_instance_id, "gpu"),
                    (self.adapter_route.psu_instance_id, "psu"),
                )
            )
            if self.resources is not None and self.resources.power is not None:
                used = {a.source_id for a in self.resources.power.assignments or ()}
                adapter_used = {
                    a.connector_id for a in self.adapter_route.assignments or ()
                }
                if used & adapter_used:
                    raise ValueError(
                        "Conector reutilizado por rutas eléctricas distintas"
                    )
                loads = (
                    *self.resources.power.required_loads,
                    *(self.resources.power.additional_loads or ()),
                )
                if {load.resource_id for load in loads} & {
                    assignment.input_id
                    for assignment in self.adapter_route.assignments or ()
                }:
                    raise ValueError(
                        "Entrada reutilizada por rutas eléctricas distintas"
                    )
            if self.resources is not None and self.adapter_route.inventory is not None:
                inventory = self.adapter_route.inventory
                observations = self.resources.inventory_observations()
                sources = (
                    {s.resource_id: s for s in self.resources.power.sources}
                    if self.resources.power is not None
                    else {}
                )
                non_connectors = set()
                if self.resources.pcie is not None:
                    non_connectors.update(
                        s.resource_id for s in self.resources.pcie.slots
                    )
                if self.resources.storage is not None:
                    non_connectors.update(
                        p.resource_id for p in self.resources.storage.ports
                    )
                if self.resources.front is not None:
                    front = self.resources.front
                    non_connectors.update(
                        p.resource_id
                        for p in (
                            *front.headers,
                            *front.cables,
                            *(front.adapters or ()),
                        )
                    )
                if self.resources.power is not None:
                    power = self.resources.power
                    non_connectors.update(
                        p.resource_id
                        for p in (
                            *power.required_loads,
                            *(power.additional_loads or ()),
                            *(power.rails or ()),
                        )
                    )
                for connector in inventory.connectors or ():
                    if connector.connector_id in non_connectors:
                        raise ValueError("Tipo global de conector incoherente")
                    status = (
                        "unknown"
                        if connector.availability == "unknown"
                        else "documented"
                    )
                    signature = (
                        inventory.status,
                        bool(inventory.evidence),
                        status,
                        bool(inventory.evidence),
                        connector.occupied_by,
                    )
                    if connector.connector_id in observations:
                        if observations[connector.connector_id] != signature:
                            raise ValueError(
                                "Inventario adaptador/recursos contradictorio"
                            )
                    source = sources.get(connector.connector_id)
                    if source is not None and (
                        connector.kind not in ("pcie8", "pcie6+2")
                        or source.kind != "PCIe8"
                        or source.owner_instance_id
                        != self.adapter_route.psu_instance_id
                    ):
                        raise ValueError("Tipo/propietario de conector incoherente")
        for instance_id, category in references:
            if (
                instance_id not in instances
                or instances[instance_id].category != category
            ):
                raise ValueError(
                    f"Instancia/categoría inválida: {instance_id}/{category}"
                )
            if category != "ram" and instances[instance_id].quantity != 1:
                raise ValueError(
                    "La ruta evaluada requiere una instancia física por ID"
                )
        return self


class Fact(DomainModel):
    name: Text
    value: str | int | float | bool | None
    unit: Text | None = None


class RuleSpec(DomainModel):
    rule_id: Text
    family: Family

    @model_validator(mode="after")
    def id_matches_family(self) -> Self:
        if self.rule_id.split(".", 1)[0] != self.family:
            raise ValueError("ID de subregla no corresponde a su familia")
        return self


class RuleResult(RuleSpec):
    state: State
    facts: tuple[Fact, ...] = ()
    evidence: tuple[EvidenceRef, ...] = ()
    conditions: tuple[Text, ...] = ()
    missing_fields: tuple[Text, ...] = ()

    @model_validator(mode="after")
    def supported_state(self) -> Self:
        if self.state in ("pass", "fail", "not_applicable") and not self.evidence:
            raise ValueError("Resultado concluyente sin evidencia")
        if self.state == "not_applicable" and not self.conditions:
            raise ValueError("not_applicable requiere justificación")
        if self.state in ("unknown", "not_implemented") and not self.missing_fields:
            raise ValueError("Faltante/implementación pendiente debe ser identificable")
        return self


class Coverage(DomainModel):
    required: tuple[Text, ...]
    implemented: tuple[Text, ...]
    evaluated: tuple[Text, ...]
    passed: tuple[Text, ...]
    failed: tuple[Text, ...]
    unknown: tuple[Text, ...]
    not_applicable: tuple[Text, ...]
    not_implemented: tuple[Text, ...]
    complete: bool


class EvaluationResult(DomainModel):
    verdict: Literal["compatible", "incompatible", "requiere_verificacion"]
    rule_results: tuple[RuleResult, ...]
    missing_fields: tuple[Text, ...]
    rules_version: Text
    data_revision: Text
    pc_revision: Text
    coverage: Coverage
    scope: BasicScope | None = None
    additional_checks: tuple[AdditionalCheck, ...] = ()
    warnings: tuple[Text, ...] = ()

    @model_validator(mode="after")
    def consistent_scope_inventory(self):
        basic = tuple(f"B{i:02}" for i in range(1, 8))
        identities = tuple(result.rule_id for result in self.rule_results)
        if self.scope is not None:
            if (
                self.rules_version != "cu05-basic-stock-engine-1"
                or identities != basic
                or self.coverage.required != basic
                or any(result.family != result.rule_id for result in self.rule_results)
            ):
                raise ValueError(
                    "Basic scope requires its own complete versioned inventory"
                )

            def ids(state):
                return tuple(
                    result.rule_id
                    for result in self.rule_results
                    if result.state == state
                )

            expected_missing = tuple(
                dict.fromkeys(
                    path
                    for result in self.rule_results
                    for path in result.missing_fields
                )
            )
            complete = not expected_missing and all(
                result.state in ("pass", "fail") for result in self.rule_results
            )
            verdict = (
                "incompatible"
                if ids("fail")
                or any(check.status == "fail" for check in self.additional_checks)
                else "compatible"
                if complete
                else "requiere_verificacion"
            )
            if (
                self.missing_fields != expected_missing
                or self.coverage.complete != complete
                or self.verdict != verdict
                or self.coverage.passed != ids("pass")
                or self.coverage.failed != ids("fail")
                or self.coverage.unknown != ids("unknown")
                or self.coverage.not_applicable
                or self.coverage.not_implemented
                or self.coverage.evaluated != basic
                or self.coverage.implemented != basic
            ):
                raise ValueError("Inconsistent basic verdict or coverage")
        elif any(identity.startswith("B") for identity in identities):
            raise ValueError("Basic inventory cannot be labeled legacy")
        return self

    @model_serializer(mode="wrap")
    def preserve_legacy_serialization(self, handler):
        data = handler(self)
        if self.scope is None:
            for key in ("scope", "additional_checks", "warnings"):
                data.pop(key, None)
        return data
