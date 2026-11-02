"""Publication-owned reconstruction. No fetch, live freshness or private text copy."""

from datetime import date, datetime
from decimal import Decimal

from upgradejusto.compatibility.basic_manufacturer import resolve_stock_specs
from upgradejusto.pcs.service import PCError
from upgradejusto.retail.technical_validation import validate_technical_binding

from .tower_registry import LOCATORS, NV3_SOURCE, NV3_URL, money, url_class


def stamp(value):
    if type(value) is not str:
        raise ValueError("Invalid captured timestamp")
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        raise ValueError("Timezone required")
    return parsed.isoformat()


def ref_tuple(ref):
    return tuple(
        ref.get(key) for key in ("source_id", "url", "consulted_on", "locator")
    )


class PublicSources:
    def __init__(self, catalog, version, resource_rows):
        self.catalog, self.version = catalog, version
        self.resources = {row["component_id"]: row for row in resource_rows}
        self.rows = tuple(getattr(catalog, "source_rows", ()) or ())
        self.public_refs, self.reference_keys = [], {}
        self.raw_quotes = {}
        for identity, row in self.resources.items():
            for quote in row["offers"]:
                if quote["offer_id"] in self.raw_quotes:
                    raise PCError(409, "Historical offer binding unavailable")
                self.raw_quotes[quote["offer_id"]] = (identity, quote)

    def reference(self, ref, component=None):
        if type(ref) is not dict:
            return None
        key = ref_tuple(ref)
        matches = [row for row in self.rows if ref_tuple(row) == key]
        if len(matches) != 1:
            return None
        row = matches[0]
        try:
            if (
                date.fromisoformat(row["consulted_on"]).isoformat()
                != row["consulted_on"]
            ):
                return None
        except (ValueError, TypeError):
            return None
        selected = (
            [component] if component is not None else tuple(self.catalog.values())
        )
        for part in selected:
            if part is None or (row["source_id"], row["url"]) not in {
                (source.id, source.url) for source in part.sources
            }:
                continue
            resource = self.resources.get(part.id)
            binding = resource["identity"] if resource else None
            cls = url_class(row["url"])
            if (
                cls is None
                and binding
                and binding.get("category") == part.category.value
            ):
                cls = url_class(row["url"], binding)
            if cls is None:
                continue
            if row["url"] == NV3_URL:
                if key != NV3_SOURCE or not self.nv3_identity(part):
                    continue
            if key not in self.reference_keys:
                local = "r" + str(len(self.public_refs) + 1)
                self.reference_keys[key] = local
                self.public_refs.append(
                    {
                        "ref": local,
                        "class": cls,
                        "url": row["url"],
                        "consulted_on": row["consulted_on"],
                        "locator": LOCATORS[cls],
                    }
                )
            return self.reference_keys[key]
        return None

    def nv3_identity(self, component):
        try:
            raw = component.attributes.get("tower_stock_v1")
            envelope = validate_technical_binding(
                raw, component.id, component.model_dump(mode="json"), self.rows
            )
            return (
                component.category == "storage"
                and envelope.identity.manufacturer_part_number == "SNV3S/500G"
                and envelope.data.get("storage_interface") == "M2-NVMe"
                and envelope.data.get("storage_form") == "2280"
            )
        except (ValueError, TypeError, KeyError):
            return False

    def component_references(self, component):
        if component is None:
            return []
        pairs = {(s.id, s.url) for s in component.sources}
        return [
            public
            for row in self.rows
            if (row.get("source_id"), row.get("url")) in pairs
            if (public := self.reference(row, component)) is not None
        ]

    def photo(self, component):
        resource = self.resources.get(component.id)
        if not resource:
            return None
        binding, image = resource["identity"], resource["image_evidence"]
        if not image or (
            binding.get("category") != component.category.value
            or image.get("status") != "verified"
            or image.get("exact_variant") is not True
            or image.get("source_url") != binding.get("source_url")
            or not image.get("rights_note")
            or url_class(image.get("url"), binding, image=True) != "retail_image"
        ):
            return None
        if not self.component_references(component):
            return None
        return {
            "url": image["url"],
            "retrieved_at": stamp(image["retrieved_at"]),
            "rights_notice": "Imagen referenciada del proveedor; no se transfieren derechos",
            "bytes_verified": image.get("photo_bytes_verified") is True,
        }

    def specs(self, component_id):
        part = self.catalog.get(component_id)
        return resolve_stock_specs(part, self.catalog) if part else None

    def bound_field(self, component_id, field):
        specs = self.specs(component_id)
        if specs is None:
            return False, None
        refs = specs.evidence(field)
        if not refs or not all(
            self.reference(r.model_dump(mode="json"), self.catalog[component_id])
            for r in refs
        ):
            return False, None
        return True, specs.fact(field)

    def quote(self, captured):
        if type(captured) is not dict:
            raise PCError(409, "Historical offer binding unavailable")
        pair = self.raw_quotes.get(captured.get("offer_id"))
        if pair is None:
            raise PCError(409, "Historical offer binding unavailable")
        identity, raw = pair
        resource = self.resources[identity]
        binding = resource["identity"]
        fields = (
            "offer_id",
            "component_id",
            "store",
            "product_id",
            "variant_key",
            "amount",
            "currency",
            "condition",
            "availability",
            "stock_quantity",
            "source_url",
        )
        if (
            any(captured.get(k) != raw.get(k) for k in fields)
            or any(
                raw.get(key) != binding.get(key)
                for key in ("store", "product_id", "variant_key", "source_url")
            )
            or raw.get("component_id") != identity
            or raw.get("currency") != "ARS"
        ):
            raise PCError(409, "Historical offer binding unavailable")
        if any(
            stamp(captured.get(k)) != stamp(raw.get(k))
            for k in ("observed_at", "expires_at")
        ):
            raise PCError(409, "Historical offer binding unavailable")
        if raw.get("condition") not in ("cash", "list") or raw.get(
            "availability"
        ) not in (
            "in_stock",
            "out_of_stock",
            "unknown",
        ):
            raise PCError(409, "Historical offer binding unavailable")
        amount = money(raw.get("amount"))
        if (
            Decimal(amount) <= 0
            or url_class(raw.get("source_url"), binding) != "retail_product"
        ):
            raise PCError(409, "Historical offer binding unavailable")
        refs = self.component_references(self.catalog.get(identity))
        if not refs:
            raise PCError(409, "Historical offer binding unavailable")
        return {
            "amount": amount,
            "currency": "ARS",
            "condition": raw["condition"],
            "availability_at_quote": raw["availability"],
            "quoted_at": stamp(raw["observed_at"]),
            "expires_at": stamp(raw["expires_at"]),
            "references": refs,
            "notice": "Cotización histórica, sin garantía de precio/stock actual",
        }
