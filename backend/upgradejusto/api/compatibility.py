"""D acciones POST privadas únicamente; no escritura de PC ni evaluación guardada."""

from uuid import UUID

from fastapi import APIRouter, Depends

from upgradejusto.api.pcs import owner
from upgradejusto.api.pcs import service as pc_service
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.compatibility.application import CompatibilityService
from upgradejusto.compatibility.http_models import (
    EvaluateRequest,
    EvaluationResponse,
    SimulateRequest,
)

router = APIRouter(
    prefix="/api/pcs/{pc_id}/compatibility",
    tags=["compatibility"],
    dependencies=[Depends(client_ip)],
)


def service(pcs=Depends(pc_service)):
    return CompatibilityService(pcs, pcs.catalog)


@router.post("/evaluate", response_model=EvaluationResponse)
def evaluate(
    pc_id: UUID, data: EvaluateRequest, identity=Depends(owner), svc=Depends(service)
):
    return svc.run(identity, pc_id, data)


@router.post("/simulate", response_model=EvaluationResponse)
def simulate(
    pc_id: UUID, data: SimulateRequest, identity=Depends(owner), svc=Depends(service)
):
    return svc.run(identity, pc_id, data)
