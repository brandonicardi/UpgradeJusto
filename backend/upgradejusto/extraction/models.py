"""Closed CU02 DTOs reusing PCCreate, including explicit unknown context."""

from typing import Annotated, Literal

from pydantic import Field, StrictBool, StrictStr, field_validator

from upgradejusto.catalog.models import LEGACY_CATEGORIES, Category
from upgradejusto.pcs.models import InputModel, PCCreate


class ExtractInput(InputModel):
    text: Annotated[StrictStr, Field(min_length=1, max_length=12000)]

    @field_validator("text")
    @classmethod
    def nonblank(cls, value):
        if not value.strip() or "\0" in value:
            raise ValueError("Invalid pasted text")
        return value


class Evidence(InputModel):
    field: Category
    origin: Literal["catalog", "text", "unknown", "ambiguous"]
    excerpt: Annotated[StrictStr, Field(min_length=1, max_length=400)] | None
    candidate_ids: Annotated[list[StrictStr], Field(max_length=30)]

    @field_validator("field")
    @classmethod
    def legacy_category(cls, value):
        if value not in LEGACY_CATEGORIES:
            raise ValueError("Tower category requires tower extraction API")
        return value


class ProviderProposal(InputModel):
    proposal: PCCreate
    evidence: Annotated[list[Evidence], Field(min_length=6, max_length=6)]


class ExtractResponse(ProviderProposal):
    warnings: list[str]
    dataset_version: str


class ExtractionMetadata(InputModel):
    dataset_version: Annotated[StrictStr, Field(min_length=1, max_length=200)]
    edited: StrictBool


class ConfirmInput(InputModel):
    confirmed: StrictBool
    pc: PCCreate
    metadata: ExtractionMetadata

    @field_validator("confirmed")
    @classmethod
    def explicit_confirmation(cls, value):
        if value is not True:
            raise ValueError("Explicit confirmation required")
        return value
