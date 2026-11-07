"""Offline synthetic acquisition guards; no PG/provider/store requests."""

import importlib.util
import io
import json
import tempfile
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import MagicMock, patch

spec = importlib.util.spec_from_file_location(
    "store_fetch", Path(__file__).with_name("fetch-store-catalog.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def main():
    rows = [
        {
            "id_producto": 1,
            "id_categoria": 5,
            "id_subcategoria": 81,
            "precioEspecial": 100,
            "stock": 2,
            "vendible": 1,
            "imagenes": [{"nombre": "synthetic"}],
        },
        {"id_producto": 2, "id_categoria": 55, "id_subcategoria": 27},
        {"id_producto": 3, "id_categoria": 5, "id_subcategoria": 47},
        {
            "id_producto": 4,
            "id_categoria": 5,
            "id_subcategoria": 35,
            "precioEspecial": 100,
            "stock": 0,
            "vendible": 1,
        },
        {"id_producto": 5, "id_categoria": 5, "id_subcategoria": 67},
    ]
    report = module.inventory(json.dumps(rows + [rows[0]]).encode())
    assert report["tower_records"] == 2 and report["duplicate_ids"] == 1
    assert report["excluded_records"] == 3 and report["thermal_material_records"] == 1
    assert report["records_with_reported_usable_cash_offer"] == 1
    assert report["records_with_photo_names_not_verified_photos"] == 1
    for url in (
        "http://static.compragamer.com/productos",
        "https://127.0.0.1/",
        "https://static.compragamer.com@127.0.0.1/productos",
        "https://static.compragamer.com/productos?url=private",
    ):
        try:
            module.public_fixed_url(url)
        except ValueError:
            pass
        else:
            raise AssertionError("Non-fixed source accepted")
    with patch.object(
        module.socket,
        "getaddrinfo",
        return_value=[(None, None, None, None, ("127.0.0.1", 443))],
    ):
        try:
            module.public_fixed_url(module.CG_URL)
        except ValueError:
            pass
        else:
            raise AssertionError("Private DNS accepted")
    assert module.NoRedirect().redirect_request(None) is None
    response = MagicMock()
    response.status = 200
    response.headers.get_content_type.return_value = "application/json"
    response.headers.get.return_value = None
    response.__enter__.return_value = response
    opener = MagicMock()
    opener.open.return_value = response
    with (
        patch.object(module, "public_fixed_url"),
        patch.object(module.urllib.request, "build_opener", return_value=opener),
    ):
        response.read1.side_effect = [b"[]", b""]
        assert module.acquire() == b"[]"
        response.read1.side_effect = [b"x" * (module.MAX_BYTES + 1)]
        try:
            module.acquire()
        except ValueError:
            pass
        else:
            raise AssertionError("Actual byte bound not enforced")
        response.headers.get_content_type.return_value = "text/html"
        try:
            module.acquire()
        except ValueError:
            pass
        else:
            raise AssertionError("Non-JSON MIME accepted")
        response.headers.get_content_type.return_value = "application/json"
        response.read1.side_effect = [b""]
        with patch.object(module.time, "monotonic", side_effect=[0, 0, 21]):
            try:
                module.acquire()
            except TimeoutError:
                pass
            else:
                raise AssertionError("Expired EOF accepted")
    response.read.assert_not_called()
    local = Path(__file__).resolve().parents[1] / ".local/tiendas"
    local.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="store-guards-", dir=local) as tmp:
        root = Path(tmp)
        cached = root / ".local/tiendas/stores/compragamer/latest.json"
        cached.parent.mkdir(parents=True)
        sentinel = '{"synthetic":"preserve-previous-observation"}'
        cached.write_text(sentinel, encoding="utf-8")
        for invalid in ([], {}):
            payload = json.dumps(
                [{"id_producto": 1, "id_categoria": 5, "id_subcategoria": invalid}]
            ).encode()
            output = io.StringIO()
            with (
                patch.object(
                    module, "__file__", str(root / "scripts/fetch-store-catalog.py")
                ),
                patch.object(module, "acquire", return_value=payload),
                patch("sys.argv", ["store-fetch", "--refresh"]),
                redirect_stdout(output),
            ):
                assert module.main() == 1
            assert json.loads(output.getvalue()) == {
                "status": "unavailable",
                "cache_preserved": True,
            }
            assert "Traceback" not in output.getvalue()
            assert cached.read_text(encoding="utf-8") == sentinel
            assert len(list(cached.parent.iterdir())) == 1
    print("Store acquisition synthetic guards: PASS; no network/PG/provider")


if __name__ == "__main__":
    main()
