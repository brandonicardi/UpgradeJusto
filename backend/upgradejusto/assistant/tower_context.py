"""Private per-turn context; never persisted or accepted as model authority."""

import json
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    StrictStr,
    field_validator,
    model_validator,
)

from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService
from upgradejusto.pcs.repository import PCRepository
from upgradejusto.pcs.service import PCService
from upgradejusto.pcs.tower_repository import TowerRepository
from upgradejusto.recommendations.models import PreviewRequest


class TurnContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    context_version: Literal[2]
    configuration_schema: Literal[1, 2]
    pc_id: UUID
    expected_pc_revision: StrictInt = Field(ge=1)
    objective: Literal["general", "gaming", "productivity"] | None = None
    budget_ars: StrictStr | None = None
    price_condition: Literal["cash", "list"] = "cash"
    workload: Literal["blender-cpu"] | None = None

    @field_validator("context_version", "configuration_schema", mode="before")
    @classmethod
    def strict_version(cls, value):
        if type(value) is not int:
            raise ValueError("Strict version required")
        return value

    @field_validator("budget_ars")
    @classmethod
    def budget(cls, value):
        return PreviewRequest.budget(value) if value is not None else None

    @model_validator(mode="after")
    def objective_workload(self):
        if self.workload is not None and self.objective != "productivity":
            raise ValueError("Workload does not apply to objective")
        return self


class TurnHistory(list):
    def __init__(self, rows, context_snapshot=None):
        super().__init__(rows)
        self.context_snapshot = context_snapshot


def load_context(engine, owner, request):
    """Called after conversation ownership, BEFORE turn/provider admission."""
    catalog = PostgresCatalogRepository(engine)
    tower = TowerRepository(engine, catalog.dataset_version).get(owner, request.pc_id)
    if tower is None:
        raise HTTPException(404, "PC not found")
    if (
        tower.revision != request.expected_pc_revision
        or tower.origin_schema != request.configuration_schema
    ):
        raise HTTPException(409, "PC context revision or schema conflict")
    if tower.origin_schema == 2:
        configuration = tower.model_dump(mode="json")
    else:
        legacy = PCService(PCRepository(engine), CatalogService(catalog))
        configuration = legacy.get(owner, tower.id).model_dump(mode="json")
    if configuration["revision"] != request.expected_pc_revision:
        raise HTTPException(409, "PC context revision conflict")
    configuration["context"].pop("notes", None)
    snapshot = {
        "context_version": 2,
        "configuration_schema": request.configuration_schema,
        "pc_id": str(request.pc_id),
        "expected_pc_revision": request.expected_pc_revision,
        "configuration": configuration,
        "catalog_version": catalog.dataset_version,
        "selected_components": {
            line.component_id: catalog.get(line.component_id).name
            for line in tower.lines
            if line.component_id is not None
            and catalog.get(line.component_id) is not None
        },
        "objective": request.objective,
        "budget_ars": request.budget_ars,
        "price_condition": request.price_condition,
        "workload": request.workload,
    }
    if len(json.dumps(snapshot, ensure_ascii=False).encode("utf-8")) > 24000:
        raise HTTPException(422, "PC context limit; use full PC API")
    return snapshot
