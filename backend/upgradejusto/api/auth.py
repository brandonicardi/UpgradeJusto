"""Adaptador HTTP CU01; cookies same-origin, sin CORS abierto."""

from fastapi import APIRouter, Depends, Request, Response

from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.auth.repository import AuthRepository
from upgradejusto.auth.security import (
    AccountDeletion,
    AccountUpdate,
    Credentials,
    PasswordChange,
)
from upgradejusto.auth.service import AuthError, AuthService
from upgradejusto.persistence.runtime import auth_settings, runtime_engine

router = APIRouter(prefix="/api/auth", tags=["auth"], dependencies=[Depends(client_ip)])
COOKIE = "uj_session"


def service():
    return AuthService(AuthRepository(runtime_engine()))


def cookie(response, raw, secure, *, authenticated=False):
    response.set_cookie(
        COOKIE,
        raw,
        max_age=43200 if authenticated else 1800,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/api",
    )


def post_session(request: Request, svc=Depends(service)):
    origin, _ = auth_settings()
    return svc.authorize_post(
        request.cookies.get(COOKIE),
        request.headers.get("x-csrf-token"),
        request.headers.get("origin"),
        origin,
    )


@router.get("/csrf")
def csrf(
    request: Request, response: Response, svc=Depends(service), ip=Depends(client_ip)
):
    origin, secure = auth_settings()
    if "origin" in request.headers and request.headers["origin"] != origin:
        raise AuthError(403, "Forbidden")
    csrf_token, raw = svc.csrf(request.cookies.get(COOKIE), ip)
    if raw:
        cookie(response, raw, secure)
    return {"csrf_token": csrf_token}


@router.post("/register", status_code=201)
def register(
    data: Credentials,
    request: Request,
    session=Depends(post_session),
    svc=Depends(service),
    ip=Depends(client_ip),
):
    user, _ = svc.credentials(
        data,
        ip,
        session,
        register=True,
    )
    return user


@router.post("/login")
def login(
    data: Credentials,
    request: Request,
    response: Response,
    session=Depends(post_session),
    svc=Depends(service),
    ip=Depends(client_ip),
):
    user, raw = svc.credentials(
        data,
        ip,
        session,
        register=False,
    )
    cookie(response, raw, auth_settings()[1], authenticated=True)
    return user


@router.get("/session")
def current(request: Request, svc=Depends(service)):
    auth_settings()
    return svc.current(request.cookies.get(COOKIE))


@router.patch("/account")
def account(
    data: AccountUpdate,
    session=Depends(post_session),
    svc=Depends(service),
):
    return svc.account(data, session)


@router.post("/password", status_code=204)
def password(
    data: PasswordChange,
    session=Depends(post_session),
    svc=Depends(service),
    ip=Depends(client_ip),
):
    svc.change_password(data, session, ip)


@router.delete("/account", status_code=204)
def delete_account(
    data: AccountDeletion,
    response: Response,
    session=Depends(post_session),
    svc=Depends(service),
    ip=Depends(client_ip),
):
    svc.delete_account(data, session, ip)
    response.delete_cookie(
        COOKIE, path="/api", secure=auth_settings()[1], httponly=True, samesite="lax"
    )


@router.post("/logout", status_code=204)
def logout(response: Response, session=Depends(post_session), svc=Depends(service)):
    svc.repository.revoke(session["digest"])
    response.delete_cookie(
        COOKIE, path="/api", secure=auth_settings()[1], httponly=True, samesite="lax"
    )
