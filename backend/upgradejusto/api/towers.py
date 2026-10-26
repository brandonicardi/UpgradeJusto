"""Schema2 CRUD with existing server session, CSRF, IP and revision controls."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from upgradejusto.api.pcs import owner
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService
from upgradejusto.pcs.tower_models import Tower, TowerCreate, TowerPage, TowerUpdate
from upgradejusto.pcs.tower_repository import TowerRepository
from upgradejusto.pcs.tower_service import TowerService
from upgradejusto.persistence.runtime import runtime_engine

router = APIRouter(
    prefix="/api/towers", tags=["towers"], dependencies=[Depends(client_ip)]
)


def service():
    catalog = CatalogService(PostgresCatalogRepository())
    return TowerService(
        TowerRepository(runtime_engine(), catalog.repository.dataset_version), catalog
    )


@router.get("", response_model=TowerPage)
def list_towers(
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
    identity=Depends(owner),
    svc=Depends(service),
):
    return svc.list(identity, page, page_size)


@router.post("", response_model=Tower, status_code=201)
def create(data: TowerCreate, identity=Depends(owner), svc=Depends(service)):
    return svc.create(identity, data)


@router.get("/{pc_id}", response_model=Tower)
def get(pc_id: UUID, identity=Depends(owner), svc=Depends(service)):
    return svc.get(identity, pc_id)


@router.put("/{pc_id}", response_model=Tower)
def update(
    pc_id: UUID, data: TowerUpdate, identity=Depends(owner), svc=Depends(service)
):
    return svc.update(identity, pc_id, data)


@router.delete("/{pc_id}", status_code=204)
def delete(pc_id: UUID, identity=Depends(owner), svc=Depends(service)):
    svc.delete(identity, pc_id)
