"""Entrada HTTP CU04; no escrituras ni decisiones CU05."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from pydantic import StringConstraints

from upgradejusto.catalog.models import Category, Component, ComponentPage
from upgradejusto.catalog.repository import CuratedCatalogRepository
from upgradejusto.catalog.service import CatalogService

router = APIRouter(prefix="/api/catalog/components", tags=["catalog"])
service = CatalogService(CuratedCatalogRepository())


@router.get("", response_model=ComponentPage)
def list_components(
    category: Annotated[Category | None, Query()] = None,
    q: Annotated[
        str | None, Query(), StringConstraints(strip_whitespace=True, max_length=100)
    ] = None,
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 12,
) -> ComponentPage:
    return service.list_components(
        category=category, q=q, page=page, page_size=page_size
    )


@router.get("/{component_id}", response_model=Component)
def get_component(component_id: str) -> Component:
    component = service.get_component(component_id)
    if component is None:
        raise HTTPException(status_code=404, detail="Component not found")
    return component
