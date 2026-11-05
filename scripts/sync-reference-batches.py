"""Publish already-read store caches into data/catalogo/lotes, offline.

Reuses the conversion logic of prepare-retail-batches.py and the taxonomy of
fetch-store-catalog.py via importlib: no parser, rule, price, date or evidence
is copied or invented here. No network, database or credential access; batch
digests and observed_at come only from the untouched caches.

Publication is idempotent: batches are content-hash named, already-published
ones are never rewritten and a manifest whose logical content did not change
keeps its exact bytes. A store whose cache is missing, unreadable or without
records keeps its previous manifest entries, exclusions and condition pending
flag intact while the other store may still refresh.

Exit codes: 0 refreshed (fully or partially, manifest current); 1 nothing
could be refreshed or an unexpected failure stopped the sync.
"""

import argparse
import hashlib
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STORES = ROOT / ".local/integral38/stores"
LOTES = ROOT / "data/catalogo/lotes"
RESEARCH = ROOT / ".local/integral38/research"
ENTRY_PREFIX = "data/catalogo/lotes/"
STORE_ORDER = ("compragamer", "venex")
SHA_RE = re.compile(r"[0-9a-f]{64}")
MAX_EVIDENCE_BYTES = 1048576


def load_sibling(filename):
    spec = importlib.util.spec_from_file_location(
        filename.removesuffix(".py").replace("-", "_"),
        Path(__file__).resolve().with_name(filename),
    )
    if spec is None or spec.loader is None:
        raise ValueError("Local module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


batches_module = load_sibling("prepare-retail-batches.py")
catalog_module = load_sibling("fetch-store-catalog.py")
digest = batches_module.digest


class CacheUnavailable(ValueError):
    """Cache missing, unreadable or without records; reason stays bounded."""

    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


def _read_index(stores, store):
    path = stores / store / "latest.json"
    if not path.is_file():
        raise CacheUnavailable("cache_missing")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise CacheUnavailable("cache_unreadable")
    return payload


def compragamer_batches(stores):
    """Build the compragamer batch with the exact rules of prepare-retail-batches."""
    cg = _read_index(stores, "compragamer")
    sha = cg["sha256"]
    if not isinstance(sha, str) or not SHA_RE.fullmatch(sha):
        raise CacheUnavailable("cache_unreadable")
    raw_path = stores / "compragamer" / (sha + ".json")
    if not raw_path.is_file():
        raise CacheUnavailable("cache_missing")
    raw = raw_path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != sha:
        raise CacheUnavailable("cache_unreadable")
    catalog_module.inventory(raw)
    records = [
        batches_module.cg_record(
            row,
            catalog_module.CG_CATEGORIES[row["id_subcategoria"]],
            cg["observed_at"],
        )
        for row in json.loads(raw)
        if row.get("id_categoria") == 5
        and row.get("id_subcategoria") in catalog_module.CG_CATEGORIES
    ]
    if not records:
        raise CacheUnavailable("cache_empty")
    return [
        {
            "store": "compragamer",
            "source_version": "cg-" + digest([sha, cg["observed_at"]]),
            "raw_sha256": sha,
            "observed_at": cg["observed_at"],
            "partial_batch": False,
            "pagination_complete": True,
            "records": records,
        }
    ]


def venex_batches(stores, proofs):
    """Build one partial batch per usable venex row, same criteria as today."""
    venex = _read_index(stores, "venex")
    rows = venex["records"]
    if not isinstance(rows, list) or not rows:
        raise CacheUnavailable("cache_empty")
    batches = []
    excluded = []
    usable = 0
    for row in rows:
        category = batches_module.venex_category(row)
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
        record = batches_module.venex_record(row, proof)
        usable += record["offers"][0]["amount"] is not None
        batches.append(
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
    return batches, excluded, usable, len(batches)


def _publish(lotes, batches):
    """Content-hash names; an already-published identical batch is not rewritten."""
    entries = []
    written = 0
    for batch in batches:
        name = batch["store"] + "-" + digest(batch) + ".json"
        path = lotes / name
        if not path.exists():
            with path.open("x", encoding="utf-8") as stream:
                json.dump(batch, stream, ensure_ascii=False, indent=2)
            written += 1
        entries.append(ENTRY_PREFIX + name)
    return entries, written


def _store_of(entry):
    name = Path(str(entry).replace("\\", "/")).name
    for store in STORE_ORDER:
        if name.startswith(store + "-"):
            return store
    return None


def _merge_files(previous_files, entries_by_store):
    """Keep prior positions of surviving entries, append new ones, drop stale
    entries of refreshed stores only; unknown entries are never touched."""
    valid = {
        store: dict.fromkeys(entries) for store, entries in entries_by_store.items()
    }
    merged = []
    for entry in previous_files:
        store = _store_of(entry)
        if store is None or entry in valid.get(store, ()):
            merged.append(entry)
    for store in STORE_ORDER:
        for entry in valid.get(store, ()):
            if entry not in merged:
                merged.append(entry)
    return merged


def load_proofs(path):
    """Reuse existing local browser evidence; never generate or edit it here."""
    resolved = path.resolve()
    research = RESEARCH.resolve()
    if (
        resolved.parent != research
        or resolved.suffix != ".json"
        or resolved.stat().st_size > MAX_EVIDENCE_BYTES
    ):
        raise ValueError("Expected bounded local acquisition evidence")
    return {
        item["product_id"]: item
        for item in json.loads(resolved.read_text(encoding="utf-8"))["checks"]
    }


def sync(stores, lotes, proofs=None):
    """Publish hash-named batches plus manifest; offline, idempotent, bounded."""
    proofs = {} if proofs is None else proofs
    lotes.mkdir(parents=True, exist_ok=True)
    manifest_path = lotes / "manifest.json"
    previous = None
    if manifest_path.is_file():
        previous = json.loads(manifest_path.read_text(encoding="utf-8"))
        if not isinstance(previous, dict):
            raise ValueError("Previous manifest has no object structure")
    previous_files = []
    if previous:
        raw_files = previous.get("files")
        if not isinstance(raw_files, list):
            raise ValueError("Previous manifest files field is not a list")
        previous_files = list(raw_files)
    entries_by_store = {}
    notes = {}
    venex_excluded = None
    venex_pending = None
    for store in STORE_ORDER:
        preserved = [e for e in previous_files if _store_of(e) == store]
        try:
            if store == "compragamer":
                batches = compragamer_batches(stores)
                extra = {}
            else:
                batches, excluded, usable, total = venex_batches(stores, proofs)
                venex_excluded = excluded
                venex_pending = usable != total
                extra = {"usable_prices": usable}
            entries, written = _publish(lotes, batches)
        except CacheUnavailable as failure:
            reason = failure.reason
        except (OSError, ValueError, TypeError, KeyError):
            reason = "cache_unreadable"
        else:
            entries_by_store[store] = entries
            notes[store] = {
                "status": "updated",
                "batches": len(entries),
                "written": written,
                **extra,
            }
            continue
        entries_by_store[store] = preserved
        notes[store] = {
            "status": "preserved_previous",
            "reason": reason,
            "preserved_entries": len(preserved),
        }
    updated = [store for store in STORE_ORDER if notes[store]["status"] == "updated"]
    if not updated:
        return "failed", {
            "command": "sync-reference-batches",
            "status": "failed",
            "stores": notes,
            "manifest": {"entries": len(previous_files), "unchanged": True},
            "published": False,
            "network_used": False,
        }
    files = _merge_files(previous_files, entries_by_store)
    if venex_excluded is None:
        excluded = list(previous.get("excluded", [])) if previous else []
        pending = (
            previous.get("venex_price_condition_pending", True) if previous else True
        )
    else:
        excluded = venex_excluded
        pending = venex_pending
    payload = json.dumps(
        {
            "files": files,
            "excluded": excluded,
            "published": False,
            "venex_price_condition_pending": pending,
        },
        ensure_ascii=False,
        indent=2,
    )
    unchanged = manifest_path.is_file() and (
        manifest_path.read_text(encoding="utf-8") == payload
    )
    if not unchanged:
        pending_path = lotes / "manifest.pending.json"
        pending_path.write_text(payload, encoding="utf-8")
        pending_path.replace(manifest_path)
    return (
        "ok" if len(updated) == len(STORE_ORDER) else "partial",
        {
            "command": "sync-reference-batches",
            "status": "ok" if len(updated) == len(STORE_ORDER) else "partial",
            "stores": notes,
            "manifest": {"entries": len(files), "unchanged": bool(unchanged)},
            "published": False,
            "network_used": False,
        },
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--venex-condition-evidence", type=Path)
    args = parser.parse_args()
    proofs = (
        load_proofs(args.venex_condition_evidence)
        if args.venex_condition_evidence
        else {}
    )
    status, summary = sync(STORES, LOTES, proofs)
    print(json.dumps(summary))
    return 0 if status in {"ok", "partial"} else 1


def cli():
    try:
        return main()
    except (OSError, ValueError, TypeError, KeyError):
        print(
            json.dumps(
                {
                    "command": "sync-reference-batches",
                    "status": "sync_failed",
                    "published": False,
                    "network_used": False,
                }
            )
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(cli())
