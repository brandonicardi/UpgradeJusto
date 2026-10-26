"""Authenticated stateless preview and explicit PCService confirmation."""

from fastapi import APIRouter, Depends

from upgradejusto.api.pcs import owner
from upgradejusto.api.pcs import service as pc_service
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.auth.provider_budget import ProviderBudget
from upgradejusto.extraction.models import ConfirmInput, ExtractInput, ExtractResponse
from upgradejusto.extraction.provider import GroqExtractor
from upgradejusto.extraction.service import ExtractionService
from upgradejusto.pcs.models import PC
from upgradejusto.persistence.runtime import runtime_engine

router = APIRouter(
    prefix="/api/pcs/extract", tags=["extraction"], dependencies=[Depends(client_ip)]
)


def service(pcs=Depends(pc_service)):
    return ExtractionService(pcs, GroqExtractor(), ProviderBudget(runtime_engine()))


@router.post("", response_model=ExtractResponse)
async def extract(data: ExtractInput, identity=Depends(owner), svc=Depends(service)):
    return await svc.preview(data, owner=identity)


@router.post("/confirm", status_code=201, response_model=PC)
def confirm(data: ConfirmInput, identity=Depends(owner), svc=Depends(service)):
    return svc.confirm(identity, data)
