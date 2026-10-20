"""Contrato interno estricto para datos ya resueltos; no resuelve identidad."""

from datetime import date
from typing import Annotated, Literal, Self
from urllib.parse import urlsplit

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

Text = Annotated[str, StringConstraints(min_length=1, pattern=r"\S")]
Family = Literal["R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10"]
State = Literal["pass", "fail", "unknown", "not_applicable", "not_implemented"]
EvidenceStatus = Literal["documented", "unknown", "conflict"]


def unique(values: tuple[str, ...], label: str) -> None:
    if len(values) != len(set(values)):
        raise ValueError(f"{label}: IDs duplicados")


class DomainModel(BaseModel):
    model_config = ConfigDict(
        strict=True,
        frozen=True,
        extra="forbid",
        allow_inf_nan=False,
        revalidate_instances="always",
    )


class EvidenceRef(DomainModel):
    source_id: Text
    url: Text
    locator: Text
    consulted_on: Text

    @field_validator("url")
    @classmethod
    def public_url(cls, value: str) -> str:
        parsed = urlsplit(value)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("Se requiere URL de procedencia HTTP(S)")
        if parsed.username or parsed.password:
            raise ValueError("La referencia no admite credenciales")
        return value

    @field_validator("consulted_on")
    @classmethod
    def valid_date(cls, value: str) -> str:
        date.fromisoformat(value)
        return value


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
    category: Literal["gpu", "case", "psu", "other"]
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


class ResolvedConfiguration(DomainModel):
    pc_revision: Text
    data_revision: Text
    parts: tuple[PartInstance, ...]
    conditions: tuple[Text, ...] = ()
    gpu_length: GpuLengthInput | None = None
    adapter_route: AdapterRoute | None = None

    @model_validator(mode="after")
    def valid_instances(self) -> Self:
        unique(tuple(p.instance_id for p in self.parts), "parts.instance_id")
        instances = {p.instance_id: p for p in self.parts}
        references = []
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
        for instance_id, category in references:
            if (
                instance_id not in instances
                or instances[instance_id].category != category
            ):
                raise ValueError(
                    f"Instancia/categoría inválida: {instance_id}/{category}"
                )
            if instances[instance_id].quantity != 1:
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
