"""G privado: CRUD de snapshots, identidad exclusivamente de sesión servidor."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from upgradejusto.api.pcs import owner
from upgradejusto.api.pcs import service as pc_service
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.persistence.runtime import runtime_engine
from upgradejusto.plans.models import Plan, PlanCreate, PlanPage, PlanUpdate
from upgradejusto.plans.repository import PlanRepository
from upgradejusto.plans.service import PlanService

router = APIRouter(
    prefix="/api/plans", tags=["plans"], dependencies=[Depends(client_ip)]
)


def service(pcs=Depends(pc_service)):
    return PlanService(PlanRepository(runtime_engine()), pcs.catalog)


@router.post("", status_code=201, response_model=Plan)
def create(data: PlanCreate, identity=Depends(owner), svc=Depends(service)):
    return svc.save(identity, data)


@router.get("", response_model=PlanPage)
def list_plans(
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
    identity=Depends(owner),
    svc=Depends(service),
):
    return svc.list(identity, page, page_size)


@router.get("/{plan_id}", response_model=Plan)
def get(plan_id: UUID, identity=Depends(owner), svc=Depends(service)):
    return svc.get(identity, plan_id)


@router.put("/{plan_id}", response_model=Plan)
def update(
    plan_id: UUID, data: PlanUpdate, identity=Depends(owner), svc=Depends(service)
):
    return svc.save(identity, data, plan_id)


@router.delete("/{plan_id}", status_code=204)
def delete(plan_id: UUID, identity=Depends(owner), svc=Depends(service)):
    svc.delete(identity, plan_id)
