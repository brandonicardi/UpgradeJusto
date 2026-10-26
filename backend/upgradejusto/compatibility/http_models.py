"""Entrada/salida D: no recibe snapshots resueltos ni resultados del cliente."""

from typing import Annotated

from pydantic import (
    Field,
    StrictInt,
    StrictStr,
    field_validator,
    model_serializer,
    model_validator,
)

from upgradejusto.catalog.models import Category
from upgradejusto.pcs.models import ComponentGroup, InputModel, PCContext

from .models import EvaluationResult


class EvaluateRequest(InputModel):
    expected_pc_revision: Annotated[StrictInt, Field(ge=1)]


class Candidate(InputModel):
    component_id: StrictStr
    quantity: Annotated[StrictInt, Field(ge=1, le=8)]


class CandidateContext(InputModel):
    bios_version: StrictStr | None

    @field_validator("bios_version")
    @classmethod
    def declared_bios(cls, value):
        if value is None:
            return None
        value = value.strip()
        if not 1 <= len(value) <= 100 or "\0" in value:
            raise ValueError("Invalid declared BIOS")
        return value


class Replacement(InputModel):
    category: Category
    candidates: Annotated[list[Candidate], Field(min_length=1, max_length=8)]
    candidate_context: CandidateContext | None = None

    @model_serializer(mode="wrap")
    def serialize_selection(self, handler):
        # Ausente no es null explícito: conservar la omisión en snapshots/roundtrip.
        # No excluir otros null: BIOS desconocida y totales incompletos son datos.
        data = handler(self)
        if self.candidate_context is None:
            data.pop("candidate_context", None)
        return data

    @model_validator(mode="after")
    def selection(self):
        if len({c.component_id for c in self.candidates}) != len(self.candidates):
            raise ValueError("Duplicate candidate")
        if self.category == "ram":
            if sum(c.quantity for c in self.candidates) > 8:
                raise ValueError("RAM total exceeds 8 modules")
        elif len(self.candidates) != 1 or self.candidates[0].quantity != 1:
            raise ValueError("Non-RAM requires one candidate of quantity 1")
        if "candidate_context" in self.model_fields_set and (
            self.category != "motherboard" or self.candidate_context is None
        ):
            raise ValueError("Candidate context requires motherboard and an object")
        return self


class SimulateRequest(Replacement, EvaluateRequest):
    pass


class EvaluatedConfiguration(InputModel):
    components: list[ComponentGroup]
    context: PCContext


class EvaluationResponse(EvaluationResult):
    evaluated_configuration: EvaluatedConfiguration
