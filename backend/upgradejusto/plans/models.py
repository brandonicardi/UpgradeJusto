"""Contrato G: entrada estricta y snapshots congelados al persistir."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StrictInt, StrictStr, field_validator

from upgradejusto.compatibility.http_models import (
    EvaluatedConfiguration,
    EvaluationResponse,
)
from upgradejusto.pcs.models import InputModel
from upgradejusto.recommendations.models import (
    Benefit,
    Cost,
    Objective,
    PreviewRequest,
    Replacements,
    unique_categories,
)


def clean_name(value):
    value = value.strip()
    if not 1 <= len(value) <= 100 or "\0" in value:
        raise ValueError("Invalid name")
    return value


class Stage(InputModel):
    name: StrictStr
    replacements: Replacements

    _name = field_validator("name")(clean_name)
    _categories = field_validator("replacements")(unique_categories)


class PlanCreate(InputModel):
    name: StrictStr
    pc_id: UUID
    expected_pc_revision: Annotated[StrictInt, Field(ge=1)]
    objective: Objective
    budget_ars: StrictStr
    stages: Annotated[list[Stage], Field(min_length=1, max_length=12)]

    _name = field_validator("name")(clean_name)

    @field_validator("budget_ars")
    @classmethod
    def budget(cls, value):
        return PreviewRequest.budget(value)


class PlanUpdate(PlanCreate):
    revision: Annotated[StrictInt, Field(ge=1)]


class StageResult(Stage):
    position: int
    evaluated_configuration: EvaluatedConfiguration
    evaluation: EvaluationResponse
    cost: Cost
    cumulative_cost: Cost
    benefit: Benefit


class PlanSnapshot(InputModel):
    pc_revision: str
    base_snapshot: EvaluatedConfiguration
    objective: Objective
    budget_ars: str
    currency: Literal["ARS"] = "ARS"
    stages: list[StageResult]
    status: Literal["ready", "blocked", "requires_verification"]
    cost: Cost
    benefit: Benefit
    missing_fields: list[str]


class Plan(PlanSnapshot):
    id: UUID
    name: str
    revision: int
    pc_id: UUID | None
    created_at: datetime
    updated_at: datetime


class PlanSummary(InputModel):
    id: UUID
    name: str
    revision: int
    status: Literal["ready", "blocked", "requires_verification"]
    objective: Objective
    budget_ars: str
    total_ars: str | None
    updated_at: datetime


class PlanPage(InputModel):
    items: list[PlanSummary]
    total: int
    page: int
    page_size: int
