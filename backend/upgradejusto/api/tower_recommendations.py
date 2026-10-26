"""Private preview only; main wiring remains a separate reviewed change."""

from uuid import UUID

from fastapi import APIRouter, Depends

from upgradejusto.api.pcs import owner
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.api.towers import service as tower_service
from upgradejusto.recommendations.tower_models import (
    TowerPreviewRequest,
    TowerPreviewResponse,
)
from upgradejusto.recommendations.tower_repository import TowerRecommendationRepository
from upgradejusto.recommendations.tower_service import TowerRecommendationService

router = APIRouter(
    prefix="/api/towers/{pc_id}/recommendations",
    tags=["tower-recommendations"],
    dependencies=[Depends(client_ip)],
)


def service(towers=Depends(tower_service)):
    return TowerRecommendationService(
        TowerRecommendationRepository(
            towers.repository.engine, towers.repository.dataset_version
        )
    )


@router.post("/preview", response_model=TowerPreviewResponse)
def preview(
    pc_id: UUID,
    data: TowerPreviewRequest,
    identity=Depends(owner),
    svc=Depends(service),
):
    return svc.preview(identity, pc_id, data)
