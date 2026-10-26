"""F: una única acción privada, efímera, sin query ni escritura."""

from uuid import UUID

from fastapi import APIRouter, Depends

from upgradejusto.api.pcs import owner
from upgradejusto.api.pcs import service as pc_service
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.recommendations.models import PreviewRequest, PreviewResponse
from upgradejusto.recommendations.service import RecommendationService

router = APIRouter(
    prefix="/api/pcs/{pc_id}/recommendations",
    tags=["recommendations"],
    dependencies=[Depends(client_ip)],
)


def service(pcs=Depends(pc_service)):
    return RecommendationService(pcs, pcs.catalog)


@router.post("/preview", response_model=PreviewResponse)
def preview(
    pc_id: UUID, data: PreviewRequest, identity=Depends(owner), svc=Depends(service)
):
    return svc.preview(identity, pc_id, data)
