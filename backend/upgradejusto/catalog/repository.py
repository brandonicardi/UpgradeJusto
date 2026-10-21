"""Repositorio de lectura del dataset versionado, sin BD de sustitución."""

from upgradejusto.catalog.dataset import COMPONENTS, DATASET_VERSION
from upgradejusto.catalog.models import Component


class CuratedCatalogRepository:
    dataset_version = DATASET_VERSION

    def all(self) -> tuple[Component, ...]:
        # No exponer mapas mutables del extracto compartido.
        return tuple(item.model_copy(deep=True) for item in COMPONENTS)

    def get(self, component_id: str) -> Component | None:
        return next((item for item in self.all() if item.id == component_id), None)
