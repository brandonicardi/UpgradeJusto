"""Closed private requests; bearer appears only in successful creation response."""

from typing import Annotated, Literal

from pydantic import Field, StrictInt, field_validator

from upgradejusto.pcs.models import InputModel

Title = Literal["Plan de mejora de torre", "Plan de mejora por etapas"]
Revision = Annotated[StrictInt, Field(ge=1, le=9999999999)]


class TowerPublishRequest(InputModel):
    expected_plan_revision: Revision
    title: Title
    public_projection_confirmed: Literal[True]

    @field_validator("public_projection_confirmed", mode="before")
    @classmethod
    def explicit_confirmation(cls, value):
        if value is not True:
            raise ValueError("Explicit public projection confirmation required")
        return value


class TowerRevokeRequest(InputModel):
    expected_plan_revision: Revision
