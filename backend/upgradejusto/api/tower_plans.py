"""Private tower-plan routes (CU07): owner-scoped, mounted behind the ingress check."""

import re
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query, Request, Response

from upgradejusto.api.pcs import owner
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.auth.service import AuthError
from upgradejusto.persistence.runtime import runtime_engine
from upgradejusto.plans.tower_models import (
    TowerPlanCreate,
    TowerPlanDelete,
    TowerPlanPage,
    TowerPlanProgress,
    TowerPlanRead,
    TowerPlanRecalculate,
)
from upgradejusto.plans.tower_repository import TowerPlanRepository
from upgradejusto.plans.tower_service import TowerPlanService


def ingress(request: Request):
    # New prefix is NOT a wildcard addition to proxy_ip. Private policy is checked
    # here for direct requests; gateway activation still needs its exact allowlist.
    raw = request.scope["raw_path"]
    root = rb"/api/tower-plans"
    uid = rb"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    if request.method == "GET":
        pattern = root + rb"(?:/" + uid + rb"(?:/revisions/[1-9][0-9]{0,9})?)?"
    elif request.method == "POST":
        pattern = root + rb"(?:/" + uid + rb"/recalculate)?"
    elif request.method == "PUT":
        pattern = root + rb"/" + uid + rb"/stages/[0-9a-f]{64}/progress"
    elif request.method == "DELETE":
        pattern = root + rb"/" + uid + rb"(?:/stages/[0-9a-f]{64}/progress)?"
    else:
        raise AuthError(403, "Forbidden")
    if not re.fullmatch(pattern, raw):
        raise AuthError(403, "Forbidden")
    query = request.scope.get("query_string", b"")
    if query:
        if (
            request.method != "GET"
            or raw != b"/api/tower-plans"
            or not re.fullmatch(
                rb"(?:page|page_size)=[1-9][0-9]*(?:&(?:page|page_size)=[1-9][0-9]*)*",
                query,
            )
        ):
            raise AuthError(403, "Forbidden")
        keys = [pair.split(b"=", 1)[0] for pair in query.split(b"&")]
        if len(keys) != len(set(keys)):
            raise AuthError(403, "Forbidden")
    client_ip(request)


router = APIRouter(
    prefix="/api/tower-plans", tags=["tower-plans"], dependencies=[Depends(ingress)]
)


def service():
    return TowerPlanService(TowerPlanRepository(runtime_engine()))


StageKey = Annotated[str, Path(pattern=r"[0-9a-f]{64}")]


def stage_progress(identity, plan_id, stage_key, completed, svc):
    """Owner-scoped, idempotent toggle; the plan revision itself is never written.

    The revision and the marks come from the single transaction that wrote the
    mark, so the response never names a revision that a concurrent
    recalculation already replaced.
    """
    result = svc.set_progress(identity, plan_id, stage_key, completed)
    return {
        "kind": "tower_plan_progress",
        "plan_id": plan_id,
        "revision": result["revision"],
        "progress": result["progress"],
    }


@router.post("", status_code=201, response_model=TowerPlanRead)
def create(
    data: TowerPlanCreate,
    response: Response,
    identity=Depends(owner),
    svc=Depends(service),
):
    plan, replayed = svc.save(identity, data)
    if replayed:
        response.status_code = 200
        response.headers["Idempotency-Replayed"] = "true"
    return plan


@router.get("", response_model=TowerPlanPage)
def list_plans(
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
    identity=Depends(owner),
    svc=Depends(service),
):
    return svc.list(identity, page, page_size)


@router.get("/{plan_id}", response_model=TowerPlanRead)
def get(plan_id: UUID, identity=Depends(owner), svc=Depends(service)):
    return svc.get(identity, plan_id)


@router.get("/{plan_id}/revisions/{revision}", response_model=TowerPlanRead)
def history(
    plan_id: UUID,
    revision: Annotated[int, Path(ge=1, le=9999999999)],
    identity=Depends(owner),
    svc=Depends(service),
):
    return svc.get(identity, plan_id, revision)


@router.post("/{plan_id}/recalculate", response_model=TowerPlanRead)
def recalculate(
    plan_id: UUID,
    data: TowerPlanRecalculate,
    response: Response,
    identity=Depends(owner),
    svc=Depends(service),
):
    plan, replayed = svc.save(identity, data, plan_id)
    if replayed:
        response.headers["Idempotency-Replayed"] = "true"
    return plan


@router.delete("/{plan_id}", status_code=204)
def delete(
    plan_id: UUID,
    data: TowerPlanDelete,
    identity=Depends(owner),
    svc=Depends(service),
):
    svc.delete(identity, plan_id, data.expected_plan_revision)


@router.put("/{plan_id}/stages/{stage_key}/progress", response_model=TowerPlanProgress)
def mark_stage(
    plan_id: UUID,
    stage_key: StageKey,
    identity=Depends(owner),
    svc=Depends(service),
):
    return stage_progress(identity, plan_id, stage_key, True, svc)


@router.delete(
    "/{plan_id}/stages/{stage_key}/progress", response_model=TowerPlanProgress
)
def unmark_stage(
    plan_id: UUID,
    stage_key: StageKey,
    identity=Depends(owner),
    svc=Depends(service),
):
    return stage_progress(identity, plan_id, stage_key, False, svc)
