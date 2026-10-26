"""H: metadatos separados de la respuesta que revela el token una sola vez."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import Field, StrictInt, StrictStr, field_validator

from upgradejusto.pcs.models import InputModel
from upgradejusto.plans.models import clean_name


class PublishRequest(InputModel):
    expected_plan_revision: Annotated[StrictInt, Field(ge=1)]
    title: StrictStr

    _title = field_validator("title")(clean_name)


class ShareMetadata(InputModel):
    id: UUID
    plan_revision: int
    title: str
    created_at: datetime
    revoked_at: datetime | None


class PublishedShare(InputModel):
    id: UUID
    plan_revision: int
    title: str
    created_at: datetime
    path: str


class SharePage(InputModel):
    items: list[ShareMetadata]
