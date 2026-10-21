"""Composición de la aplicación HTTP local."""

from fastapi import FastAPI

from upgradejusto.api.catalog import router as catalog_router
from upgradejusto.api.health import router as health_router

app = FastAPI(title="UpgradeJusto")
app.include_router(health_router)
app.include_router(catalog_router)
