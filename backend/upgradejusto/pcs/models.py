"""Contrato estricto CU03: desconocidos explícitos, RAM conjunto completo."""

from typing import Annotated
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    StrictStr,
    field_validator,
    model_validator,
)

from upgradejusto.catalog.models import LEGACY_CATEGORIES, Category


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)


class ComponentGroup(InputModel):
    category: Category
    component_id: StrictStr
    quantity: Annotated[StrictInt, Field(ge=1, le=8)]

    @model_validator(mode="after")
    def quantity_policy(self):
        if self.category not in LEGACY_CATEGORIES:
            raise ValueError("Tower category requires tower API")
        if self.category != "ram" and self.quantity != 1:
            raise ValueError("Non-RAM quantity must be 1")
        return self


class PCContext(InputModel):
    bios_version: StrictStr | None
    notes: StrictStr | None

    @field_validator("bios_version", "notes")
    @classmethod
    def declared_text(cls, value, info):
        if value is None:
            return None
        value = value.strip()
        maximum = 100 if info.field_name == "bios_version" else 1000
        if not 1 <= len(value) <= maximum or "\0" in value:
            raise ValueError("Invalid declared context")
        return value


class PCCreate(InputModel):
    name: StrictStr
    components: Annotated[list[ComponentGroup], Field(max_length=6)]
    context: PCContext

    @field_validator("name")
    @classmethod
    def valid_name(cls, value):
        value = value.strip()
        if not 1 <= len(value) <= 100 or "\0" in value:
            raise ValueError("Invalid PC name")
        return value

    @field_validator("components")
    @classmethod
    def unique_groups(cls, value):
        if len({group.category for group in value}) != len(value):
            raise ValueError("Duplicate component category")
        return value


class PCUpdate(PCCreate):
    revision: Annotated[StrictInt, Field(ge=1)]


class PC(InputModel):
    id: UUID
    name: str
    revision: int
    components: list[ComponentGroup]
    context: PCContext


class PCPage(InputModel):
    items: list[PC]
    total: int
    page: int
    page_size: int
