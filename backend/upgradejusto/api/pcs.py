"""Entrada CU03 privada: sesión servidor, CSRF en toda mutación."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from upgradejusto.api.auth import COOKIE
from upgradejusto.api.auth import service as auth_service
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService
from upgradejusto.pcs.models import PC, PCCreate, PCPage, PCUpdate
from upgradejusto.pcs.repository import PCRepository
from upgradejusto.pcs.service import PCService
from upgradejusto.persistence.runtime import auth_settings, runtime_engine

router = APIRouter(prefix="/api/pcs", tags=["pcs"], dependencies=[Depends(client_ip)])


def service():
    catalog = CatalogService(PostgresCatalogRepository())
    return PCService(
        PCRepository(runtime_engine(), catalog.repository.dataset_version), catalog
    )


def owner(request: Request, svc=Depends(auth_service)):
    origin, _ = auth_settings()
    user = svc.current(request.cookies.get(COOKIE))
    if request.method != "GET":
        svc.authorize_post(
            request.cookies.get(COOKIE),
            request.headers.get("x-csrf-token"),
            request.headers.get("origin"),
            origin,
        )
    return UUID(user["id"])


@router.get("", response_model=PCPage)
def list_pcs(
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
    identity=Depends(owner),
    svc=Depends(service),
):
    return svc.list(identity, page, page_size)


@router.post("", status_code=201, response_model=PC)
def create_pc(data: PCCreate, identity=Depends(owner), svc=Depends(service)):
    return svc.create(identity, data)


@router.get("/{pc_id}", response_model=PC)
def get_pc(pc_id: UUID, identity=Depends(owner), svc=Depends(service)):
    return svc.get(identity, pc_id)


@router.put("/{pc_id}", response_model=PC)
def update_pc(
    pc_id: UUID, data: PCUpdate, identity=Depends(owner), svc=Depends(service)
):
    return svc.update(identity, pc_id, data)


@router.delete("/{pc_id}", status_code=204)
def delete_pc(pc_id: UUID, identity=Depends(owner), svc=Depends(service)):
    svc.delete(identity, pc_id)
