"""Explicit bounded Venex observation; no forbidden search, DB writes or JS.

Cache and raw pages are local. Extracted vendor identity is not a reconciliation
with a manufacturer/curated part. Missing data remains missing, never zero/stock.
"""

import argparse
import hashlib
import ipaddress
import json
import socket
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from pathlib import Path

HOST = "www.venex.com.ar"
BASE = "https://www.venex.com.ar"
AGENT = "UpgradeJusto-local-catalog/1.0"
CATEGORIES = {
    "microprocesadores": "cpu",
    "motherboards/amd": "motherboard",
    "motherboards/intel": "motherboard",
    "memorias-ram/desktop": "ram",
    "placas-de-video": "gpu",
    "fuentes": "psu",
    "gabinetes": "case",
    "discos-duros-mecanicos": "storage",
    "discos-solidos-ssd": "storage",
    "refrigeracion/coolers-cpu": "cooler",
    "refrigeracion/water-coolers": "cooler",
    "refrigeracion/fan-coolers-y-accesorios": "fan",
    "pastas-termicas": "thermal_material",
}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def safe_page(url, *, robots=False):
    parts = urllib.parse.urlsplit(url)
    allowed = (
        parts.path == "/robots.txt"
        if robots
        else any(
            parts.path == "/componentes-de-pc/" + category
            or (
                parts.path.startswith("/componentes-de-pc/" + category + "/")
                and parts.path.endswith(".html")
            )
            for category in CATEGORIES
        )
    )
    if (
        parts.scheme != "https"
        or parts.hostname != HOST
        or parts.port not in (None, 443)
        or parts.username
        or parts.password
        or parts.query
        or parts.fragment
        or not allowed
        or "%" in parts.path
        or ".." in parts.path
    ):
        raise ValueError("Not an allowed fixed-store public page")


def fetch(url, *, robots=False):
    deadline = time.monotonic() + 20
    safe_page(url, robots=robots)
    addresses = socket.getaddrinfo(HOST, 443, type=socket.SOCK_STREAM)
    if not addresses or any(
        not ipaddress.ip_address(a[4][0]).is_global for a in addresses
    ):
        raise ValueError("Non-public store resolution")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    if time.monotonic() >= deadline:
        raise TimeoutError("Source budget exceeded")
    with opener.open(request, timeout=10) as response:
        if time.monotonic() >= deadline:
            raise TimeoutError("Source budget exceeded")
        mime = response.headers.get_content_type()
        if mime not in (
            ("text/plain",) if robots else ("text/html", "application/xhtml+xml")
        ):
            raise ValueError("Unexpected source content type")
        total, chunks = 0, []
        while True:
            if time.monotonic() >= deadline:
                raise TimeoutError("Source budget exceeded")
            chunk = response.read1(min(65536, 2 * 1024 * 1024 - total + 1))
            if time.monotonic() >= deadline:
                raise TimeoutError("Source budget exceeded")
            if not chunk:
                break
            total += len(chunk)
            if total > 2 * 1024 * 1024:
                raise ValueError("Source exceeds bound")
            chunks.append(chunk)
        raw = b"".join(chunks)
        charset = response.headers.get_content_charset() or "iso-8859-1"
        if charset.lower() not in ("utf-8", "iso-8859-1", "windows-1252"):
            raise ValueError("Unsupported source charset")
        return raw, raw.decode(charset)


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta, self.links, self.text = {}, [], []
        self.ignored = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.ignored += 1
        attrs = dict(attrs)
        if tag == "meta" and attrs.get("property"):
            self.meta[attrs["property"]] = attrs.get("content", "")
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])

    def handle_data(self, data):
        if not self.ignored:
            self.text.append(data)

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.ignored = max(0, self.ignored - 1)


def extract(text, url, category, observed_at, digest):
    page = Page()
    page.feed(text)
    identity = page.meta.get("product:retailer_item_id", "")
    if not identity.isdigit() or page.meta.get("og:type", "").lower() != "product":
        raise ValueError("Not a product with vendor identity")
    amount = None
    try:
        value = Decimal(page.meta.get("product:price:amount", ""))
        if (
            value.is_finite()
            and value > 0
            and page.meta.get("product:price:currency") == "ARS"
        ):
            rounded = value.quantize(Decimal("0.01"))
            if rounded > 0:
                amount = format(rounded, "f")
    except InvalidOperation:
        pass
    availability = {
        "in stock": "in_stock",
        "out of stock": "out_of_stock",
    }.get(page.meta.get("product:availability", "").lower(), "unknown")
    visible = " ".join(" ".join(page.text).lower().split())
    condition = (
        "cash"
        if "pagando en efectivo, transferencia bancaria o depósito" in visible
        else None
    )
    photo = page.meta.get("og:image") or None
    if photo:
        parsed = urllib.parse.urlsplit(photo)
        if (
            parsed.scheme != "https"
            or parsed.hostname != HOST
            or parsed.port not in (None, 443)
            or not parsed.path.startswith("/products_images/")
            or parsed.query
            or parsed.fragment
            or parsed.username
            or parsed.password
            or ".svg" in parsed.path.lower()
            or "%" in parsed.path
            or ".." in parsed.path
        ):
            photo = None
    return {
        "store": "venex",
        "product_id": identity,
        "category": category,
        "name": page.meta.get("og:title", "")[:200],
        "gtin": page.meta.get("og:gtin") or None,
        "mpn": None,
        "source_url": url,
        "observed_at": observed_at,
        "raw_sha256": digest,
        "amount": amount,
        "currency": "ARS" if amount else None,
        "condition": condition,
        "availability": availability,
        "stock_quantity": None,
        "image_source_url": photo,
        "photo_bytes_verified": False,
        "rights_note": "Retailer-linked photograph; rights reserved, no redistribution grant inferred",
        "reconciliation": "vendor_identity_only",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--max-products", type=int, default=26)
    args = parser.parse_args()
    if not 1 <= args.max_products <= 200:
        parser.error(
            "Product batch must be1..200; the report remains explicitly partial"
        )
    folder = Path(__file__).resolve().parents[1] / ".local/integral38/stores/venex"
    index = folder / "latest.json"
    if not args.refresh:
        if not index.is_file():
            parser.error("No cache; request an explicit --refresh")
        print(
            json.dumps(
                {
                    "cache_hit": True,
                    "new_observation": False,
                    "report": json.loads(index.read_text(encoding="utf-8")),
                }
            )
        )
        return 0
    records, failures, queues = [], [], []
    try:
        _, robots_text = fetch(BASE + "/robots.txt", robots=True)
        rules = urllib.robotparser.RobotFileParser()
        rules.parse(robots_text.splitlines())
        folder.mkdir(parents=True, exist_ok=True)
        for segment, category in CATEGORIES.items():
            url = BASE + "/componentes-de-pc/" + segment
            if not rules.can_fetch(AGENT, url):
                failures.append({"category": category, "status": "robots_disallowed"})
                continue
            time.sleep(1)
            try:
                _, text = fetch(url)
                page = Page()
                page.feed(text)
                urls = set()
                for link in page.links:
                    candidate = urllib.parse.urljoin(BASE + "/", link)
                    try:
                        safe_page(candidate)
                    except ValueError:
                        continue
                    if candidate.startswith(url + "/") and candidate.endswith(".html"):
                        urls.add(candidate)
                queues.append((category, list(sorted(urls))))
            except (OSError, ValueError):
                failures.append({"category": category, "status": "unavailable"})
        selected, seen = [], set()
        while any(queue for _, queue in queues) and len(selected) < args.max_products:
            for category, queue in queues:
                if not queue or len(selected) >= args.max_products:
                    continue
                url = queue.pop(0)
                if url not in seen:
                    seen.add(url)
                    selected.append((category, url))
        for category, url in selected:
            if not rules.can_fetch(AGENT, url):
                failures.append({"source_url": url, "status": "robots_disallowed"})
                continue
            time.sleep(1)
            try:
                raw, text = fetch(url)
                digest = hashlib.sha256(raw).hexdigest()
                blob = folder / (digest + ".html")
                if not blob.exists():
                    with blob.open("xb") as stream:
                        stream.write(raw)
                records.append(
                    extract(text, url, category, datetime.now(UTC).isoformat(), digest)
                )
            except (OSError, ValueError):
                failures.append({"source_url": url, "status": "unavailable"})
        if not records:
            print(
                json.dumps(
                    {
                        "status": "unavailable",
                        "cache_preserved": index.is_file(),
                        "failures": len(failures),
                    }
                )
            )
            return 1
        previous = (
            json.loads(index.read_text(encoding="utf-8")) if index.is_file() else {}
        )
        merged = {r["product_id"]: r for r in previous.get("records", [])}
        merged.update({r["product_id"]: r for r in records})
        report = {
            "partial_batch": True,
            "pagination_complete": False,
            "observed_at": datetime.now(UTC).isoformat(),
            "records": list(merged.values()),
            "failures": failures,
        }
        temporary = folder / "latest.pending.json"
        temporary.write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        temporary.replace(index)
        print(
            json.dumps(
                {
                    "records": len(records),
                    "failures": len(failures),
                    "partial_batch": True,
                    "cache_hit": False,
                }
            )
        )
        return 0 if records else 1
    except (OSError, ValueError):
        print(json.dumps({"status": "unavailable", "cache_preserved": index.is_file()}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
