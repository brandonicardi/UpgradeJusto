"""Convert acquired store caches to bounded retail38 batches, without publishing.

Vendor identity is not technical reconciliation. No attributes, benchmark values
or current prices are invented. No network, database or credential access.
"""

import argparse
import hashlib
import importlib.util
import json
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
STORES = ROOT / ".local/integral38/stores"
OUTPUT = ROOT / ".local/integral38/batches"


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


def cg_source(row):
    # Vendor generateUrl observed in chunk-6ORE2SJ2.js: JS /[^\w]+/gi.
    slug = re.sub(r"[^A-Za-z0-9_]+", "_", row["nombre"].strip())
    return f"https://compragamer.com/producto/{slug}_{row['id_producto']}"


def cg_record(row, category, observed_at):
    codes = row.get("codigo_principal") or []
    if not isinstance(codes, list) or any(not isinstance(c, str) for c in codes):
        raise ValueError("Unrecognized vendor identifier schema")
    mpns = [c[5:].strip() for c in codes if c.startswith("SKU: ") and c[5:].strip()]
    gtins = [c[5:].strip() for c in codes if c.startswith("UPC: ") and c[5:].strip()]
    name = row["nombre"]
    if not isinstance(name, str) or not name.strip() or len(name) > 200:
        raise ValueError("Vendor name outside accepted contract")
    source = cg_source(row)
    product = str(row["id_producto"])
    rights = "Retailer-linked photo; rights reserved, no redistribution grant inferred"
    image = None
    photos = row.get("imagenes") or []
    if not isinstance(photos, list) or any(
        not isinstance(item, dict) for item in photos
    ):
        raise ValueError("Unrecognized vendor image collection")
    if photos:
        photo = photos[0].get("nombre")
        if (
            not isinstance(photo, str)
            or not re.fullmatch(r"[A-Za-z0-9_.-]+", photo)
            or ".." in photo
        ):
            raise ValueError("Unrecognized vendor image name")
        image = {
            "url": "https://imagenes.compragamer.com/productos/"
            f"compragamer_Imganen_general_{photo}-mini.jpg",
            "alt": name,
            "source_url": source,
            "retrieved_at": observed_at,
            "rights_note": rights,
            "exact_variant": True,
            "status": "verified",
            # URL mapped by exact vendor product; this does NOT verify the bytes.
            "photo_bytes_verified": False,
        }
    saleable = (
        row.get("vendible") == 1
        and not row.get("es_outlet")
        and not row.get("visible_solo_en_combo")
        and not row.get("visible_solo_en_ATPC")
    )
    stock = row.get("stock")
    stock_known = type(stock) is int and stock >= 0
    availability = (
        ("in_stock" if stock else "out_of_stock")
        if stock_known and saleable
        else "unknown"
    )
    offers = []
    for condition, field in (("cash", "precioEspecial"), ("list", "precioLista")):
        amount = None
        try:
            value = Decimal(str(row.get(field)))
            rounded = value.quantize(Decimal("0.01"))
            if saleable and value.is_finite() and rounded > 0:
                amount = format(rounded, "f")
        except InvalidOperation:
            pass
        offers.append(
            {
                "condition": condition,
                "amount": amount,
                "availability": availability,
                "stock_quantity": stock if stock_known and saleable else None,
                "condition_verified": True,
            }
        )
    return {
        "product_id": product,
        "category": category,
        "name": name,
        "source_url": source,
        "mpn": mpns[0] if len(mpns) == 1 else None,
        "gtin": gtins[0] if len(gtins) == 1 else None,
        "variant_key": "cg-" + product + "-" + digest(sorted(codes)),
        "identity_verified": True,
        "rights_note": rights,
        "image": image,
        "offers": offers,
    }


def verified_venex_amount(row, proof):
    if not proof or not all(
        proof.get(key) is True
        for key in (
            "condition_verified",
            "vendor_id_matches",
            "price_visible",
            "condition_visible",
        )
    ):
        return None
    if (
        proof.get("product_id") != row["product_id"]
        or proof.get("source_url") != row["source_url"]
        or proof.get("status") != 200
        or proof.get("condition_text")
        != "Pagando en efectivo, transferencia bancaria o depósito"
    ):
        return None
    match = re.fullmatch(
        r"\$\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)(?:,([0-9]{2}))?",
        proof.get("price_text", ""),
    )
    if not match or row.get("amount") is None:
        return None
    amount = Decimal(match[1].replace(".", "") + "." + (match[2] or "00"))
    return row["amount"] if amount > 0 and amount == Decimal(row["amount"]) else None


def venex_record(row, proof=None):
    image = None
    photo = row.get("image_source_url")
    if photo and re.fullmatch(
        r"/products_images/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)",
        urlsplit(photo).path,
    ):
        image = {
            "url": row["image_source_url"],
            "alt": row["name"],
            "source_url": row["source_url"],
            "retrieved_at": row["observed_at"],
            "rights_note": row["rights_note"],
            "exact_variant": True,
            "status": "verified",
            "photo_bytes_verified": False,
        }
    # Text alone is not enough: only explicit real-browser evidence associating
    # the same visible price and condition on this exact vendor product enables it.
    amount = verified_venex_amount(row, proof)
    return {
        "product_id": row["product_id"],
        "category": row["category"],
        "name": row["name"],
        "source_url": row["source_url"],
        "mpn": row.get("mpn"),
        "gtin": row.get("gtin"),
        "variant_key": "venex-"
        + row["product_id"]
        + "-"
        + digest([row["source_url"], row.get("mpn"), row.get("gtin")]),
        "identity_verified": True,
        "rights_note": row["rights_note"],
        "image": image,
        "offers": [
            {
                "condition": "cash",
                "amount": amount,
                "availability": row["availability"],
                "stock_quantity": None,
                "condition_verified": amount is not None,
            }
        ],
    }


def venex_category(row):
    """Category from explicit product title, not its broad navigation bucket.

    Only classification, never an inferred socket, capacity, wattage or benchmark.
    Bundles/accessories stay excluded rather than inflating tower counts.
    """
    name = row["name"].casefold()
    if any(
        word in name
        for word in ("caddy", "bracket", "soporte", "kit fuente", "mouse", "teclado")
    ):
        return None
    prefixes = (
        ("procesador ", "cpu"),
        ("motherboard ", "motherboard"),
        ("memoria ram ", "ram"),
        ("placa de video ", "gpu"),
        ("fuente ", "psu"),
        ("gabinete ", "case"),
        ("disco ", "storage"),
        ("fan cooler ", "fan"),
        ("water cooler ", "cooler"),
        ("cooler cpu ", "cooler"),
    )
    return next(
        (category for prefix, category in prefixes if name.startswith(prefix)), None
    )


def save(batch):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / (batch["store"] + "-" + digest(batch) + ".json")
    if not path.exists():
        with path.open("x", encoding="utf-8") as stream:
            json.dump(batch, stream, ensure_ascii=False, indent=2)
    return path.relative_to(ROOT).as_posix()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--venex-condition-evidence", type=Path)
    args = parser.parse_args()
    proofs = {}
    if args.venex_condition_evidence:
        path = args.venex_condition_evidence.resolve()
        research = (ROOT / ".local/integral38/research").resolve()
        if (
            path.parent != research
            or path.suffix != ".json"
            or path.stat().st_size > 1048576
        ):
            raise ValueError("Expected bounded local acquisition evidence")
        proofs = {
            item["product_id"]: item
            for item in json.loads(path.read_text(encoding="utf-8"))["checks"]
        }
    spec = importlib.util.spec_from_file_location(
        "store_taxonomy", Path(__file__).with_name("fetch-store-catalog.py")
    )
    taxonomy = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(taxonomy)
    cg = json.loads((STORES / "compragamer/latest.json").read_text(encoding="utf-8"))
    raw = (STORES / "compragamer" / (cg["sha256"] + ".json")).read_bytes()
    if hashlib.sha256(raw).hexdigest() != cg["sha256"]:
        raise ValueError("Cached source hash mismatch")
    taxonomy.inventory(raw)
    records = [
        cg_record(
            row, taxonomy.CG_CATEGORIES[row["id_subcategoria"]], cg["observed_at"]
        )
        for row in json.loads(raw)
        if row.get("id_categoria") == 5
        and row.get("id_subcategoria") in taxonomy.CG_CATEGORIES
    ]
    batches = [
        save(
            {
                "store": "compragamer",
                "source_version": "cg-" + digest([cg["sha256"], cg["observed_at"]]),
                "raw_sha256": cg["sha256"],
                "observed_at": cg["observed_at"],
                "partial_batch": False,
                "pagination_complete": True,
                "records": records,
            }
        )
    ]
    venex = json.loads((STORES / "venex/latest.json").read_text(encoding="utf-8"))
    venex_count = 0
    usable_venex = 0
    excluded = []
    for row in venex["records"]:
        category = venex_category(row)
        if category is None:
            excluded.append(
                {
                    "product_id": row["product_id"],
                    "reason": "accessory_bundle_or_unclassified",
                }
            )
            continue
        row = {**row, "category": category}
        proof = proofs.get(row["product_id"])
        record = venex_record(row, proof)
        usable_venex += record["offers"][0]["amount"] is not None
        # Separate observations retain each product's real timestamp, not the
        # refreshed cache index timestamp or a later product's consultation time.
        batches.append(
            save(
                {
                    "store": "venex",
                    "source_version": "venex-"
                    + digest([row["raw_sha256"], row["observed_at"], proof]),
                    "raw_sha256": row["raw_sha256"],
                    "observed_at": row["observed_at"],
                    "partial_batch": True,
                    "pagination_complete": False,
                    "records": [record],
                }
            )
        )
        venex_count += 1
    manifest = {
        "files": batches,
        "excluded": excluded,
        "published": False,
        "venex_price_condition_pending": usable_venex != venex_count,
    }
    pending = OUTPUT / "manifest.pending.json"
    pending.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    pending.replace(OUTPUT / "manifest.json")
    print(
        json.dumps(
            {
                "compragamer_records": len(records),
                "venex_records": venex_count,
                "venex_usable_prices": usable_venex,
                "files": batches,
                "published": False,
                "technical_reconciliation": False,
            }
        )
    )


def cli():
    try:
        main()
        return 0
    except (OSError, ValueError, TypeError, KeyError):
        print(json.dumps({"status": "invalid_acquisition_cache", "published": False}))
        return 1


if __name__ == "__main__":
    raise SystemExit(cli())
