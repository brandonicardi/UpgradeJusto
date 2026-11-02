"""Filtros AND y paginación determinística, independientes de HTTP."""

from typing import Literal

from upgradejusto.catalog.models import Category, Component, ComponentPage
from upgradejusto.catalog.repository import CuratedCatalogRepository

CatalogSort = Literal["id", "retail_first"]


def retail_presentation_key(item: Component) -> tuple[int, str]:
    image = item.image_evidence
    photo = bool(
        image
        and image.exact_variant
        and image.status == "verified"
        and image.url is not None
    )
    price = any(
        offer.component_id == item.id
        and offer.currency == "ARS"
        and offer.amount is not None
        for offer in item.offers
    )
    # Presentation only: stale/unavailable evidence is NOT made fresh or in stock.
    group = 0 if photo and price else 1 if price else 2 if photo else 3
    return group, item.id


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
        self,
        *,
        category: Category | None,
        q: str | None,
        page: int,
        page_size: int,
        sort: CatalogSort = "id",
    ) -> ComponentPage:
        if sort not in ("id", "retail_first"):
            raise ValueError("Invalid catalog sort")
        query = (q or "").strip().casefold()
        items = sorted(
            (
                item
                for item in self.repository.all()
                if (category is None or item.category == category)
                and query in item.name.casefold()
            ),
            key=retail_presentation_key
            if sort == "retail_first"
            else lambda item: item.id,
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
