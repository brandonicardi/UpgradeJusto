"""DTO de curación cerrados: datos existentes, no SQL/DSL ni comparador BIOS."""

import json
from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import (
    Field,
    StrictStr,
    StringConstraints,
    field_validator,
    model_validator,
)

from upgradejusto.catalog.models import Category, Source
from upgradejusto.compatibility.basic_specs import validate_envelope
from upgradejusto.compatibility.models import CpuSupportRow, TextObservation
from upgradejusto.pcs.models import InputModel

Text = Annotated[
    StrictStr, StringConstraints(min_length=1, max_length=2000, pattern=r"\S")
]
Collection = Literal["components", "prices", "sources", "cpu_support"]
ATTRIBUTES = {
    "cpu": {"socket", "cores", "threads", "memory_type", "tdp"},
    "motherboard": {
        "form_factor",
        "memory_type",
        "dimm_slots",
        "max_memory",
        "installed_bios",
    },
    "ram": {
        "capacity_per_module",
        "rank",
        "memory_type",
        "latency",
        "voltage",
        "module_type",
        "height",
    },
    "gpu": {
        "length",
        "height",
        "thickness",
        "slots",
        "vram",
        "interface",
        "power_connector",
        "recommended_psu",
    },
    "psu": {
        "continuous_power",
        "length",
        "pcie_cables",
        "temperature_rating",
        "dimensions",
        "standard",
        "spare_pcie_cable_count",
        "evidence_note",
    },
    "case": {
        "motherboard_formats",
        "psu_limit",
        "gpu_length_limit",
        "gpu_height_limit",
        "cooler_height_limit",
        "slots",
    },
    "storage": {
        "capacity_gb",
        "interface",
        "form_factor",
        "length",
        "height",
        "power_connector",
        "evidence_note",
    },
    "cooler": {
        "sockets",
        "height",
        "radiator_size",
        "fan_header",
        "power_connector",
        "included_thermal_compound",
        "evidence_note",
    },
    "fan": {
        "size",
        "thickness",
        "fan_header",
        "voltage",
        "current",
        "evidence_note",
    },
}


def public_url(value):
    parsed = urlsplit(value)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username
        or parsed.password
    ):
        raise ValueError("Public HTTP(S) provenance required")
    return value


class ComponentData(InputModel):
    category: Category
    name: Annotated[StrictStr, Field(min_length=1, max_length=200)]
    attributes: dict[StrictStr, Text | None]
    sources: Annotated[list[Source], Field(min_length=1, max_length=30)]

    @field_validator("name")
    @classmethod
    def valid_name(cls, value):
        if not value.strip() or "\0" in value:
            raise ValueError("Invalid component name")
        return value.strip()

    @model_validator(mode="after")
    def supported(self):
        if set(self.attributes) - (ATTRIBUTES[self.category] | {"basic_stock_v1"}):
            raise ValueError("Unsupported attribute")
        if self.attributes.get("basic_stock_v1") is not None:
            validate_envelope(self.attributes["basic_stock_v1"])
        if self.attributes.get("installed_bios") is not None:
            raise ValueError("Installed BIOS belongs to declared PC context")
        for source in self.sources:
            public_url(source.url)
        return self


class PriceData(InputModel):
    component_id: Text
    amount: Annotated[StrictStr, Field(pattern=r"^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$")]
    currency: Literal["ARS"]
    date: date
    source: Text

    @field_validator("amount")
    @classmethod
    def bounded_amount(cls, value):
        if Decimal(value) > Decimal("999999999999.99"):
            raise ValueError("Amount too large")
        return value


class SourceData(InputModel):
    source_id: Text
    url: Text
    consulted_on: date
    locator: Text

    @field_validator("url")
    @classmethod
    def valid_url(cls, value):
        return public_url(value)


class SupportData(InputModel):
    cpu_component_id: Text
    motherboard_component_id: Text
    cpu_socket: TextObservation
    motherboard_socket: TextObservation
    applicable_revision: TextObservation
    row: CpuSupportRow

    @model_validator(mode="after")
    def documented(self):
        for observation in (
            self.cpu_socket,
            self.motherboard_socket,
            self.applicable_revision,
        ):
            if (
                observation.status != "documented"
                or not observation.value
                or not observation.evidence
            ):
                raise ValueError("Documented observation required")
        if (
            not self.row.evidence
            or self.applicable_revision.value != self.row.applicable_revision
        ):
            raise ValueError("Exact revision and evidence required")
        if self.row.minimum_bios in self.row.earlier_bios or len(
            set(self.row.earlier_bios)
        ) != len(self.row.earlier_bios):
            raise ValueError("Invalid explicit earlier BIOS relation")
        return self


MODELS = {
    "components": ComponentData,
    "prices": PriceData,
    "sources": SourceData,
    "cpu_support": SupportData,
}


def validate_data(collection, data):
    # JSON entry preserves tuple/strict domain semantics without accepting coercive Python inputs.
    return (
        MODELS[collection].model_validate_json(json.dumps(data)).model_dump(mode="json")
    )


class RowInput(InputModel):
    data: dict


class RevisionInput(InputModel):
    base_version: Text


class PublishInput(InputModel):
    expected_active_version: Text
