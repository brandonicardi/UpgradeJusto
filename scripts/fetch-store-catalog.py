"""Explicit, bounded public-store acquisition. No DB, login, JS or arbitrary URL.

Raw responses stay local. A cache hit does not pretend its observation is fresh.
Store content is data, never executed. Product reconciliation belongs to catalog.
The20s budget is checked between reads; each blocking network operation is capped
at10s idle timeout. This standalone CLI is not an HTTP import endpoint.
"""

import argparse
import hashlib
import ipaddress
import json
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

CG_URL = "https://static.compragamer.com/productos"
CG_CATEGORIES = {
    27: "cpu",
    48: "cpu",
    26: "motherboard",
    49: "motherboard",
    15: "ram",
    6: "gpu",
    62: "gpu",
    116: "gpu",
    34: "psu",
    7: "case",
    19: "storage",
    81: "storage",
    36: "cooler",
    35: "fan",
}
MAX_BYTES = 8 * 1024 * 1024


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def public_fixed_url(url):
    parts = urllib.parse.urlsplit(url)
    if url != CG_URL or parts.scheme != "https" or parts.username or parts.password:
        raise ValueError("Only the fixed public catalog endpoint is supported")
    addresses = socket.getaddrinfo(parts.hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(
        not ipaddress.ip_address(a[4][0]).is_global for a in addresses
    ):
        raise ValueError("Store resolution is not public")


def acquire(url=CG_URL):
    public_fixed_url(url)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "UpgradeJusto-local-catalog/1.0",
            "Accept": "application/json",
        },
    )
    deadline = time.monotonic() + 20
    chunks = []
    size = 0
    with opener.open(request, timeout=10) as response:
        if (
            response.status != 200
            or response.headers.get_content_type() != "application/json"
        ):
            raise ValueError("Unexpected catalog response")
        declared = response.headers.get("Content-Length")
        if declared and (not declared.isdigit() or int(declared) > MAX_BYTES):
            raise ValueError("Catalog response exceeds bound")
        while True:
            if time.monotonic() >= deadline:
                raise TimeoutError("Catalog deadline exceeded")
            # read1 performs one underlying buffered read; read(n) could wait for
            # all n bytes while a trickling server keeps the idle timeout alive.
            chunk = response.read1(min(65536, MAX_BYTES - size + 1))
            if time.monotonic() >= deadline:
                raise TimeoutError("Catalog deadline exceeded")
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_BYTES:
                raise ValueError("Catalog response exceeds bound")
            chunks.append(chunk)
    return b"".join(chunks)


def inventory(raw):
    rows = json.loads(raw)
    if not isinstance(rows, list) or len(rows) > 20000:
        raise ValueError("Unexpected catalog collection")
    counts = dict.fromkeys(sorted(set(CG_CATEGORIES.values())), 0)
    seen = set()
    excluded = 0
    duplicates = 0
    photo_names = 0
    usable_cash = 0
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Unexpected product record")
        identity = row.get("id_producto")
        if type(identity) is not int or identity <= 0:
            raise ValueError("Invalid store product identity")
        if (
            type(row.get("id_categoria")) is not int
            or type(row.get("id_subcategoria")) is not int
        ):
            raise ValueError("Invalid store category schema")
        if identity in seen:
            duplicates += 1
            continue
        seen.add(identity)
        category = CG_CATEGORIES.get(row.get("id_subcategoria"))
        # Product is separate from a combo/service; notebook RAM is not tower DIMM.
        if row.get("id_categoria") != 5 or category is None:
            excluded += 1
            continue
        counts[category] += 1
        photo_names += bool(row.get("imagenes"))
        price = row.get("precioEspecial")
        stock = row.get("stock")
        usable_cash += (
            type(price) in (int, float)
            and price > 0
            and type(stock) in (int, float)
            and stock > 0
            and row.get("vendible") == 1
            and not row.get("es_outlet")
            and not row.get("visible_solo_en_combo")
            and not row.get("visible_solo_en_ATPC")
        )
    return {
        "general_records": len(rows),
        "tower_records": sum(counts.values()),
        "categories": counts,
        "excluded_records": excluded,
        "duplicate_ids": duplicates,
        "records_with_photo_names_not_verified_photos": photo_names,
        "records_with_reported_usable_cash_offer": usable_cash,
        "thermal_material_records": sum(
            r.get("id_categoria") == 5 and r.get("id_subcategoria") == 67 for r in rows
        ),
        "identity_policy": "Vendor product ID only; no fuzzy merge with curated hardware",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Explicit network refresh; default is cached report only",
    )
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    folder = root / ".local/tiendas/stores/compragamer"
    index = folder / "latest.json"
    try:
        if not args.refresh:
            if not index.is_file():
                parser.error("No cached observation; use --refresh explicitly")
            report = json.loads(index.read_text(encoding="utf-8"))
            print(
                json.dumps(
                    {**report, "cache_hit": True, "new_network_observation": False}
                )
            )
            return 0
        raw = acquire()
        stats = inventory(raw)
        digest = hashlib.sha256(raw).hexdigest()
        folder.mkdir(parents=True, exist_ok=True)
        blob = folder / f"{digest}.json"
        if not blob.exists():
            with blob.open("xb") as stream:
                stream.write(raw)
        report = {
            "source": CG_URL,
            "observed_at": datetime.now(UTC).isoformat(),
            "sha256": digest,
            "bytes": len(raw),
            "stats": stats,
        }
        temporary = folder / "latest.pending.json"
        temporary.write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        temporary.replace(index)
        print(
            json.dumps({**report, "cache_hit": False, "new_network_observation": True})
        )
    except (OSError, ValueError, urllib.error.URLError):
        # Never serialize remote body, TLS internals, credentials or local paths.
        print(json.dumps({"status": "unavailable", "cache_preserved": index.is_file()}))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
