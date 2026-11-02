"""CU09 routers mounted in main; ingress, authorization and privacy stay enforced."""

import re
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.routing import APIRoute

from upgradejusto.api.pcs import owner
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.auth.service import AuthError
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.runtime import runtime_engine
from upgradejusto.shares.tower_models import TowerPublishRequest, TowerRevokeRequest
from upgradejusto.shares.tower_repository import TowerShareRepository
from upgradejusto.shares.tower_service import ReadBudgetExceeded, TowerShareService

SAFE_HEADERS = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
}


class PrivateResponseRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()

        async def handle(request):
            try:
                response = await original(request)
            except (PCError, AuthError) as exc:
                # No input, bearer, digest, URL, SQL or validation context reflected.
                detail = {
                    403: "Forbidden",
                    404: "Shared plan not found",
                    409: "Share conflict",
                    422: "Share request unavailable",
                    429: "Too many requests",
                    503: "Share service unavailable",
                }.get(exc.status, "Share request unavailable")
                response = JSONResponse({"detail": detail}, status_code=exc.status)
                if isinstance(exc, ReadBudgetExceeded):
                    response.headers["Retry-After"] = str(exc.retry_after)
            except RequestValidationError:
                response = JSONResponse(
                    {"detail": "Invalid share request"}, status_code=422
                )
            response.headers.update(SAFE_HEADERS)
            return response

        return handle


def private_ingress(request: Request):
    uid = rb"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    path = rb"/api/tower-plans/" + uid + rb"/shares"
    if request.method == "DELETE":
        path += rb"/" + uid
    elif request.method not in ("POST", "GET"):
        raise AuthError(403, "Forbidden")
    if request.scope.get("query_string") or not re.fullmatch(
        path, request.scope["raw_path"]
    ):
        raise AuthError(403, "Forbidden")
    # Central CU09 policy validates the same raw path before transport/HMAC trust.
    client_ip(request)


def public_ingress(request: Request):
    if request.method != "GET" or request.scope.get("query_string"):
        raise AuthError(403, "Forbidden")
    return client_ip(request)


router = APIRouter(
    prefix="/api/tower-plans",
    route_class=PrivateResponseRoute,
    dependencies=[Depends(private_ingress)],
    tags=["tower-shares"],
)
public_router = APIRouter(
    prefix="/api/shared-tower-plans",
    route_class=PrivateResponseRoute,
    tags=["shared-tower-plans"],
)


def service():
    return TowerShareService(TowerShareRepository(runtime_engine()))


@router.post("/{plan_id}/shares", status_code=201)
def publish(
    plan_id: UUID,
    data: TowerPublishRequest,
    identity=Depends(owner),
    svc=Depends(service),
):
    return svc.publish(identity, plan_id, data)


@router.get("/{plan_id}/shares")
def list_shares(plan_id: UUID, identity=Depends(owner), svc=Depends(service)):
    return svc.list(identity, plan_id)


@router.delete("/{plan_id}/shares/{share_id}", status_code=204)
def revoke(
    plan_id: UUID,
    share_id: UUID,
    data: TowerRevokeRequest,
    identity=Depends(owner),
    svc=Depends(service),
):
    svc.revoke(identity, plan_id, share_id, data.expected_plan_revision)
    return Response(status_code=204, headers=SAFE_HEADERS)


@public_router.get("/{token}")
def read_public(token: str, ip=Depends(public_ingress), svc=Depends(service)):
    return svc.public(token, ip)
