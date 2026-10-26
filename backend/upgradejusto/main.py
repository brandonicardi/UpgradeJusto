"""Composición de la aplicación HTTP local."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from upgradejusto.api.administration import router as administration_router
from upgradejusto.api.assistant import router as assistant_router
from upgradejusto.api.auth import router as auth_router
from upgradejusto.api.body_limits import BodyLimits
from upgradejusto.api.catalog import router as catalog_router
from upgradejusto.api.compatibility import router as compatibility_router
from upgradejusto.api.extraction import router as extraction_router
from upgradejusto.api.health import router as health_router
from upgradejusto.api.pcs import router as pcs_router
from upgradejusto.api.plans import router as plans_router
from upgradejusto.api.recommendations import router as recommendations_router
from upgradejusto.api.shares import router as shares_router
from upgradejusto.assistant.repository import Repository as ConversationRepository
from upgradejusto.auth.security import HashBusy
from upgradejusto.auth.service import AuthError
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.runtime import Unavailable, auth_settings, runtime_engine


@asynccontextmanager
async def lifespan(app):
    # La excepción HTTP local nunca puede activarse en producción.
    if os.environ.get("UJ_ALLOW_INSECURE_LOOPBACK") == "1":
        auth_settings()
    # Only project launchers asserting exclusive single-worker startup may recover.
    # Never run global recovery on each request or in arbitrary TestClient lifespans.
    if os.environ.get("UJ_ASSISTANT_EXCLUSIVE_STARTUP") == "1":
        ConversationRepository(runtime_engine()).interrupt_abandoned()
    yield


app = FastAPI(title="UpgradeJusto", lifespan=lifespan)
app.include_router(health_router)
app.include_router(catalog_router)
app.include_router(auth_router)
app.include_router(extraction_router)
app.include_router(pcs_router)
app.include_router(compatibility_router)
app.include_router(recommendations_router)
app.include_router(plans_router)
app.include_router(shares_router)
app.include_router(assistant_router)
app.include_router(administration_router)


@app.middleware("http")
async def no_auth_cache(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(
        (
            "/api/auth/",
            "/api/admin/",
            "/api/pcs/",
            "/api/plans/",
            "/api/shared-plans/",
            "/api/conversations/",
        )
    ) or request.url.path in ("/api/pcs", "/api/plans", "/api/conversations"):
        response.headers["Cache-Control"] = "no-store"
    if request.url.path.startswith("/api/shared-plans/"):
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # El handler FastAPI estándar incluye input; nunca reflejar payload/password.
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {"type": e["type"], "loc": list(e["loc"]), "msg": e["msg"]}
                for e in exc.errors()
            ]
        },
    )


@app.exception_handler(AuthError)
@app.exception_handler(PCError)
async def auth_error(request, exc):
    headers = {"Retry-After": str(exc.retry)} if exc.retry else {}
    return JSONResponse(
        status_code=exc.status, content={"detail": exc.detail}, headers=headers
    )


@app.exception_handler(HashBusy)
async def hash_busy(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests"},
        headers={"Retry-After": "1"},
    )


@app.exception_handler(Unavailable)
@app.exception_handler(SQLAlchemyError)
async def unavailable(request, exc):
    return JSONResponse(status_code=503, content={"detail": "Service unavailable"})


# Last-added user middleware is outermost; reject before FastAPI/BaseHTTP parsing.
app.add_middleware(BodyLimits)
