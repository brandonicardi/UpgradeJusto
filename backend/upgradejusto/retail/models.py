"""Closed, bounded untrusted acquisition input and public retail evidence."""

import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

Text = Annotated[str, StringConstraints(strict=True, min_length=1, max_length=500)]
Identifier = Annotated[
    str, StringConstraints(strict=True, pattern=r"^[A-Za-z0-9_-]{1,100}$")
]
Store = Literal["compragamer", "venex"]

# Single source of truth for how long an observed reference price stays valid.
REFERENCE_PRICE_VALIDITY = timedelta(days=30)


class Closed(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


def retail_url(value, store=None, image=False):
    if not isinstance(value, str) or len(value) > 2000:
        raise ValueError("Invalid retail URL")
    if any(ord(c) <= 32 for c in value) or any(c in value for c in "\\%"):
        raise ValueError("Noncanonical URL")
    parsed = urlsplit(value)
    hosts = {
        "compragamer": {"compragamer.com", "www.compragamer.com"},
        "venex": {"venex.com.ar", "www.venex.com.ar"},
    }
    if image:
        hosts["compragamer"] = {"imagenes.compragamer.com"}
    allowed = hosts[store] if store else set.union(*hosts.values())
    if (
        parsed.scheme != "https"
        or parsed.netloc not in allowed
        or parsed.username
        or parsed.password
        or parsed.fragment
        or parsed.query
        or "/../" in parsed.path
        or "//" in parsed.path
    ):
        raise ValueError("URL outside retailer policy")
    if image:
        if not re.fullmatch(r"/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)", parsed.path):
            raise ValueError("Unsupported image path/type")
        if parsed.hostname == "imagenes.compragamer.com":
            if not parsed.path.startswith("/productos/compragamer_Imganen_general_"):
                raise ValueError("Unsupported CG image path")
        elif not parsed.path.startswith("/products_images/"):
            raise ValueError("Unsupported Venex image path")
    elif not parsed.path or parsed.path == "/":
        raise ValueError("Product source required")
    return value


class ImageEvidence(Closed):
    url: str | None = Field(default=None, max_length=2000)
    alt: Text
    source_url: str = Field(max_length=2000)
    retrieved_at: datetime
    rights_note: Text
    exact_variant: bool
    status: Literal["verified", "unavailable", "quarantined"]
    photo_bytes_verified: bool = False

    @model_validator(mode="after")
    def safe(self):
        retail_url(self.source_url)
        if self.retrieved_at.tzinfo is None:
            raise ValueError("Timezone required")
        if self.url is not None:
            retail_url(self.url, image=True)
        if self.status == "verified" and (not self.exact_variant or not self.url):
            raise ValueError("Exact image evidence required")
        return self


class Offer(Closed):
    offer_id: str
    store: Store
    product_id: Identifier
    component_id: str
    variant_key: Text
    amount: str | None
    currency: Literal["ARS"] = "ARS"
    condition: Literal["cash", "list"]
    availability: Literal["in_stock", "out_of_stock", "unknown"]
    stock_quantity: int | None
    source_url: str
    observed_at: datetime
    expires_at: datetime
    status: Literal["fresh", "stale", "unavailable"]


class OfferInput(Closed):
    condition: Literal["cash", "list"]
    amount: str | None = Field(default=None, pattern=r"^[0-9]{1,12}\.[0-9]{2}$")
    availability: Literal["in_stock", "out_of_stock", "unknown"]
    stock_quantity: int | None = Field(default=None, ge=0, le=10000000, strict=True)
    condition_verified: bool

    @field_validator("amount")
    @classmethod
    def positive(cls, value):
        if value is not None and Decimal(value) <= 0:
            raise ValueError("Unknown price must be null, not zero")
        return value

    @model_validator(mode="after")
    def stock_consistent(self):
        if self.stock_quantity == 0 and self.availability == "in_stock":
            raise ValueError("Conflicting stock")
        if self.stock_quantity and self.availability == "out_of_stock":
            raise ValueError("Conflicting stock")
        return self


class VendorRecord(Closed):
    product_id: Identifier
    category: Literal[
        "cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan"
    ]
    name: Annotated[str, StringConstraints(strict=True, min_length=1, max_length=200)]
    source_url: str = Field(max_length=2000)
    mpn: Text | None = None
    gtin: Text | None = None
    variant_key: Text
    identity_verified: bool
    rights_note: Text
    image: ImageEvidence | None = None
    offers: tuple[OfferInput, ...] = Field(max_length=2)

    @field_validator("name")
    @classmethod
    def canonical_name(cls, value):
        if not value.strip() or any(ord(c) < 32 for c in value):
            raise ValueError("Invalid product name")
        return value.strip()

    @model_validator(mode="after")
    def unique_conditions(self):
        if len({o.condition for o in self.offers}) != len(self.offers):
            raise ValueError("Duplicate price condition")
        if not self.name.strip() or any(ord(c) < 32 for c in self.name):
            raise ValueError("Invalid product name")
        return self


class VendorBatch(Closed):
    store: Store
    source_version: Identifier
    raw_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    observed_at: datetime
    partial_batch: bool
    pagination_complete: bool
    records: tuple[VendorRecord, ...] = Field(min_length=1, max_length=5000)

    @model_validator(mode="after")
    def consistent(self):
        if self.observed_at.tzinfo is None:
            raise ValueError("Timezone required")
        if len({r.product_id for r in self.records}) != len(self.records):
            raise ValueError("Duplicate vendor identity")
        if self.partial_batch and self.pagination_complete:
            raise ValueError("Partial batch cannot claim complete pagination")
        for record in self.records:
            retail_url(record.source_url, self.store)
            if record.image:
                retail_url(record.image.source_url, self.store)
                if record.image.source_url != record.source_url:
                    raise ValueError("Image must reference exact product source")
                if record.image.url:
                    retail_url(record.image.url, self.store, image=True)
        return self


def current_offer(offer, now=None):
    """Recompute freshness on reads, never mutate stored quotes/publications."""
    now = now or datetime.now(timezone.utc)
    status = "unavailable"
    if offer.amount is not None and offer.status != "unavailable":
        status = "fresh" if offer.observed_at <= now < offer.expires_at else "stale"
    return offer.model_copy(update={"status": status})


def make_offer(batch, record, item, component_id):
    return Offer(
        offer_id=f"{component_id}:{batch.source_version}:{item.condition}",
        store=batch.store,
        product_id=record.product_id,
        component_id=component_id,
        variant_key=record.variant_key,
        amount=item.amount,
        condition=item.condition,
        availability=item.availability,
        stock_quantity=item.stock_quantity,
        source_url=record.source_url,
        observed_at=batch.observed_at,
        expires_at=batch.observed_at + REFERENCE_PRICE_VALIDITY,
        status="fresh" if item.amount and item.condition_verified else "unavailable",
    )


def usable_offers(offers, condition, now=None):
    """Budget consumers must explicitly choose cash/list; unknown is never zero."""
    return tuple(
        quoted
        for offer in offers
        if (quoted := current_offer(offer, now)).condition == condition
        and quoted.status == "fresh"
        and quoted.availability == "in_stock"
        and quoted.amount is not None
    )
