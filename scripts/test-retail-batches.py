"""Synthetic conversion checks; no network, publication or retailer evidence."""

import hashlib
import importlib.util
import io
import json
import tempfile
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "retail_batches", Path(__file__).with_name("prepare-retail-batches.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def main():
    row = {
        "id_producto": 999,
        "nombre": "SYNTHETIC GPU 2.0 - not a real product",
        "codigo_principal": ["SKU: SYNTHETIC-MPN", "UPC: 123456789000"],
        "imagenes": [{"nombre": "synthetic_2.0"}],
        "vendible": 1,
        "stock": 2,
        "precioEspecial": "0.001",
        "precioLista": "123.50",
    }
    result = module.cg_record(row, "gpu", "2026-10-26T00:00:00Z")
    assert result["mpn"] == "SYNTHETIC-MPN" and result["gtin"] == "123456789000"
    assert result["source_url"].endswith("SYNTHETIC_GPU_2_0_not_a_real_product_999")
    assert result["offers"][0]["amount"] is None
    assert result["offers"][1]["amount"] == "123.50"
    assert result["image"]["photo_bytes_verified"] is False
    assert result["image"]["retrieved_at"] == "2026-10-26T00:00:00Z"
    assert "attributes" not in result
    changed = module.cg_record(
        {**row, "codigo_principal": ["SKU: OTHER"]}, "gpu", "same"
    )
    assert changed["variant_key"] != result["variant_key"]
    for flag in ("es_outlet", "visible_solo_en_combo", "visible_solo_en_ATPC"):
        excluded = module.cg_record({**row, flag: 1}, "gpu", "same")
        assert all(item["amount"] is None for item in excluded["offers"])
        assert all(item["availability"] == "unknown" for item in excluded["offers"])
    unknown = module.cg_record({**row, "stock": None}, "gpu", "same")
    assert unknown["offers"][1]["availability"] == "unknown"
    venex_base = {
        "product_id": "999",
        "category": "gpu",
        "name": "SYNTHETIC",
        "source_url": "https://www.venex.com.ar/componentes-de-pc/placas-de-video/synthetic.html",
        "observed_at": "2026-10-26T00:00:00Z",
        "rights_note": "Synthetic only",
        "gtin": "123456789000",
        "mpn": None,
        "availability": "in_stock",
        "amount": "123.50",
        "condition": "cash",
        "image_source_url": None,
    }
    venex = module.venex_record(venex_base)
    assert venex["offers"][0]["amount"] is None
    assert venex["offers"][0]["condition_verified"] is False
    assert venex["mpn"] is None and venex["gtin"] == "123456789000"
    # Vendor junk like the observed gtin "1" stays unknown (null), never
    # published and never "corrected"; only plausible GTINs are kept.
    other_fields = {
        key: value for key, value in venex.items() if key not in ("gtin", "variant_key")
    }
    for value, expected in (
        ("1", None),
        ("00000000", None),
        ("00000000000000", None),
        ("1234567", None),
        ("12345678901", None),
        ("123456789012345", None),
        ("12345678901a", None),
        (None, None),
        ("12345678", "12345678"),
        ("123456789012", "123456789012"),
        ("5032037279079", "5032037279079"),
        ("12345678901234", "12345678901234"),
    ):
        record = module.venex_record({**venex_base, "gtin": value})
        assert record["gtin"] == expected
        assert {
            key: item
            for key, item in record.items()
            if key not in ("gtin", "variant_key")
        } == other_fields
    row = {
        "product_id": "999",
        "source_url": "https://www.venex.com.ar/test.html",
        "amount": "123.50",
    }
    proof = {
        **row,
        "status": 200,
        "condition_verified": True,
        "vendor_id_matches": True,
        "price_visible": True,
        "condition_visible": True,
        "price_text": "$ 123,50",
        "condition_text": "Pagando en efectivo, transferencia bancaria o depósito",
    }
    assert module.verified_venex_amount(row, proof) == "123.50"
    for bad in (
        {**proof, "price_text": "$ 999"},
        {**proof, "product_id": "other"},
        {**proof, "price_visible": False},
        {**proof, "condition_visible": False},
    ):
        assert module.verified_venex_amount(row, bad) is None
    assert module.venex_category({"name": "Caddy Para Discos NB"}) is None
    assert module.venex_category({"name": "Bracket Cooler Master LGA1700"}) is None
    assert (
        module.venex_category({"name": "Gabinete Con Kit Fuente Mouse Y Teclado"})
        is None
    )
    assert module.venex_category({"name": "Fan Cooler TEST Pack x3"}) == "fan"
    assert module.venex_category({"name": "Gabinete TEST"}) == "case"
    local = Path(__file__).resolve().parents[1] / ".local/tiendas"
    local.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="batch-schema-", dir=local) as temp:
        root = Path(temp)
        stores = root / "stores"
        output = root / "batches"
        (stores / "compragamer").mkdir(parents=True)
        output.mkdir()
        manifest = output / "manifest.json"
        manifest.write_text("synthetic previous manifest", encoding="utf-8")
        for mutation in ({"nombre": None}, {"nombre": 123}, {"imagenes": [None]}):
            malformed = {
                "id_producto": 999,
                "id_categoria": 5,
                "id_subcategoria": 6,
                "nombre": "SYNTHETIC",
                "imagenes": [],
                **mutation,
            }
            raw = json.dumps([malformed]).encode()
            digest = hashlib.sha256(raw).hexdigest()
            (stores / "compragamer" / (digest + ".json")).write_bytes(raw)
            (stores / "compragamer/latest.json").write_text(
                json.dumps({"sha256": digest, "observed_at": "2026-10-26T00:00:00Z"}),
                encoding="utf-8",
            )
            stdout = io.StringIO()
            with (
                patch.object(module, "STORES", stores),
                patch.object(module, "OUTPUT", output),
                patch("sys.argv", ["prepare-retail-batches"]),
                redirect_stdout(stdout),
            ):
                assert module.cli() == 1
            assert json.loads(stdout.getvalue()) == {
                "status": "invalid_acquisition_cache",
                "published": False,
            }
            assert "Traceback" not in stdout.getvalue()
            assert manifest.read_text(encoding="utf-8") == "synthetic previous manifest"
    print("Retail batch conversion: PASS; synthetic, no network/DB/publication")


if __name__ == "__main__":
    main()
