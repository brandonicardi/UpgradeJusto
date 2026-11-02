"""Synthetic presentation tests, NOT PostgreSQL or current retail evidence."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from upgradejusto.api import catalog as api
from upgradejusto.catalog.models import Category, Component
from upgradejusto.catalog.service import CatalogService
from upgradejusto.retail.models import ImageEvidence, Offer


def component(identifier, *, photo=False, priced=False, bound=True, category="cpu"):
    observed = datetime(2025, 1, 1, tzinfo=timezone.utc)
    image = (
        ImageEvidence(
            url="https://www.venex.com.ar/products_images/synthetic.jpg",
            alt="SYNTHETIC ONLY",
            source_url="https://www.venex.com.ar/synthetic-product",
            retrieved_at=observed,
            rights_note="Synthetic test evidence, not a real offer/photo",
            exact_variant=True,
            status="verified",
        )
        if photo
        else None
    )
    offers = (
        Offer(
            offer_id=f"synthetic-{identifier}",
            store="venex",
            product_id="synthetic",
            component_id=identifier if bound else "another-component",
            variant_key="SYNTHETIC ONLY",
            amount="123.00" if priced else None,
            currency="ARS",
            condition="cash",
            availability="unknown",
            stock_quantity=None,
            source_url="https://www.venex.com.ar/synthetic-product",
            observed_at=observed,
            expires_at=observed + timedelta(hours=24),
            status="stale",
        ),
    )
    return Component(
        id=identifier,
        category=category,
        name=f"SYNTHETIC {identifier}",
        attributes={},
        sources=(),
        image_evidence=image,
        offers=offers,
    )


def service():
    items = (
        component("A-seed"),
        component("Z-both", photo=True, priced=True),
        component("Y-price", priced=True),
        component("X-photo", photo=True),
        component("B-wrong-binding", priced=True, bound=False),
        component("W-both", photo=True, priced=True),
        component("C-gpu", category="gpu"),
    )
    return CatalogService(
        SimpleNamespace(all=lambda: items, dataset_version="synthetic92")
    )


def test_sort_default_stable_groups_all_items_and_no_evidence_mutation():
    svc = service()
    before = [item.model_dump() for item in svc.snapshot()]
    args = {"category": None, "q": None, "page": 1, "page_size": 50}
    default = svc.list_components(**args)
    assert [item.id for item in default.items] == sorted(
        item.id for item in svc.snapshot()
    )
    assert default == svc.list_components(**args, sort="id")
    ordered = svc.list_components(**args, sort="retail_first")
    assert [item.id for item in ordered.items] == [
        "W-both",
        "Z-both",
        "Y-price",
        "X-photo",
        "A-seed",
        "B-wrong-binding",
        "C-gpu",
    ]
    assert ordered.total == default.total == 7
    assert [item.model_dump() for item in svc.snapshot()] == before
    assert ordered == svc.list_components(**args, sort="retail_first")
    pages = [
        svc.list_components(
            **{**args, "page": page, "page_size": 2}, sort="retail_first"
        )
        for page in range(1, 5)
    ]
    assert [item.id for page in pages for item in page.items] == [
        item.id for item in ordered.items
    ]
    assert all(page.total == 7 for page in pages)


def test_filter_before_sort_and_page_and_no_photo_guess_from_old_image_field():
    svc = service()
    filtered = svc.list_components(
        category=Category.CPU, q="both", page=2, page_size=1, sort="retail_first"
    )
    assert filtered.total == 2
    assert [item.id for item in filtered.items] == ["Z-both"]
    old = component("A-old").model_copy(
        update={"image": "https://example.invalid/x.jpg"}
    )
    exact = component("Z-exact", photo=True)
    quarantined = component("B-quarantined", photo=True)
    quarantined = quarantined.model_copy(
        update={
            "image_evidence": quarantined.image_evidence.model_copy(
                update={"status": "quarantined", "exact_variant": False}
            )
        }
    )
    other = CatalogService(
        SimpleNamespace(all=lambda: (old, exact, quarantined), dataset_version="test")
    )
    ordered = other.list_components(
        category=None, q=None, page=1, page_size=50, sort="retail_first"
    )
    assert [item.id for item in ordered.items] == [
        "Z-exact",
        "A-old",
        "B-quarantined",
    ]


def test_public_sort_enum_legacy_default_and_pagination_without_database():
    app = FastAPI()
    app.include_router(api.router)
    app.dependency_overrides[api.service] = service
    with TestClient(app) as client:
        base = "/api/catalog/components"
        default = client.get(base)
        explicit = client.get(base, params={"sort": "id"})
        assert default.status_code == explicit.status_code == 200
        assert default.json() == explicit.json()
        retail = client.get(base, params={"sort": "retail_first", "page_size": 2})
        assert retail.status_code == 200
        assert retail.json()["total"] == 7
        assert [item["id"] for item in retail.json()["items"]] == ["W-both", "Z-both"]
        filtered = client.get(
            base,
            params={
                "sort": "retail_first",
                "category": "cpu",
                "q": "both",
                "page": 2,
                "page_size": 1,
            },
        )
        assert filtered.status_code == 200
        assert filtered.json()["total"] == 2
        assert filtered.json()["items"][0]["id"] == "Z-both"
        assert client.get(base, params={"sort": "unsupported"}).status_code == 422
