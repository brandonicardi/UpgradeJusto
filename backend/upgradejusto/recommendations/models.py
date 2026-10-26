"""Contrato F estricto; importes JSON como strings, nunca float."""

import re
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StrictStr, field_validator, model_validator

from upgradejusto.compatibility.http_models import (
    EvaluateRequest,
    EvaluationResponse,
    Replacement,
)
from upgradejusto.pcs.models import InputModel

Objective = Literal["general", "gaming", "productivity"]
Replacements = Annotated[list[Replacement], Field(min_length=1, max_length=6)]


def unique_categories(replacements):
    if len({r.category for r in replacements}) != len(replacements):
        raise ValueError("Duplicate replacement category")
    return replacements


class Alternative(InputModel):
    key: Annotated[StrictStr, Field(pattern=r"^[A-Za-z0-9_-]{1,40}$")]
    replacements: Replacements

    _categories = field_validator("replacements")(unique_categories)

    @field_validator("key")
    @classmethod
    def exact_key(cls, value):
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", value):
            raise ValueError("Invalid alternative key")
        return value


class PreviewRequest(EvaluateRequest):
    objective: Objective
    budget_ars: StrictStr
    alternatives: Annotated[list[Alternative], Field(min_length=1, max_length=20)]

    @field_validator("budget_ars")
    @classmethod
    def budget(cls, value):
        if not re.fullmatch(r"(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,2})?", value):
            raise ValueError("Invalid ARS budget")
        if Decimal(value) <= 0:
            raise ValueError("Budget must be positive")
        return value

    @model_validator(mode="after")
    def keys(self):
        if len({a.key for a in self.alternatives}) != len(self.alternatives):
            raise ValueError("Duplicate alternative key")
        return self


class CostLine(InputModel):
    component_id: str
    quantity: int
    unit_amount: str
    currency: Literal["ARS"] = "ARS"
    date: str
    source: str


class Cost(InputModel):
    total_ars: str | None
    known_subtotal_ars: str
    within_budget: bool | None
    lines: list[CostLine]
    missing_fields: list[str]


class Benefit(InputModel):
    status: Literal["supported", "unknown", "not_an_improvement"]
    evidence: list[dict[str, str]]


class PreviewItem(InputModel):
    key: str
    replacements: list[Replacement]
    evaluation: EvaluationResponse
    cost: Cost
    benefit: Benefit
    status: Literal["recommended", "requires_verification", "rejected"]
    missing_fields: list[str]


class PreviewResponse(InputModel):
    pc_id: UUID
    pc_revision: str
    objective: Objective
    budget_ars: str
    currency: Literal["ARS"] = "ARS"
    items: list[PreviewItem]
    limitations: list[str]
