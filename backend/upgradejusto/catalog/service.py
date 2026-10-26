"""Filtros AND y paginación determinística, independientes de HTTP."""

from upgradejusto.catalog.models import Category, Component, ComponentPage
from upgradejusto.catalog.repository import CuratedCatalogRepository


class ResolvedCatalog(dict):
    """Pinned data plus already-supported parameters; no domain/DB coupling."""

    def __init__(self, parts, support_rows, source_rows=None):
        super().__init__((part.id, part) for part in parts)
        self.support_rows = support_rows
        self.source_rows = source_rows


class CatalogService:
    def __init__(self, repository: CuratedCatalogRepository) -> None:
        self.repository = repository

    def list_components(
        self, *, category: Category | None, q: str | None, page: int, page_size: int
    ) -> ComponentPage:
        query = (q or "").strip().casefold()
        items = sorted(
            (
                item
                for item in self.repository.all()
                if (category is None or item.category == category)
                and query in item.name.casefold()
            ),
            key=lambda item: item.id,
        )
        start = (page - 1) * page_size
        return ComponentPage(
            dataset_version=self.repository.dataset_version,
            items=tuple(items[start : start + page_size]),
            total=len(items),
            page=page,
            page_size=page_size,
        )

    def get_component(self, component_id: str) -> Component | None:
        return self.repository.get(component_id)

    def snapshot(self) -> tuple[Component, ...]:
        """Snapshot versionado para resolución servidor, sin editar catálogo."""
        return self.repository.all()

    def resolution_snapshot(self):
        return ResolvedCatalog(
            self.snapshot(),
            getattr(self.repository, "support_rows", None),
            getattr(self.repository, "source_rows", None),
        )
