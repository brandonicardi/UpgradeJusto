"""H: rutas privadas por sesión y única ruta pública GET sin identidad implícita."""

from uuid import UUID

from fastapi import APIRouter, Depends

from upgradejusto.api.pcs import owner
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.persistence.runtime import runtime_engine
from upgradejusto.shares.models import PublishedShare, PublishRequest, SharePage
from upgradejusto.shares.repository import ShareRepository
from upgradejusto.shares.service import ShareService

router = APIRouter(tags=["shares"], dependencies=[Depends(client_ip)])


def service():
    return ShareService(ShareRepository(runtime_engine()))


@router.post(
    "/api/plans/{plan_id}/shares", status_code=201, response_model=PublishedShare
)
def publish(
    plan_id: UUID, data: PublishRequest, identity=Depends(owner), svc=Depends(service)
):
    return svc.publish(identity, plan_id, data)


@router.get("/api/plans/{plan_id}/shares", response_model=SharePage)
def list_shares(plan_id: UUID, identity=Depends(owner), svc=Depends(service)):
    return svc.list(identity, plan_id)


@router.delete("/api/plans/{plan_id}/shares/{share_id}", status_code=204)
def revoke(
    plan_id: UUID, share_id: UUID, identity=Depends(owner), svc=Depends(service)
):
    svc.revoke(identity, plan_id, share_id)


@router.get("/api/shared-plans/{token}")
def public(token: str, svc=Depends(service)):
    return svc.public(token)
