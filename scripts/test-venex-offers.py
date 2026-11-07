"""Synthetic Venex parser/URL guards, no network/DB/provider."""

import importlib.util
import io
import json
import tempfile
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import MagicMock, patch

spec = importlib.util.spec_from_file_location(
    "venex_fetch", Path(__file__).with_name("fetch-venex-offers.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
URL = "https://www.venex.com.ar/componentes-de-pc/placas-de-video/synthetic.html"
HTML = """<meta property="og:type" content="Product">
<meta property="product:retailer_item_id" content="999">
<meta property="og:title" content="SYNTHETIC GPU, not a real offer">
<meta property="product:price:amount" content="123.50">
<meta property="product:price:currency" content="ARS">
<meta property="product:availability" content="in stock">
<meta property="og:image" content="https://www.venex.com.ar/products_images/synthetic.jpg">
<div>Pagando en efectivo, transferencia bancaria o dep&oacute;sito</div>"""


def main():
    result = module.extract(HTML, URL, "gpu", "2026-10-26T00:00:00Z", "synthetic")
    assert result["amount"] == "123.50" and result["condition"] == "cash"
    assert result["availability"] == "in_stock" and result["stock_quantity"] is None
    assert result["mpn"] is None and result["photo_bytes_verified"] is False
    for value in ("0", "0.001", "NaN", "Infinity", "nonsense"):
        unknown = module.extract(
            HTML.replace("123.50", value), URL, "gpu", "synthetic", "synthetic"
        )
        assert unknown["amount"] is None and unknown["currency"] is None
    unavailable = HTML.replace("in stock", "not disclosed")
    assert (
        module.extract(unavailable, URL, "gpu", "synthetic", "synthetic")[
            "availability"
        ]
        == "unknown"
    )
    script_only = HTML.replace("<div>", "<script>").replace("</div>", "</script>")
    assert (
        module.extract(script_only, URL, "gpu", "synthetic", "synthetic")["condition"]
        is None
    )
    for photo in (
        "http://127.0.0.1/x.jpg",
        "https://www.venex.com.ar/products_images/x.svg",
        "https://www.venex.com.ar:9999/products_images/x.jpg",
    ):
        assert (
            module.extract(
                HTML.replace(
                    "https://www.venex.com.ar/products_images/synthetic.jpg", photo
                ),
                URL,
                "gpu",
                "synthetic",
                "synthetic",
            )["image_source_url"]
            is None
        )
    for url in (
        "https://www.venex.com.ar/resultado-busqueda.htm?keywords=test",
        "https://www.venex.com.ar/componentes-de-pc/placas-de-video?sort=price",
        "https://127.0.0.1/componentes-de-pc/placas-de-video",
        "https://www.venex.com.ar:9000/componentes-de-pc/placas-de-video",
        "https://www.venex.com.ar/componentes-de-pc/placas-de-video/%2e%2e/secret.html",
    ):
        try:
            module.safe_page(url)
        except ValueError:
            pass
        else:
            raise AssertionError("Untrusted/forbidden source accepted")
    module.safe_page(URL)
    response = MagicMock()
    response.__enter__.return_value = response
    opener = MagicMock()
    opener.open.return_value = response
    with (
        patch.object(
            module.socket,
            "getaddrinfo",
            return_value=[(None, None, None, None, ("93.184.216.34", 443))],
        ),
        patch.object(module.urllib.request, "build_opener", return_value=opener),
        patch.object(module.time, "monotonic", side_effect=[0, 0, 21]),
    ):
        try:
            module.fetch(URL)
        except TimeoutError:
            pass
        else:
            raise AssertionError("Delayed open received a new body budget")
    response.read1.assert_not_called()
    local = Path(__file__).resolve().parents[1] / ".local/tiendas"
    local.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="venex-guards-", dir=local) as tmp:
        root = Path(tmp)
        cached = root / ".local/tiendas/stores/venex/latest.json"
        cached.parent.mkdir(parents=True)
        sentinel = json.dumps(
            {"records": [{"product_id": "old", "observed_at": "preserve-old-date"}]}
        )
        cached.write_text(sentinel, encoding="utf-8")
        with (
            patch.object(
                module, "__file__", str(root / "scripts/fetch-venex-offers.py")
            ),
            patch.object(module, "CATEGORIES", {"placas-de-video": "gpu"}),
            patch.object(module.time, "sleep"),
            patch("sys.argv", ["venex-fetch", "--refresh", "--max-products", "1"]),
        ):
            output = io.StringIO()
            with (
                patch.object(
                    module, "fetch", return_value=(b"", "User-agent: *\nDisallow: /")
                ) as network,
                redirect_stdout(output),
            ):
                assert module.main() == 1
            assert network.call_count == 1
            assert cached.read_text(encoding="utf-8") == sentinel
            assert json.loads(output.getvalue())["cache_preserved"] is True
            category = f'<a href="{URL}">SYNTHETIC</a>'
            with (
                patch.object(
                    module,
                    "fetch",
                    side_effect=[
                        (b"", "User-agent: *\nAllow: /"),
                        (category.encode(), category),
                        (HTML.encode(), HTML),
                    ],
                ),
                redirect_stdout(io.StringIO()),
            ):
                assert module.main() == 0
            saved = json.loads(cached.read_text(encoding="utf-8"))
            assert (
                saved["partial_batch"] is True and saved["pagination_complete"] is False
            )
            assert len(saved["records"]) == 2
            assert (
                next(r for r in saved["records"] if r["product_id"] == "old")[
                    "observed_at"
                ]
                == "preserve-old-date"
            )
    print("Venex parser and source guards: PASS; synthetic, no network/DB/provider")


if __name__ == "__main__":
    main()
