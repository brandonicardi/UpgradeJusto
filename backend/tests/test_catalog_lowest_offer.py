"""Read-time lowest offer and price sorts; synthetic offers, no database."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from upgradejusto.api import catalog as api
from upgradejusto.catalog.models import Category, Component
from upgradejusto.catalog.service import CatalogService
from upgradejusto.retail.models import REFERENCE_PRICE_VALIDITY, Offer


def make_offer(
    offer_id,
    amount="100.00",
    *,
    component_id="C1",
    condition="cash",
    availability="in_stock",
    observed_days_ago=1,
):
    observed = datetime.now(timezone.utc) - timedelta(days=observed_days_ago)
    return Offer(
        offer_id=offer_id,
        store="venex",
        product_id="synthetic",
        component_id=component_id,
        variant_key="SYNTHETIC ONLY",
        amount=amount,
        currency="ARS",
        condition=condition,
        availability=availability,
        stock_quantity=1 if availability == "in_stock" else None,
        source_url="https://www.venex.com.ar/synthetic-product",
        observed_at=observed,
        expires_at=observed + REFERENCE_PRICE_VALIDITY,
        status="fresh",
    )


def component(identifier, offers=(), category=Category.CPU):
    return Component(
        id=identifier,
        category=category,
        name=f"SYNTHETIC {identifier}",
        attributes={},
        sources=(),
        offers=tuple(offers),
    )


def service(items):
    items = tuple(items)
    return CatalogService(
        SimpleNamespace(
            all=lambda: items,
            get=lambda identifier: next(
                (item for item in items if item.id == identifier), None
            ),
            dataset_version="synthetic-lowest",
        )
    )


def test_only_recent_cash_in_stock_quoted_offers_can_win():
    item = component(
        "C1",
        (
            make_offer("old", "10.00", observed_days_ago=8),
            make_offer("out-of-stock", "20.00", availability="out_of_stock"),
            make_offer("list", "30.00", condition="list"),
            make_offer("no-amount", None),
            make_offer("winner", "50.00"),
        ),
    )
    svc = service([item])
    assert svc.get_component("C1").lowest_offer_id == "winner"
    listed = svc.list_components(category=None, q=None, page=1, page_size=10)
    assert listed.items[0].lowest_offer_id == "winner"


def test_tie_goes_to_smallest_offer_id():
    item = component(
        "C1",
        (
            make_offer("tie-b", "40.00"),
            make_offer("tie-a", "40.00"),
            make_offer("expensive", "90.00"),
        ),
    )
    svc = service([item])
    assert svc.get_component("C1").lowest_offer_id == "tie-a"


def test_without_qualifying_offers_lowest_is_null():
    item = component(
        "C1",
        (
            make_offer("old", "10.00", observed_days_ago=8),
            make_offer("out-of-stock", "20.00", availability="out_of_stock"),
            make_offer("list", "30.00", condition="list"),
            make_offer("no-amount", None),
        ),
    )
    svc = service([item])
    assert svc.get_component("C1").lowest_offer_id is None
    page = svc.list_components(category=None, q=None, page=1, page_size=10)
    assert page.items[0].lowest_offer_id is None


def test_price_asc_and_desc_use_lowest_offer_and_put_unqualified_last():
    items = (
        component("B", (make_offer("b", "100.00", component_id="B"),)),
        component("A", (make_offer("a", "100.00", component_id="A"),)),
        component("C", (make_offer("c", "50.00", component_id="C"),)),
        component(
            "Y", (make_offer("y-old", "10.00", component_id="Y", observed_days_ago=9),)
        ),
        component("Z"),
    )
    svc = service(items)

    def ids(sort):
        return [
            item.id
            for item in svc.list_components(
                category=None, q=None, page=1, page_size=10, sort=sort
            ).items
        ]

    assert ids("price_asc") == ["C", "A", "B", "Y", "Z"]
    assert ids("price_desc") == ["A", "B", "C", "Y", "Z"]


@pytest.mark.parametrize("sort", ["price_asc", "price_desc"])
def test_price_pagination_is_stable(sort):
    items = (
        component("A", (make_offer("a", "100.00", component_id="A"),)),
        component("B", (make_offer("b", "50.00", component_id="B"),)),
        component("C", (make_offer("c", "50.00", component_id="C"),)),
        component("D"),
        component("E"),
    )
    svc = service(items)
    full = svc.list_components(category=None, q=None, page=1, page_size=10, sort=sort)
    pages = [
        svc.list_components(category=None, q=None, page=page, page_size=2, sort=sort)
        for page in range(1, 4)
    ]
    traversed = [item.id for page in pages for item in page.items]
    assert traversed == [item.id for item in full.items]
    assert len(set(traversed)) == len(traversed) == full.total
    assert {page.total for page in pages} == {5}


def test_default_and_retail_first_orders_are_unchanged():
    items = (
        component("B", (make_offer("b", "100.00", component_id="B"),)),
        component(
            "Z", (make_offer("z-old", "10.00", component_id="Z", observed_days_ago=9),)
        ),
        component("A"),
        component("M"),
    )
    svc = service(items)

    def ids(sort):
        return [
            item.id
            for item in svc.list_components(
                category=None, q=None, page=1, page_size=10, sort=sort
            ).items
        ]

    assert ids("id") == ["A", "B", "M", "Z"]
    assert ids("retail_first") == ["B", "Z", "A", "M"]


def test_invalid_sort_raises_and_http_rejects_it():
    svc = service([component("A")])
    with pytest.raises(ValueError, match="Invalid catalog sort"):
        svc.list_components(
            category=None, q=None, page=1, page_size=10, sort="price_sideways"
        )

    app = FastAPI()
    app.include_router(api.router)
    app.dependency_overrides[api.service] = lambda: svc
    with TestClient(app) as client:
        response = client.get(
            "/api/catalog/components", params={"sort": "price_sideways"}
        )
        assert response.status_code == 422


def test_http_exposes_lowest_offer_id_as_null_when_none_qualifies():
    items = (
        component("C1", (make_offer("winner", "50.00"),)),
        component(
            "C2", (make_offer("old", "10.00", component_id="C2", observed_days_ago=9),)
        ),
    )
    app = FastAPI()
    app.include_router(api.router)
    app.dependency_overrides[api.service] = lambda: service(items)
    with TestClient(app) as client:
        body = client.get("/api/catalog/components", params={"page_size": 10}).json()
        by_id = {item["id"]: item for item in body["items"]}
        assert by_id["C1"]["lowest_offer_id"] == "winner"
        assert by_id["C2"]["lowest_offer_id"] is None
        detail = client.get("/api/catalog/components/C2").json()
        assert detail["lowest_offer_id"] is None
