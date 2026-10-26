"""GIS callback with existing anonymous/authenticated CSRF session and Origin gate."""

from fastapi import APIRouter, Depends, Response

from upgradejusto.api.auth import cookie, post_session
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.auth.google_models import (
    GoogleAttemptInput,
    GoogleChallenge,
    GoogleConfig,
    GoogleCredential,
    GooglePublicUser,
)
from upgradejusto.auth.google_repository import GoogleRepository
from upgradejusto.auth.google_service import GoogleService
from upgradejusto.auth.google_verifier import client_id
from upgradejusto.persistence.runtime import auth_settings, runtime_engine

router = APIRouter(
    prefix="/api/auth/google", tags=["auth"], dependencies=[Depends(client_ip)]
)


def service():
    return GoogleService(GoogleRepository(runtime_engine()))


@router.get("/config", response_model=GoogleConfig)
def config():
    auth_settings()
    audience = client_id()
    return {"enabled": audience is not None, "client_id": audience}


@router.post("/attempts", response_model=GoogleChallenge)
def issue(
    data: GoogleAttemptInput | None = None,
    session=Depends(post_session),
    svc=Depends(service),
    ip=Depends(client_ip),
):
    return svc.issue(session, auth_settings()[0], ip)


@router.post("", response_model=GooglePublicUser)
def login(
    data: GoogleCredential,
    response: Response,
    session=Depends(post_session),
    svc=Depends(service),
):
    user, raw = svc.login(session, auth_settings()[0], data)
    cookie(response, raw, auth_settings()[1], authenticated=True)
    return user
