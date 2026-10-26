"""Closed publication types. These observations are not compatibility verdicts."""

from dataclasses import dataclass
from datetime import date
from typing import Annotated
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

Text = Annotated[str, StringConstraints(min_length=1, max_length=100)]
Positive = Annotated[int, Field(ge=1, le=1000000000)]
Count = Annotated[int, Field(ge=0, le=1000000)]


class Closed(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


class SourceRef(Closed):
    source_id: Annotated[str, Field(min_length=1, max_length=200)]
    url: Annotated[str, Field(min_length=1, max_length=2000)]
    consulted_on: str
    locator: Annotated[str, Field(min_length=1, max_length=2000)]

    @field_validator("consulted_on")
    @classmethod
    def valid_date(cls, value):
        if len(value) != 10 or date.fromisoformat(value).isoformat() != value:
            raise ValueError("ISO date required")
        return value

    @field_validator("source_id", "locator")
    @classmethod
    def nonempty(cls, value):
        if not value.strip() or any(ord(c) < 32 for c in value):
            raise ValueError("Invalid reference text")
        return value

    @field_validator("url")
    @classmethod
    def provenance_only(cls, value):
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
        ):
            raise ValueError("Public provenance required")
        return value


class TechnicalIdentity(Closed):
    component_id: Annotated[str, Field(min_length=1, max_length=200)]
    category: str
    name: Annotated[str, Field(min_length=1, max_length=200)]
    manufacturer_part_number: Annotated[str, Field(min_length=1, max_length=200)] | None
    source_refs: list[SourceRef] = Field(min_length=1, max_length=30)

    @field_validator("component_id", "name", "manufacturer_part_number")
    @classmethod
    def identity_text(cls, value):
        if value is not None and (not value.strip() or any(ord(c) < 32 for c in value)):
            raise ValueError("Invalid identity")
        return value


class NominalResource(Closed):
    resource_id: Text
    kind: Text
    accepts: list[Text] = Field(min_length=1, max_length=16)
    voltage_mv: Positive | None
    max_current_ma: Positive | None
    excludes: list[Text] = Field(max_length=64)
    group: Text | None
    cost: Positive


class SharedLimit(Closed):
    group: Text
    capacity: Count


@dataclass(frozen=True)
class ConflictObservation:
    value: object
    source_refs: tuple[SourceRef, ...]


@dataclass(frozen=True)
class TechnicalEnvelope:
    version: int
    identity: TechnicalIdentity
    data: dict[str, object]
    fields: dict[str, tuple[SourceRef, ...]]
    conflicts: dict[str, tuple[ConflictObservation, ...]]
    import_digest: str

    def references(self):
        return (
            *self.identity.source_refs,
            *(ref for refs in self.fields.values() for ref in refs),
            *(
                ref
                for items in self.conflicts.values()
                for item in items
                for ref in item.source_refs
            ),
        )
