"""Entrada HTTP CU04; no escrituras ni decisiones CU05."""

import json
from typing import Annotated

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
        update={"items": [with_reference(item) for item in page_result.items]}
    )


@router.get("/{component_id}", response_model=CatalogComponent)
def get_component(component_id: str, svc=Depends(service)) -> CatalogComponent:
    component = svc.get_component(component_id)
    if component is None:
        raise HTTPException(status_code=404, detail="Component not found")
    return with_reference(component)
