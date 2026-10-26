"""New private tower actions; wiring is explicit and separate from legacy routes."""

from uuid import UUID

from fastapi import APIRouter, Depends

from upgradejusto.api.pcs import owner
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.api.towers import service as tower_service
from upgradejusto.compatibility.http_models import EvaluateRequest
from upgradejusto.compatibility.tower_application import (
    TowerCompatibilityService,
    TowerEvaluationRepository,
)
from upgradejusto.compatibility.tower_http_models import (
    TowerEvaluationResponse,
    TowerSimulationDTO,
)

router = APIRouter(
    prefix="/api/towers/{pc_id}",
    tags=["tower-compatibility"],
    dependencies=[Depends(client_ip)],
)


def service(towers=Depends(tower_service)):
    repository = towers.repository
    return TowerCompatibilityService(
        TowerEvaluationRepository(repository.engine, repository.dataset_version),
        towers.catalog,
    )


@router.post("/evaluate", response_model=TowerEvaluationResponse)
def evaluate(
    pc_id: UUID, data: EvaluateRequest, identity=Depends(owner), svc=Depends(service)
):
    return svc.run(identity, pc_id, data)


@router.post("/simulate", response_model=TowerEvaluationResponse)
def simulate(
    pc_id: UUID, data: TowerSimulationDTO, identity=Depends(owner), svc=Depends(service)
):
    return svc.run(identity, pc_id, data)
