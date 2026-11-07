"""Offline guards for the combined reference-price runner; no network/PG.

Each reader runs as a real child process. Saved responses are injected into
the children by synthetic wrapper scripts that replace every network call
site and refuse urllib opens, so no real request is ever attempted. The
time cut is proven with a real stuck child: the runner must kill it, and
the child's late sentinel file must never appear afterwards.
"""

import importlib.util
import json
import tempfile
import time
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
REPO = SCRIPTS.parent
CG_SCRIPT = SCRIPTS / "fetch-store-catalog.py"
VENEX_SCRIPT = SCRIPTS / "fetch-venex-offers.py"
STUCK_SECONDS = 5.0


def load(filename, module_name):
    spec = importlib.util.spec_from_file_location(module_name, SCRIPTS / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


runner = load("fetch-reference-prices.py", "reference_prices")

CG_PAYLOAD = json.dumps(
    [
        {
            "id_producto": 1,
            "id_categoria": 5,
            "id_subcategoria": 81,
            "precioEspecial": 100,
            "stock": 2,
            "vendible": 1,
        }
    ]
).encode()
VENEX_URL = "https://www.venex.com.ar/componentes-de-pc/placas-de-video/synthetic.html"
VENEX_CATEGORY = f'<a href="{VENEX_URL}">SYNTHETIC</a>'
VENEX_HTML = """<meta property="og:type" content="Product">
<meta property="product:retailer_item_id" content="999">
<meta property="og:title" content="SYNTHETIC GPU, not a real offer">
<meta property="product:price:amount" content="123.50">
<meta property="product:price:currency" content="ARS">
<meta property="product:availability" content="in stock">
<div>Pagando en efectivo, transferencia bancaria o dep&oacute;sito</div>"""
VENEX_ROBOTS = "User-agent: *\nAllow: /"


def network_refusal_lines():
    # Any real urllib open inside a child aborts loudly: tests stay offline.
    return [
        "import urllib.error",
        "import urllib.request",
        "def _refuse(self, *args, **kwargs):",
        "    raise AssertionError('real network attempted')",
        "urllib.request.OpenerDirector.open = _refuse",
    ]


def write_child(root, name, lines):
    path = root / name
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def cg_child(root, *, down):
    lines = (
        [
            "import importlib.util",
            "from pathlib import Path",
        ]
        + network_refusal_lines()
        + [
            "root = Path(" + repr(str(root)) + ")",
            "spec = importlib.util.spec_from_file_location('cg_reader', "
            + repr(str(CG_SCRIPT))
            + ")",
            "module = importlib.util.module_from_spec(spec)",
            "spec.loader.exec_module(module)",
            "module.__file__ = str(root / 'scripts' / 'fetch-store-catalog.py')",
        ]
    )
    lines.append("def _acquire():")
    if down:
        lines.append("    raise urllib.error.URLError('synthetic down')")
    else:
        lines.append("    return " + repr(CG_PAYLOAD))
    lines += ["module.acquire = _acquire", "raise SystemExit(module.main())"]
    return {
        "store": "compragamer",
        "file": str(write_child(root, "cg-child.py", lines)),
    }


def venex_child(root, *, down):
    lines = (
        [
            "import importlib.util",
            "from pathlib import Path",
        ]
        + network_refusal_lines()
        + [
            "root = Path(" + repr(str(root)) + ")",
            "spec = importlib.util.spec_from_file_location('venex_reader', "
            + repr(str(VENEX_SCRIPT))
            + ")",
            "module = importlib.util.module_from_spec(spec)",
            "spec.loader.exec_module(module)",
            "module.__file__ = str(root / 'scripts' / 'fetch-venex-offers.py')",
            "module.CATEGORIES = dict([('placas-de-video', 'gpu')])",
            "module.time.sleep = lambda seconds: None",
        ]
    )
    if down:
        lines.append("def _fetch(*args, **kwargs):")
        lines.append("    raise urllib.error.URLError('synthetic down')")
    else:
        saved = [
            (b"", VENEX_ROBOTS),
            (VENEX_CATEGORY.encode("utf-8"), VENEX_CATEGORY),
            (VENEX_HTML.encode("utf-8"), VENEX_HTML),
        ]
        lines.append("_saved = iter(" + repr(saved) + ")")
        lines.append("def _fetch(*args, **kwargs):")
        lines.append("    return next(_saved)")
    lines += ["module.fetch = _fetch", "raise SystemExit(module.main())"]
    return {
        "store": "venex",
        "file": str(write_child(root, "venex-child.py", lines)),
    }


def stuck_child(root, name, sentinel):
    # Writes its sentinel only after STUCK_SECONDS: if the runner killed the
    # process, the sentinel can never appear.
    lines = [
        "import json",
        "import pathlib",
        "import time",
        "time.sleep(" + repr(STUCK_SECONDS) + ")",
        "pathlib.Path(" + repr(str(sentinel)) + ").write_text(",
        "    'late-publication', encoding='utf-8')",
        "print(json.dumps({'status': 'ok'}))",
    ]
    return {"store": name, "file": str(write_child(root, name + "-stuck.py", lines))}


def both_readers_run_with_saved_responses(root):
    cg_index = root / ".local/tiendas/stores/compragamer/latest.json"
    vx_index = root / ".local/tiendas/stores/venex/latest.json"
    code, summary = runner.run_readers(
        budget_seconds=120.0,
        pause_seconds=0.0,
        venex_max_products=1,
        readers=(cg_child(root, down=False), venex_child(root, down=False)),
    )
    assert code == 0 and summary["all_succeeded"] is True
    assert {entry["store"]: entry["status"] for entry in summary["stores"]} == {
        "compragamer": "ok",
        "venex": "ok",
    }
    report = json.loads(cg_index.read_text(encoding="utf-8"))
    assert report["stats"]["tower_records"] == 1
    assert report["bytes"] == len(CG_PAYLOAD) and report["observed_at"]
    saved = json.loads(vx_index.read_text(encoding="utf-8"))
    assert saved["partial_batch"] is True and len(saved["records"]) == 1
    assert saved["records"][0]["product_id"] == "999"
    text = json.dumps(summary)
    assert str(root) not in text and "Traceback" not in text


def down_site_keeps_previous_batches(root):
    cg_index = root / ".local/tiendas/stores/compragamer/latest.json"
    vx_index = root / ".local/tiendas/stores/venex/latest.json"
    cg_index.parent.mkdir(parents=True, exist_ok=True)
    vx_index.parent.mkdir(parents=True, exist_ok=True)
    cg_sentinel = '{"synthetic":"preserve-previous-observation"}'
    cg_index.write_text(cg_sentinel, encoding="utf-8")
    vx_sentinel = json.dumps(
        {"records": [{"product_id": "998", "observed_at": "preserve-old-date"}]}
    )
    vx_index.write_text(vx_sentinel, encoding="utf-8")
    code, summary = runner.run_readers(
        budget_seconds=120.0,
        pause_seconds=1.0,
        venex_max_products=1,
        readers=(cg_child(root, down=True), venex_child(root, down=False)),
    )
    entries = {entry["store"]: entry for entry in summary["stores"]}
    assert code == 1 and entries["compragamer"]["status"] == "unavailable"
    assert entries["compragamer"]["cache_preserved"] is True
    assert entries["venex"]["status"] == "ok"  # the other site was still tried
    assert cg_index.read_text(encoding="utf-8") == cg_sentinel
    merged = json.loads(vx_index.read_text(encoding="utf-8"))
    assert len(merged["records"]) == 2
    old = next(row for row in merged["records"] if row["product_id"] == "998")
    assert old["observed_at"] == "preserve-old-date"
    vx_after_ok = vx_index.read_text(encoding="utf-8")
    code, summary = runner.run_readers(
        budget_seconds=120.0,
        pause_seconds=1.0,
        venex_max_products=1,
        readers=(cg_child(root, down=True), venex_child(root, down=True)),
    )
    assert code == 1 and all(
        entry["status"] == "unavailable" for entry in summary["stores"]
    )
    assert all(entry["cache_preserved"] is True for entry in summary["stores"])
    assert cg_index.read_text(encoding="utf-8") == cg_sentinel
    assert vx_index.read_text(encoding="utf-8") == vx_after_ok


def budget_cut_kills_the_child_and_publishes_nothing(root):
    first_sentinel = root / "sentinel-compragamer.json"
    second_sentinel = root / "sentinel-venex.json"
    first = stuck_child(root, "compragamer", first_sentinel)
    second = stuck_child(root, "venex", second_sentinel)
    started = time.monotonic()
    code, summary = runner.run_readers(
        budget_seconds=0.4,
        pause_seconds=0.0,
        venex_max_products=1,
        readers=(first, second),
    )
    elapsed = time.monotonic() - started
    entries = {entry["store"]: entry for entry in summary["stores"]}
    assert entries["compragamer"] == {
        "store": "compragamer",
        "status": "budget_exceeded",
        "started": True,
    }
    assert entries["venex"] == {
        "store": "venex",
        "status": "budget_exceeded",
        "started": False,
    }
    assert code == 1 and summary["all_succeeded"] is False
    assert elapsed < 2.0 and summary["elapsed_seconds"] < 2.0
    # The cut reader would have published at STUCK_SECONDS. Waiting past that
    # and finding nothing proves the process was killed, not abandoned.
    time.sleep(max(0.0, STUCK_SECONDS + 1.0 - elapsed))
    assert not first_sentinel.exists()
    assert not second_sentinel.exists()


def main():
    local = REPO / ".local/tiendas"
    local.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="refprices-", dir=local) as tmp:
        root = Path(tmp)
        both_readers_run_with_saved_responses(root)
        down_site_keeps_previous_batches(root)
    with tempfile.TemporaryDirectory(prefix="refprices-cut-", dir=local) as tmp:
        budget_cut_kills_the_child_and_publishes_nothing(Path(tmp))
    print("Reference-price runner guards: PASS; synthetic, no network/DB/provider")


if __name__ == "__main__":
    main()
