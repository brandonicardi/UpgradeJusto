"""Contrato de lectura CU04 compartido por servicio y HTTP."""

from datetime import date
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from upgradejusto.retail.models import ImageEvidence, Offer


class Category(StrEnum):
    CPU = "cpu"
    MOTHERBOARD = "motherboard"
    RAM = "ram"
    GPU = "gpu"
    PSU = "psu"
    CASE = "case"
    STORAGE = "storage"
    COOLER = "cooler"
    FAN = "fan"


LEGACY_CATEGORIES = frozenset(
    Category(value) for value in ("cpu", "motherboard", "ram", "gpu", "psu", "case")
)


class ReadModel(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")


class Source(ReadModel):
    id: str
    url: str


class Price(ReadModel):
    amount: str = Field(pattern=r"^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$")
    currency: Literal["ARS"]
    date: date
    source: str


class Component(ReadModel):
    id: str
    category: Category
    name: str
    attributes: dict[str, str | None]
    sources: tuple[Source, ...]
    prices: tuple[Price, ...] = ()
    image: str | None = None
    image_evidence: ImageEvidence | None = Field(
        default=None, exclude_if=lambda v: v is None
    )
    offers: tuple[Offer, ...] = Field(default=(), exclude_if=lambda v: not v)


class ComponentPage(ReadModel):
    dataset_version: str
    items: tuple[Component, ...]
    total: int
    page: int
    page_size: int
