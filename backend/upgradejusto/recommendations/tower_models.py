"""Closed HTTP selections for tower recommendations; no client technical facts."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StrictStr, field_validator, model_validator

from upgradejusto.compatibility.http_models import EvaluateRequest
from upgradejusto.compatibility.tower_http_models import (
    TowerAction,
    TowerEvaluationResponse,
)
from upgradejusto.pcs.models import InputModel
from upgradejusto.recommendations.models import Objective, PreviewRequest


class TowerMaterial(InputModel):
    kind: Literal["thermal_compound"]
    state: Literal["available_confirmed"]
    confirmed: Literal[True]

    @field_validator("confirmed", mode="before")
    @classmethod
    def explicit_confirmation(cls, value):
        if value is not True:
            raise ValueError("Explicit boolean confirmation required")
        return value


class TowerAlternative(InputModel):
    key: Annotated[StrictStr, Field(pattern=r"^[A-Za-z0-9_-]{1,40}$")]
    actions: Annotated[list[TowerAction], Field(min_length=1, max_length=36)]


class TowerPreviewRequest(EvaluateRequest):
    objective: Objective
    budget_ars: StrictStr
    price_condition: Literal["cash", "list"]
    mode: Literal["automatic", "manual_comparison"]
    workload: Literal["blender-cpu"] | None = None
    materials: Annotated[list[TowerMaterial], Field(max_length=1)] = []
    alternatives: Annotated[list[TowerAlternative], Field(max_length=20)] = []

    @field_validator("budget_ars")
    @classmethod
    def budget(cls, value):
        return PreviewRequest.budget(value)

    @model_validator(mode="after")
    def modes(self):
        if self.mode == "automatic" and self.alternatives:
            raise ValueError("Automatic mode does not accept alternatives")
        if self.mode == "manual_comparison" and not self.alternatives:
            raise ValueError("Manual comparison requires alternatives")
        if len({a.key for a in self.alternatives}) != len(self.alternatives):
            raise ValueError("Duplicate alternative key")
        return self


class TowerPreviewItem(InputModel):
    key: str
    actions: list
    evaluation: TowerEvaluationResponse
    benefit: dict
    cost: dict
    dependencies: list[dict]
    offers: list[dict]
    versions: dict[str, str]
    status: Literal["recommended", "requires_verification", "rejected"]
    missing_fields: list[str]


class TowerPreviewResponse(InputModel):
    pc_id: UUID
    pc_revision: int
    objective: Objective
    budget_ars: str
    mode: Literal["automatic", "manual_comparison"]
    items: list[TowerPreviewItem]
    missing_fields: list[str]
    limitations: list[str]
