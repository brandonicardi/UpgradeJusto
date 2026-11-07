"""Entrada HTTP CU04; no escrituras ni decisiones CU05."""

import json
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import StringConstraints

from upgradejusto.catalog.models import (
    CatalogComponent,
    CatalogComponentPage,
    Category,
)
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService, CatalogSort
from upgradejusto.compatibility.reference_knowledge import public_reference_facts
from upgradejusto.recommendations.first_build import first_build

router = APIRouter(prefix="/api/catalog/components", tags=["catalog"])


def service():
    return CatalogService(PostgresCatalogRepository())


def with_reference(component):
    """Reference facts travel apart, so a screen can label them as such."""
    facts = public_reference_facts(component.category.value, component.name)
    if not facts:
        return component
    attributes = {**component.attributes, "reference_facts": json.dumps(facts)}
    return component.model_copy(update={"attributes": attributes})


@router.get("", response_model=CatalogComponentPage)
def list_components(
    category: Annotated[Category | None, Query()] = None,
    q: Annotated[
        str | None, Query(), StringConstraints(strip_whitespace=True, max_length=100)
    ] = None,
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 12,
    sort: Annotated[CatalogSort, Query()] = "id",
    svc=Depends(service),
) -> CatalogComponentPage:
    page_result = svc.list_components(
        category=category, q=q, page=page, page_size=page_size, sort=sort
    )
    return page_result.model_copy(
        update={"items": tuple(with_reference(item) for item in page_result.items)}
    )


@router.get("/first-build")
def propose_first_build(
    objective: Literal["general", "gaming", "productivity"],
    budget_ars: Annotated[Decimal, Query(gt=0, max_digits=14, decimal_places=2)],
    condition: Literal["cash", "list"] = "cash",
    svc=Depends(service),
):
    """Public and read-only: nothing is saved until the person confirms it."""
    return first_build(
        svc.resolution_snapshot(),
        svc.repository.dataset_version,
        objective,
        budget_ars,
        datetime.now(UTC),
        condition,
    )


@router.get("/{component_id}", response_model=CatalogComponent)
def get_component(component_id: str, svc=Depends(service)) -> CatalogComponent:
    component = svc.get_component(component_id)
    if component is None:
        raise HTTPException(status_code=404, detail="Component not found")
    return with_reference(component)
