"""Closed tower extraction observations; unknown quantity is never one module."""

from typing import Annotated, Literal

from pydantic import Field, StrictBool, StrictInt, StrictStr, field_validator

from upgradejusto.catalog.models import Category
from upgradejusto.extraction.models import ExtractInput
from upgradejusto.pcs.models import InputModel
from upgradejusto.pcs.tower_models import Presence, TowerCreate

Fragment = Annotated[StrictStr, Field(min_length=1, max_length=400)]
Label = Annotated[StrictStr, Field(min_length=1, max_length=200)]
Quantity = Annotated[StrictInt, Field(ge=1, le=32)]


class TowerObservedLine(InputModel):
    component_id: Label | None = None
    declared_model: Label | None = None
    quantity: Quantity | None
    excerpt: Fragment
    quantity_excerpt: Annotated[StrictStr, Field(min_length=1, max_length=400)] | None
    candidate_ids: Annotated[list[Label], Field(max_length=30)]


class TowerObservedCategory(InputModel):
    category: Category
    status: Presence
    absence_excerpt: Annotated[StrictStr, Field(min_length=1, max_length=100)] | None
    lines: Annotated[list[TowerObservedLine], Field(max_length=36)]


class TowerProviderProposal(InputModel):
    categories: Annotated[
        list[TowerObservedCategory], Field(min_length=9, max_length=9)
    ]


class TowerLineEvidence(InputModel):
    proposal_line_index: Annotated[StrictInt, Field(ge=0, le=35)] | None
    component_id: Label | None
    declared_model: Label | None
    quantity: Quantity | None
    excerpt: Fragment
    quantity_excerpt: Annotated[StrictStr, Field(min_length=1, max_length=120)] | None
    candidate_ids: Annotated[list[Label], Field(max_length=30)]
    resolution: Literal["catalog", "declared", "needs_review"]


class TowerCategoryEvidence(InputModel):
    category: Category
    status: Presence
    absence_excerpt: Annotated[StrictStr, Field(min_length=1, max_length=100)] | None
    lines: Annotated[list[TowerLineEvidence], Field(max_length=36)]


class TowerExtractResponse(InputModel):
    proposal: TowerCreate
    evidence: Annotated[list[TowerCategoryEvidence], Field(min_length=9, max_length=9)]
    missing_fields: list[StrictStr]
    warnings: list[StrictStr]
    catalog_revision: Label
    requires_confirmation: Literal[True] = True


class TowerConfirmInput(InputModel):
    confirmed: StrictBool
    proposal: TowerCreate
    catalog_revision: Label

    @field_validator("confirmed")
    @classmethod
    def explicit_confirmation(cls, value):
        if value is not True:
            raise ValueError("Explicit confirmation required")
        return value


# Same strict pasted-text limits as the six-category extractor, without widening it.
TowerExtractInput = ExtractInput
