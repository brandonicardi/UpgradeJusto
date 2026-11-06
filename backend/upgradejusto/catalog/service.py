"""Filtros AND y paginación determinística, independientes de HTTP."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from upgradejusto.catalog.models import (
    CatalogComponent,
    CatalogComponentPage,
    Category,
    Component,
)
from upgradejusto.catalog.repository import CuratedCatalogRepository
from upgradejusto.retail.models import lowest_usable_offer

CatalogSort = Literal["id", "retail_first", "price_asc", "price_desc"]
CATALOG_SORTS = frozenset(("id", "retail_first", "price_asc", "price_desc"))


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


def with_lowest_offer(item: Component, now: datetime) -> CatalogComponent:
    """Read-time mark; never mutates stored offers or dataset hashes."""
    offer = lowest_usable_offer(item.offers, now)
    data = item.model_dump()
    data["lowest_offer_id"] = offer.offer_id if offer is not None else None
    return CatalogComponent.model_validate(data)


def price_sort_key(item: Component, now: datetime, descending: bool):
    """Offers first, lowest to highest amount; unqualified components last."""
    offer = lowest_usable_offer(item.offers, now)
    if offer is None:
        return 1, Decimal(0), item.id
    amount = Decimal(offer.amount)
    return 0, -amount if descending else amount, item.id


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
    ) -> CatalogComponentPage:
        if sort not in CATALOG_SORTS:
            raise ValueError("Invalid catalog sort")
        query = (q or "").strip().casefold()
        items = [
            item
            for item in self.repository.all()
            if (category is None or item.category == category)
            and query in item.name.casefold()
        ]
        now = datetime.now(timezone.utc)
        if sort == "retail_first":
            items.sort(key=retail_presentation_key)
        elif sort in ("price_asc", "price_desc"):
            descending = sort == "price_desc"
            items.sort(key=lambda item: price_sort_key(item, now, descending))
        else:
            items.sort(key=lambda item: item.id)
        start = (page - 1) * page_size
        return CatalogComponentPage(
            dataset_version=self.repository.dataset_version,
            items=tuple(
                with_lowest_offer(item, now)
                for item in items[start : start + page_size]
            ),
            total=len(items),
            page=page,
            page_size=page_size,
        )

    def get_component(self, component_id: str) -> CatalogComponent | None:
        item = self.repository.get(component_id)
        if item is None:
            return None
        return with_lowest_offer(item, datetime.now(timezone.utc))

    def snapshot(self) -> tuple[Component, ...]:
        """Snapshot versionado para resolución servidor, sin editar catálogo."""
        return self.repository.all()

    def resolution_snapshot(self):
        return ResolvedCatalog(
            self.snapshot(),
            getattr(self.repository, "support_rows", None),
            getattr(self.repository, "source_rows", None),
        )
