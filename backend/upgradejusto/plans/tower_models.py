"""Private tower-plan selections. Client results/evidence are never accepted."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StrictInt, StrictStr, field_validator, model_validator

from upgradejusto.compatibility.tower_http_models import TowerAction
from upgradejusto.pcs.models import InputModel
from upgradejusto.plans.models import clean_name
from upgradejusto.recommendations.models import Objective, PreviewRequest
from upgradejusto.recommendations.tower_models import TowerMaterial

Revision = Annotated[StrictInt, Field(ge=1)]


def money(value):
    return f"{Decimal(PreviewRequest.budget(value)):.2f}"


class TowerPlanStage(InputModel):
    name: StrictStr
    budget_ars: StrictStr
    materials: Annotated[list[TowerMaterial], Field(max_length=1)] = []
    actions: Annotated[list[TowerAction], Field(min_length=1, max_length=36)]

    _name = field_validator("name")(clean_name)
    _budget = field_validator("budget_ars")(money)


class TowerPlanCreate(InputModel):
    kind: Literal["tower_plan"]
    schema_version: Literal[2]
    client_request_id: UUID
    name: StrictStr
    pc_id: UUID
    expected_pc_revision: Revision
    expected_catalog_version: Annotated[StrictStr, Field(min_length=1, max_length=200)]
    objective: Objective
    workload: Literal["blender-cpu"] | None = None
    budget_ars: StrictStr
    price_condition: Literal["cash", "list"]
    stages: Annotated[list[TowerPlanStage], Field(min_length=1, max_length=12)]

    _name = field_validator("name")(clean_name)
    _budget = field_validator("budget_ars")(money)

    @field_validator("schema_version", mode="before")
    @classmethod
    def exact_version(cls, value):
        if type(value) is not int or value != 2:
            raise ValueError("Tower plans require integer schema_version2")
        return value

    @field_validator("expected_catalog_version")
    @classmethod
    def catalog_version(cls, value):
        if value != value.strip() or "\0" in value:
            raise ValueError("Invalid catalog revision")
        return value

    @model_validator(mode="after")
    def bounds(self):
        if sum(len(stage.actions) for stage in self.stages) > 96:
            raise ValueError("Maximum96 actions per plan")
        if self.workload is not None and self.objective != "productivity":
            raise ValueError("Workload does not apply to objective")
        return self


class TowerPlanRecalculate(TowerPlanCreate):
    expected_plan_revision: Revision


class TowerPlanDelete(InputModel):
    expected_plan_revision: Revision


class TowerPlanRead(InputModel):
    """One plan revision plus the live progress of its stages.

    ``stage_keys`` holds one opaque key per entry of ``snapshot["stages"]``, in
    the same order and with the same length, so a client can locate a stage
    without recomputing its SHA-256. ``progress`` maps every key still present
    in this snapshot to the timestamp it was marked as bought. Both fields are
    derived at read time: the stored snapshot is never modified, and marks of
    stages that no longer exist are omitted, never transferred or invented.

    ``spent_ars`` and ``remaining_ars`` are ARS amounts (two decimals) summed
    from the prices frozen in the snapshot for the marked and the unmarked
    stages. They are ``None`` when any stage on that side has no price.
    """

    kind: Literal["tower_plan"] = "tower_plan"
    schema_version: Literal[2] = 2
    id: UUID
    name: str
    revision: int
    pc_id: UUID | None
    created_at: datetime
    updated_at: datetime
    snapshot: dict
    stage_keys: list[str] = []
    progress: dict[str, datetime] = {}
    spent_ars: str | None = None
    remaining_ars: str | None = None


class TowerPlanPage(InputModel):
    kind: Literal["tower_plan"] = "tower_plan"
    schema_version: Literal[2] = 2
    items: list[dict]
    total: int
    page: int
    page_size: int


class TowerPlanProgress(InputModel):
    """Live marks of the current revision only; never a loose dict response."""

    kind: Literal["tower_plan_progress"] = "tower_plan_progress"
    plan_id: UUID
    revision: int
    progress: dict[str, datetime]
