"""Synthetic fixtures, NOT retailer prices or hardware evidence."""

from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from upgradejusto.catalog.models import Component
from upgradejusto.retail.models import (
    REFERENCE_PRICE_VALIDITY,
    VendorBatch,
    current_offer,
    make_offer,
    retail_url,
)


def synthetic_batch(count=61):
    now = datetime.now(timezone.utc).replace(microsecond=0)
    return {
        "store": "compragamer",
        "source_version": "synthetic-38",
        "raw_sha256": "a" * 64,
        "observed_at": now.isoformat(),
        "partial_batch": True,
        "pagination_complete": False,
        "records": [
            {
                "product_id": str(900000 + n),
                "category": (
                    "cpu",
                    "motherboard",
                    "ram",
                    "gpu",
                    "psu",
                    "case",
                    "storage",
                    "cooler",
                    "fan",
                )[n % 9],
                "name": f"SYNTHETIC TEST ONLY {n}",
                "source_url": f"https://compragamer.com/producto/synthetic_{900000 + n}",
                "mpn": f"SYNTHETIC-MPN-{n}",
                "gtin": None,
                "variant_key": f"synthetic-variant-{n}",
                "identity_verified": True,
                "rights_note": "Synthetic fixture; no actual photograph or retail price",
                "image": None,
                "offers": [
                    {
                        "condition": "cash",
                        "amount": "123.45",
                        "availability": "in_stock",
                        "stock_quantity": 2,
                        "condition_verified": True,
                    },
                    {
                        "condition": "list",
                        "amount": None,
                        "availability": "unknown",
                        "stock_quantity": None,
                        "condition_verified": True,
                    },
                ],
            }
            for n in range(count)
        ],
    }


def test_large_batch_nine_categories_and_honest_unknown():
    batch = VendorBatch.model_validate(synthetic_batch())
    assert len(batch.records) == 61
    assert len({r.category for r in batch.records}) == 9
    r = batch.records[0]
    offer = make_offer(batch, r, r.offers[0], "cg-900000")
    assert offer.expires_at == offer.observed_at + REFERENCE_PRICE_VALIDITY
    assert current_offer(offer, batch.observed_at).status == "fresh"
    assert (
        current_offer(offer, batch.observed_at + timedelta(days=29)).status == "fresh"
    )
    # Exactly 30 days is already outside the half-open validity window.
    assert (
        current_offer(offer, batch.observed_at + timedelta(days=30)).status == "stale"
    )
    assert (
        current_offer(offer, batch.observed_at + timedelta(days=31)).status == "stale"
    )
    unknown = make_offer(batch, r, r.offers[1], "cg-900000")
    assert current_offer(unknown).status == "unavailable"
    assert unknown.amount is None
    assert batch.records[0].mpn != batch.records[0].gtin


@pytest.mark.parametrize(
    "url",
    [
        "http://imagenes.compragamer.com/productos/compragamer_Imganen_general_1.jpg",
        "https://127.0.0.1/a.jpg",
        "https://imagenes.compragamer.com:443/a.jpg",
        "https://imagenes.compragamer.com.evil.test/a.jpg",
        "https://u:p@imagenes.compragamer.com/a.jpg",
        "data:image/png;base64,AA",
        "https://imagenes.compragamer.com/productos/compragamer_Imganen_general_1.svg",
        "https://imagenes.compragamer.com/productos/compragamer_Imganen_general_1.jpg?redirect=x",
        "https://imagenes.compragamer.com/productos/../secret.jpg",
        "https://imagenes.compragamer.com/productos/%2e%2e/secret.jpg",
    ],
)
def test_malicious_photo_urls(url):
    with pytest.raises(ValueError):
        retail_url(url, "compragamer", image=True)


def test_exact_source_mapped_photo_not_claimed_byte_checked():
    data = synthetic_batch(1)
    r = data["records"][0]
    r["image"] = {
        "url": "https://imagenes.compragamer.com/productos/compragamer_Imganen_general_SYNTHETIC-mini.jpg",
        "alt": "SYNTHETIC ONLY",
        "source_url": r["source_url"],
        "retrieved_at": data["observed_at"],
        "rights_note": "URL fixture, not downloaded",
        "exact_variant": True,
        "status": "verified",
        "photo_bytes_verified": False,
    }
    batch = VendorBatch.model_validate(data)
    assert not batch.records[0].image.photo_bytes_verified
    r["image"]["exact_variant"] = False
    with pytest.raises(ValidationError):
        VendorBatch.model_validate(data)


@pytest.mark.parametrize(
    "mutation", ["zero", "duplicate", "extra", "stock", "timezone"]
)
def test_bad_acquisition_rejected(mutation):
    data = synthetic_batch(1)
    if mutation == "zero":
        data["records"][0]["offers"][0]["amount"] = "0.00"
    elif mutation == "duplicate":
        data["records"].append(data["records"][0])
    elif mutation == "extra":
        data["owner_id"] = "untrusted-model"
    elif mutation == "stock":
        data["records"][0]["offers"][0]["stock_quantity"] = 0
    else:
        data["observed_at"] = "2026-10-26T10:00:00"
    with pytest.raises(ValidationError):
        VendorBatch.model_validate(data)


def test_legacy_component_dump_has_no_resource_columns():
    part = Component(
        id="synthetic", category="cpu", name="SYNTHETIC", attributes={}, sources=()
    )
    assert "offers" not in part.model_dump(mode="json")
    assert "image_evidence" not in part.model_dump(mode="json")


def test_vendor_name_canonicalizes_only_boundary_whitespace():
    data = synthetic_batch(1)
    name = "SYNTHETIC  Exact CaSe Model"
    data["records"][0]["name"] = "  " + name + "  "
    record = VendorBatch.model_validate(data).records[0]
    assert record.name == name
