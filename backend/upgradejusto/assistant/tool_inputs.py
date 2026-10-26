"""Closed tool inputs at orchestration boundary; never an authorization source."""

from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from upgradejusto.catalog.models import Category
from upgradejusto.compatibility.http_models import EvaluateRequest, SimulateRequest
from upgradejusto.recommendations.models import PreviewRequest


class Closed(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CatalogInput(Closed):
    q: Annotated[str, StringConstraints(strict=True, max_length=100)] = ""
    category: Category | None = None
    page: Annotated[int, Field(strict=True, ge=1)] = 1
    page_size: Annotated[int, Field(strict=True, ge=1, le=20)] = 12


class PCInput(Closed):
    pc_id: UUID


class EvaluationInput(PCInput):
    data: EvaluateRequest


class SimulationInput(PCInput):
    data: SimulateRequest


class PreviewInput(PCInput):
    data: PreviewRequest


class PlanInput(Closed):
    plan_id: UUID


class SearchInput(Closed):
    query: Annotated[str, StringConstraints(strict=True, min_length=1, max_length=500)]
    top_k: Annotated[int, Field(strict=True, ge=1, le=5)] = 3


INPUTS = {
    "catalog_search": CatalogInput,
    "get_pc": PCInput,
    "evaluate_pc": EvaluationInput,
    "simulate_pc": SimulationInput,
    "preview_recommendations": PreviewInput,
    "get_plan": PlanInput,
    "search_public_docs": SearchInput,
}


def validate_call(name, arguments):
    if name not in INPUTS:
        raise ValueError("Unknown tool")
    if name in {"evaluate_pc", "simulate_pc", "preview_recommendations"}:
        from .tower_inputs import validate_selection

        return validate_selection(name, arguments)
    return INPUTS[name].model_validate(arguments)
