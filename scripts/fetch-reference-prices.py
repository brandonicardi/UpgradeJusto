"""Single bounded refresh of the two approved reference-price stores.

Each reader runs as its own cancellable child process (sys.executable plus
the untouched reader script), never as a thread: when the time budget runs
out the runner kills the child and waits for it to close before reporting
budget_exceeded, so an expired read cannot publish latest.json after the cut
and the previous observation is truly preserved. Only CompraGamer and Venex,
each with its own untouched limits; this runner adds an explicit idle pause
between readers and one total time budget that stops the run when exceeded,
trying the other site when one fails. Readers publish atomically, so a
failed or killed read always keeps that site's previous latest.json.
Summary is bounded JSON: no credentials, remote bodies or private paths.
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

DEFAULT_BUDGET_SECONDS = 300.0
DEFAULT_PAUSE_SECONDS = 2.0
DEFAULT_VENEX_MAX_PRODUCTS = 26
MIN_BUDGET_SECONDS = 5.0
MAX_BUDGET_SECONDS = 600.0
MAX_PAUSE_SECONDS = 60.0
MAX_EMBEDDED_REPORT_CHARS = 4000
MAX_READER_OUTPUT_BYTES = 65536
READERS = (
    {"store": "compragamer", "file": "fetch-store-catalog.py"},
    {"store": "venex", "file": "fetch-venex-offers.py"},
)


def reader_path(filename):
    candidate = Path(filename)
    if candidate.is_absolute():
        return candidate
    return Path(__file__).resolve().with_name(candidate.name)


def reader_argv(store, filename, venex_max_products):
    argv = [sys.executable, str(reader_path(filename)), "--refresh"]
    if store == "venex":
        argv += ["--max-products", str(venex_max_products)]
    return argv


def bounded_report(raw):
    if len(raw) > MAX_READER_OUTPUT_BYTES:
        return {"status": "oversized_reader_output"}
    try:
        report = json.loads(raw.decode("utf-8", "replace"))
    except ValueError:
        return {"status": "unreadable_reader_output"}
    if not isinstance(report, dict):
        return {"status": "unreadable_reader_output"}
    if len(json.dumps(report)) > MAX_EMBEDDED_REPORT_CHARS:
        return {"status": "oversized_reader_output"}
    return report


def run_one(reader, deadline, venex_max_products):
    store, filename = reader["store"], reader["file"]
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        return {"store": store, "status": "budget_exceeded", "started": False}
    try:
        process = subprocess.Popen(
            reader_argv(store, filename, venex_max_products),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
    except OSError:
        return {"store": store, "status": "reader_launch_failed", "started": False}
    try:
        raw, _ = process.communicate(timeout=remaining)
    except subprocess.TimeoutExpired:
        # Hard cut: the child is killed and reaped before returning, so it
        # can never publish this site's latest.json after the cut.
        process.kill()
        process.communicate()
        return {"store": store, "status": "budget_exceeded", "started": True}
    report = bounded_report(raw or b"")
    if process.returncode == 0:
        status = "ok"
    elif report.get("status") == "unavailable":
        status = "unavailable"
    else:
        status = "failed"
    entry = {
        "store": store,
        "status": status,
        "started": True,
        "exit_code": process.returncode,
    }
    if status != "ok" and "cache_preserved" in report:
        entry["cache_preserved"] = report["cache_preserved"]
    entry["report"] = report
    return entry


def run_readers(
    budget_seconds=DEFAULT_BUDGET_SECONDS,
    pause_seconds=DEFAULT_PAUSE_SECONDS,
    venex_max_products=DEFAULT_VENEX_MAX_PRODUCTS,
    readers=READERS,
):
    start = time.monotonic()
    deadline = start + budget_seconds
    stores = []
    for index, reader in enumerate(readers):
        if index:
            remaining = deadline - time.monotonic()
            if remaining > 0:
                time.sleep(min(pause_seconds, remaining))
        stores.append(run_one(reader, deadline, venex_max_products))
    summary = {
        "command": "fetch-reference-prices",
        "budget_seconds": budget_seconds,
        "pause_seconds": pause_seconds,
        "venex_max_products": venex_max_products,
        "elapsed_seconds": round(time.monotonic() - start, 3),
        "stores": stores,
        "all_succeeded": all(entry["status"] == "ok" for entry in stores),
    }
    return (0 if summary["all_succeeded"] else 1), summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--budget-seconds",
        type=float,
        default=DEFAULT_BUDGET_SECONDS,
        help=f"Total cut for the whole run, {MIN_BUDGET_SECONDS:g}..{MAX_BUDGET_SECONDS:g}s",
    )
    parser.add_argument(
        "--pause-seconds",
        type=float,
        default=DEFAULT_PAUSE_SECONDS,
        help=f"Idle pause between the two readers, 0..{MAX_PAUSE_SECONDS:g}s",
    )
    parser.add_argument(
        "--venex-max-products",
        type=int,
        default=DEFAULT_VENEX_MAX_PRODUCTS,
        help="Venex product cap, kept within the approved 1..26",
    )
    args = parser.parse_args()
    if not MIN_BUDGET_SECONDS <= args.budget_seconds <= MAX_BUDGET_SECONDS:
        parser.error(
            f"Total budget must stay within "
            f"{MIN_BUDGET_SECONDS:g}..{MAX_BUDGET_SECONDS:g} seconds"
        )
    if not 0.0 <= args.pause_seconds <= MAX_PAUSE_SECONDS:
        parser.error(f"Pause must stay within 0..{MAX_PAUSE_SECONDS:g} seconds")
    if not 1 <= args.venex_max_products <= DEFAULT_VENEX_MAX_PRODUCTS:
        parser.error("Venex product cap must stay within the approved 1..26")
    code, summary = run_readers(
        budget_seconds=args.budget_seconds,
        pause_seconds=args.pause_seconds,
        venex_max_products=args.venex_max_products,
    )
    print(json.dumps(summary))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
