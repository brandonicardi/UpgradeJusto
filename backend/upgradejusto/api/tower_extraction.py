"""Stateless owner-bound tower extraction; only explicit confirmation creates PC."""

from fastapi import APIRouter, Depends

from upgradejusto.api.pcs import owner
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.api.towers import service as tower_service
from upgradejusto.auth.provider_budget import ProviderBudget
from upgradejusto.extraction.tower_models import (
    TowerConfirmInput,
    TowerExtractInput,
    TowerExtractResponse,
)
from upgradejusto.extraction.tower_provider import TowerGroqExtractor
from upgradejusto.extraction.tower_service import TowerExtractionService
from upgradejusto.pcs.tower_models import Tower
from upgradejusto.persistence.runtime import runtime_engine

router = APIRouter(
    prefix="/api/towers/extract",
    tags=["tower-extraction"],
    dependencies=[Depends(client_ip)],
)


def service(towers=Depends(tower_service)):
    return TowerExtractionService(
        towers, TowerGroqExtractor(), ProviderBudget(runtime_engine())
    )


@router.post("", response_model=TowerExtractResponse)
async def extract(
    data: TowerExtractInput, identity=Depends(owner), svc=Depends(service)
):
    return await svc.preview(data, identity)


@router.post("/confirm", status_code=201, response_model=Tower)
def confirm(data: TowerConfirmInput, identity=Depends(owner), svc=Depends(service)):
    return svc.confirm(identity, data)
