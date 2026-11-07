"""Synthetic publication checks; no network, database, real caches or evidence."""

import hashlib
import importlib.util
import io
import json
import tempfile
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "sync_reference_batches", Path(__file__).with_name("sync-reference-batches.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

CG_SEEN = "2026-10-26T00:00:00Z"
VENEX_SEEN = "2026-10-27T10:00:00Z"


def cg_rows(price):
    return [
        {
            "id_producto": 901,
            "id_categoria": 5,
            "id_subcategoria": 6,
            "nombre": "SYNTHETIC GPU 2.0 - not a real product",
            "codigo_principal": ["SKU: SYNTH-MPN"],
            "imagenes": [],
            "vendible": 1,
            "stock": 3,
            "precioEspecial": "111.11",
            "precioLista": price,
        },
        {
            "id_producto": 902,
            "id_categoria": 4,
            "id_subcategoria": 6,
            "nombre": "SYNTHETIC NOTEBOOK - filtered by taxonomy",
            "codigo_principal": [],
            "imagenes": [],
            "vendible": 1,
            "stock": 1,
            "precioEspecial": "0.00",
            "precioLista": "0.00",
        },
    ]


def write_cg(stores, rows, observed_at):
    (stores / "compragamer").mkdir(parents=True, exist_ok=True)
    raw = json.dumps(rows).encode("utf-8")
    sha = hashlib.sha256(raw).hexdigest()
    (stores / "compragamer" / (sha + ".json")).write_bytes(raw)
    (stores / "compragamer" / "latest.json").write_text(
        json.dumps({"sha256": sha, "observed_at": observed_at}), encoding="utf-8"
    )
    return sha


def venex_row(observed_at=VENEX_SEEN, amount="45678.00"):
    return {
        "store": "venex",
        "product_id": "900",
        "category": "gpu",
        "name": "Placa de Video SYNTHETIC X - not a real product",
        "gtin": None,
        "mpn": None,
        "source_url": "https://www.venex.com.ar/synthetic/x.html",
        "observed_at": observed_at,
        "raw_sha256": "0" * 64,
        "amount": amount,
        "currency": "ARS",
        "condition": "cash",
        "availability": "in_stock",
        "stock_quantity": None,
        "image_source_url": None,
        "photo_bytes_verified": False,
        "rights_note": "Synthetic only",
        "reconciliation": "vendor_identity_only",
    }


def caddy_row():
    return {
        **venex_row(),
        "product_id": "950",
        "category": "storage",
        "name": "Caddy Para SYNTHETIC NB Grabadora",
    }


def write_venex(stores, rows):
    (stores / "venex").mkdir(parents=True, exist_ok=True)
    (stores / "venex" / "latest.json").write_text(
        json.dumps(
            {
                "partial_batch": True,
                "pagination_complete": False,
                "observed_at": rows[0]["observed_at"],
                "records": rows,
                "failures": [],
            }
        ),
        encoding="utf-8",
    )


def read_manifest(lotes):
    return json.loads((lotes / "manifest.json").read_text(encoding="utf-8"))


def names(manifest, store):
    prefix = module.ENTRY_PREFIX + store + "-"
    return [entry for entry in manifest["files"] if entry.startswith(prefix)]


def proof_for(row, price_text="$ 45.678"):
    return {
        "product_id": row["product_id"],
        "source_url": row["source_url"],
        "status": 200,
        "condition_verified": True,
        "vendor_id_matches": True,
        "price_visible": True,
        "condition_visible": True,
        "price_text": price_text,
        "condition_text": "Pagando en efectivo, transferencia bancaria o depósito",
    }


def batch_of(lotes, entry):
    return json.loads((lotes / Path(entry).name).read_text(encoding="utf-8"))


def main():
    local = Path(__file__).resolve().parents[1] / ".local/tiendas"
    local.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(
        prefix="sync-batches-", dir=local, ignore_cleanup_errors=True
    ) as temp:
        root = Path(temp)
        stores = root / "stores"
        lotes = root / "lotes"
        write_cg(stores, cg_rows("123.50"), CG_SEEN)
        write_venex(stores, [venex_row(), caddy_row()])

        status, summary = module.sync(stores, lotes, {})
        assert status == "ok", summary
        assert summary["published"] is False
        assert summary["network_used"] is False
        assert str(root) not in json.dumps(summary)
        manifest = read_manifest(lotes)
        assert len(manifest["files"]) == 2
        assert all(
            entry.startswith("data/catalogo/lotes/") for entry in manifest["files"]
        )
        assert manifest["published"] is False
        assert manifest["venex_price_condition_pending"] is True
        assert manifest["excluded"] == [
            {"product_id": "950", "reason": "accessory_bundle_or_unclassified"}
        ]
        cg_batch = batch_of(lotes, names(manifest, "compragamer")[0])
        assert cg_batch["observed_at"] == CG_SEEN
        assert cg_batch["records"][0]["offers"][0]["amount"] == "111.11"
        assert cg_batch["records"][0]["offers"][1]["amount"] == "123.50"
        assert len(cg_batch["records"]) == 1
        venex_batch = batch_of(lotes, names(manifest, "venex")[0])
        assert venex_batch["observed_at"] == VENEX_SEEN
        offer = venex_batch["records"][0]["offers"][0]
        assert offer["amount"] is None and offer["condition_verified"] is False

        before_bytes = (lotes / "manifest.json").read_bytes()
        before_files = sorted(p.name for p in lotes.iterdir())
        status, summary = module.sync(stores, lotes, {})
        assert status == "ok"
        assert summary["manifest"]["unchanged"] is True
        assert summary["stores"]["compragamer"]["written"] == 0
        assert summary["stores"]["venex"]["written"] == 0
        assert (lotes / "manifest.json").read_bytes() == before_bytes
        assert sorted(p.name for p in lotes.iterdir()) == before_files
        after = read_manifest(lotes)
        assert len(after["files"]) == len(set(after["files"])) == 2
        assert not list(lotes.glob("*.pending*"))

        previous_manifest = after
        write_cg(stores, cg_rows("999.99"), "2026-10-28T00:00:00Z")
        (stores / "venex" / "latest.json").write_text("roto", encoding="utf-8")
        status, summary = module.sync(stores, lotes, {})
        assert status == "partial", summary
        assert summary["stores"]["venex"]["status"] == "preserved_previous"
        assert summary["stores"]["venex"]["reason"] == "cache_unreadable"
        assert summary["stores"]["venex"]["preserved_entries"] == 1
        assert summary["stores"]["compragamer"]["status"] == "updated"
        manifest = read_manifest(lotes)
        assert names(manifest, "venex") == names(previous_manifest, "venex")
        assert manifest["excluded"] == previous_manifest["excluded"]
        assert (
            manifest["venex_price_condition_pending"]
            == previous_manifest["venex_price_condition_pending"]
        )
        assert names(manifest, "compragamer") != names(previous_manifest, "compragamer")
        stale = [
            entry
            for entry in previous_manifest["files"]
            if entry.startswith(module.ENTRY_PREFIX + "compragamer-")
        ][0]
        assert (lotes / Path(stale).name).is_file()
        refreshed = batch_of(lotes, names(manifest, "compragamer")[0])
        assert refreshed["records"][0]["offers"][1]["amount"] == "999.99"
        step3_manifest = manifest

        cg_ok = stores / "compragamer" / "latest.json"
        cg_ok.write_text(
            json.dumps({"sha256": "f" * 64, "observed_at": "2026-10-28T00:00:00Z"}),
            encoding="utf-8",
        )
        write_venex(stores, [venex_row("2026-10-28T09:00:00Z"), caddy_row()])
        status, summary = module.sync(stores, lotes, {})
        assert status == "partial", summary
        assert summary["stores"]["compragamer"]["status"] == "preserved_previous"
        assert summary["stores"]["compragamer"]["reason"] == "cache_missing"
        assert summary["stores"]["venex"]["status"] == "updated"
        manifest = read_manifest(lotes)
        assert names(manifest, "compragamer") == names(step3_manifest, "compragamer")
        new_venex = names(manifest, "venex")
        assert len(new_venex) == 1
        assert new_venex != names(step3_manifest, "venex")
        assert all(
            batch_of(lotes, entry)["observed_at"] == "2026-10-28T09:00:00Z"
            for entry in new_venex
        )
        step4_manifest = manifest

        write_cg(stores, cg_rows("123.50"), CG_SEEN)
        (stores / "venex" / "latest.json").write_text(
            json.dumps({"records": []}), encoding="utf-8"
        )
        status, summary = module.sync(stores, lotes, {})
        assert status == "partial", summary
        assert summary["stores"]["compragamer"]["status"] == "updated"
        assert summary["stores"]["venex"]["status"] == "preserved_previous"
        assert summary["stores"]["venex"]["reason"] == "cache_empty"
        manifest = read_manifest(lotes)
        assert names(manifest, "venex") == names(step4_manifest, "venex")
        assert manifest["excluded"] == [
            {"product_id": "950", "reason": "accessory_bundle_or_unclassified"}
        ]
        assert manifest["venex_price_condition_pending"] is True

    with tempfile.TemporaryDirectory(
        prefix="sync-batches-proof-", dir=local, ignore_cleanup_errors=True
    ) as temp:
        root = Path(temp)
        stores = root / "stores"
        lotes = root / "lotes"
        row = venex_row()
        write_cg(stores, cg_rows("123.50"), CG_SEEN)
        write_venex(stores, [row, caddy_row()])
        status, summary = module.sync(
            stores, lotes, {row["product_id"]: proof_for(row)}
        )
        assert status == "ok"
        assert summary["stores"]["venex"]["usable_prices"] == 1
        manifest = read_manifest(lotes)
        assert manifest["venex_price_condition_pending"] is False
        offer = batch_of(lotes, names(manifest, "venex")[0])["records"][0]["offers"][0]
        assert offer["amount"] == row["amount"]
        assert offer["condition_verified"] is True

        root2 = root / "alt"
        stores2 = root2 / "stores"
        lotes2 = root2 / "lotes"
        write_cg(stores2, cg_rows("123.50"), CG_SEEN)
        write_venex(stores2, [row, caddy_row()])
        bad = proof_for(row, price_text="$ 999")
        status, summary = module.sync(stores2, lotes2, {row["product_id"]: bad})
        assert status == "ok"
        assert summary["stores"]["venex"]["usable_prices"] == 0
        manifest = read_manifest(lotes2)
        assert manifest["venex_price_condition_pending"] is True
        offer = batch_of(lotes2, names(manifest, "venex")[0])["records"][0]["offers"][0]
        assert offer["amount"] is None and offer["amount"] != 0

        try:
            module.load_proofs(Path(__file__))
        except ValueError:
            pass
        else:
            raise AssertionError("Evidence outside the local research dir accepted")

    with tempfile.TemporaryDirectory(
        prefix="sync-batches-cli-", dir=local, ignore_cleanup_errors=True
    ) as temp:
        root = Path(temp)
        stores = root / "stores"
        lotes = root / "lotes"
        write_cg(stores, cg_rows("123.50"), CG_SEEN)
        write_venex(stores, [venex_row(), caddy_row()])
        stdout = io.StringIO()
        with (
            patch.object(module, "STORES", stores),
            patch.object(module, "LOTES", lotes),
            patch("sys.argv", ["sync-reference-batches"]),
            redirect_stdout(stdout),
        ):
            assert module.cli() == 0
        printed = json.loads(stdout.getvalue())
        assert printed["status"] == "ok"
        assert printed["published"] is False
        assert str(root) not in stdout.getvalue()
    print("Reference batch sync: PASS; synthetic, no network/DB/real caches")


if __name__ == "__main__":
    main()
