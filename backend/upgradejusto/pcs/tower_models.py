"""Tower schema2: declared != identified, unknown != absent; no spec inference."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StrictInt, StrictStr, field_validator, model_validator

from upgradejusto.catalog.models import Category
from upgradejusto.pcs.models import InputModel, PCContext

Presence = Literal["present", "unknown", "absent"]
SINGLE_CATEGORIES = frozenset(
    {
        Category.CPU,
        Category.MOTHERBOARD,
        Category.GPU,
        Category.PSU,
        Category.CASE,
        Category.COOLER,
    }
)


class TowerLine(InputModel):
    line_id: UUID | None = None
    category: Category
    component_id: Annotated[StrictStr, Field(min_length=1, max_length=200)] | None = (
        None
    )
    declared_model: Annotated[StrictStr, Field(min_length=1, max_length=200)] | None = (
        None
    )
    quantity: Annotated[StrictInt, Field(ge=1, le=32)]

    @field_validator("component_id", "declared_model")
    @classmethod
    def clean_text(cls, value):
        if value is not None:
            if not value.strip() or "\0" in value:
                raise ValueError("Invalid tower selection")
            return value.strip()
        return value

    @model_validator(mode="after")
    def selection(self):
        if (self.component_id is None) == (self.declared_model is None):
            raise ValueError("Select catalog component OR declare unrecognized model")
        if self.category in SINGLE_CATEGORIES and self.quantity != 1:
            raise ValueError("Single component requires quantity1")
        return self


class TowerCreate(InputModel):
    schema_version: Literal[2]
    name: StrictStr
    category_status: dict[Category, Presence]
    lines: Annotated[list[TowerLine], Field(max_length=36)]
    context: PCContext

    @field_validator("schema_version", mode="before")
    @classmethod
    def exact_version(cls, value):
        if type(value) is not int or value != 2:
            raise ValueError("Tower schema_version must be integer2")
        return value

    @field_validator("name")
    @classmethod
    def valid_name(cls, value):
        value = value.strip()
        if not 1 <= len(value) <= 100 or "\0" in value:
            raise ValueError("Invalid PC name")
        return value

    @model_validator(mode="after")
    def complete_states_and_population(self):
        if set(self.category_status) != set(Category):
            raise ValueError("Exactly nine category states are required")
        ids = [line.line_id for line in self.lines if line.line_id is not None]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate line identity")
        for category in Category:
            selected = [line for line in self.lines if line.category == category]
            if bool(selected) != (self.category_status[category] == "present"):
                raise ValueError("Present requires lines; unknown/absent forbids lines")
            total = sum(line.quantity for line in selected)
            if category in SINGLE_CATEGORIES and len(selected) > 1:
                raise ValueError("Single category admits one line")
            if category == "ram" and (len(selected) > 4 or total > 16):
                raise ValueError("RAM maximum4 groups/16 modules")
            if category == "storage" and total > 16:
                raise ValueError("Storage maximum16 drives")
            if category == "fan" and (len(selected) > 8 or total > 32):
                raise ValueError("Fan maximum8 groups/32 units")
        return self


class TowerUpdate(TowerCreate):
    revision: Annotated[StrictInt, Field(ge=1)]


class Tower(TowerCreate):
    id: UUID
    revision: Annotated[StrictInt, Field(ge=1)]
    origin_schema: Literal[1, 2]

    @model_validator(mode="after")
    def server_line_ids(self):
        if any(line.line_id is None for line in self.lines):
            raise ValueError("Persisted/read tower requires server line IDs")
        return self


class TowerPage(InputModel):
    items: list[Tower]
    total: int
    page: int
    page_size: int
