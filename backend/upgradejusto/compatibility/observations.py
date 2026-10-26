"""Shared strict evidence primitives; no HTTP, persistence or catalog imports."""

from datetime import date
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

Text = Annotated[str, StringConstraints(min_length=1, pattern=r"\S")]
EvidenceStatus = Literal["documented", "unknown", "conflict"]


class DomainModel(BaseModel):
    model_config = ConfigDict(
        strict=True,
        frozen=True,
        extra="forbid",
        allow_inf_nan=False,
        revalidate_instances="always",
    )


class EvidenceRef(DomainModel):
    source_id: Text
    url: Text
    locator: Text
    consulted_on: Text

    @field_validator("url")
    @classmethod
    def public_url(cls, value: str) -> str:
        parsed = urlsplit(value)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("Se requiere URL de procedencia HTTP(S)")
        if parsed.username or parsed.password:
            raise ValueError("La referencia no admite credenciales")
        return value

    @field_validator("consulted_on")
    @classmethod
    def valid_date(cls, value: str) -> str:
        date.fromisoformat(value)
        return value
