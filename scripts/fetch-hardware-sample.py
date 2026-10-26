"""Acquire pinned public JSON samples; never execute repository code or extract paths."""

import hashlib
import io
import json
import re
import ssl
import tarfile
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".local/imports/hardware-scope-v1"
OUT = ROOT / "backend/data/hardware-import"
PINS = {
    "buildcores": (
        "buildcores/buildcores-open-db",
        "2403cab88630625912cdd2f152f1bb1e27f8ff4d",
        "CC-BY-NC-SA-4.0",
    ),
    "docyx": (
        "docyx/pc-part-dataset",
        "c52a04ca9465c83997ed335f7767b09a2005dd26",
        "MIT",
    ),
}
PATTERNS = {
    "P01": r"\bryzen\s*5\s*5600\b",
    "P02": r"\bryzen\s*7\s*5700x\b",
    "P03": r"\bb550m\s*pro4\b",
    "P04": r"kvr32n22s8[/_-]?8\b",
    "P05": r"kvr32n22d8[/_-]?16\b",
    "P06": r"dual.*(?:rtx\s*)?4060.*evo|dual-rtx4060-o8g-evo",
    "P07": r"\bcx\s*550\b|cp-9020277",
    "P08": r"\brm\s*750e\b|cp-9020295",
    "P09": r"pop\s*2\s*air|fd-c-poa2a-01",
    "P10": r"\bmeshify\s*c\b",
    "P15": r"prime.*5070.*(?:oc|o12g)|prime-rtx5070-o12g",
    "P16": r"tuf.*5070.*(?:oc|o12g)|tuf-rtx5070-o12g-gaming",
    "P17": r"\bb550\s*pro4\b",
    "P18": r"\bb550m\s*steel\s*legend\b",
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fetch(client, url, destination):
    if destination.exists():
        return destination.read_bytes()
    with client.stream("GET", url) as response:
        response.raise_for_status()
        content = bytearray()
        for chunk in response.iter_bytes():
            content.extend(chunk)
            if len(content) > 100_000_000:
                raise ValueError("Public snapshot exceeds acquisition bound")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    return bytes(content)


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    records, sources = [], {}
    counts = {}

    def add(source, path, index, record):
        metadata = record.get("metadata") or {}
        label = " ".join(
            [
                str(record.get("name", "")),
                str(metadata.get("name", "")),
                json.dumps(metadata.get("part_numbers", [])),
            ]
        )
        matched = [
            identity
            for identity, pattern in PATTERNS.items()
            if re.search(pattern, label, re.I) and counts.get((source, identity), 0) < 6
        ]
        if not matched:
            return
        for identity in matched:
            counts[source, identity] = counts.get((source, identity), 0) + 1
        canonical = json.dumps(
            record, sort_keys=True, ensure_ascii=False, separators=(",", ":")
        ).encode()
        records.append(
            {
                "source": source,
                "path": path,
                "index": index,
                "candidate_targets": matched,
                "record_sha256": sha(canonical),
                "record": record,
            }
        )

    with httpx.Client(
        verify=ssl.create_default_context(), follow_redirects=True, timeout=120
    ) as client:
        for source, (repo, revision, license_id) in PINS.items():
            raw = f"https://raw.githubusercontent.com/{repo}/{revision}"
            license_file = "LICENSE.txt" if source == "buildcores" else "LICENSE"
            license_bytes = fetch(
                client,
                f"{raw}/{license_file}",
                CACHE / source / revision / license_file,
            )
            (OUT / f"{source}-LICENSE.txt").write_bytes(license_bytes)
            sources[source] = {
                "repository": f"https://github.com/{repo}",
                "revision": revision,
                "license": license_id,
                "license_sha256": sha(license_bytes),
                "retrieved_on": "2026-10-25",
                "upstream_updated_on": "2026-10-24"
                if source == "buildcores"
                else "2025-07-23",
                "prices": "not provided"
                if source == "buildcores"
                else "historical USD; excluded from ARS pricing",
            }
            if source == "buildcores":
                notice = fetch(
                    client, f"{raw}/NOTICE.md", CACHE / source / revision / "NOTICE.md"
                )
                (OUT / "buildcores-NOTICE.md").write_bytes(notice)
                archive = fetch(
                    client,
                    f"https://codeload.github.com/{repo}/tar.gz/{revision}",
                    CACHE / f"{source}-{revision}.tar.gz",
                )
                sources[source]["archive_sha256"] = sha(archive)
                with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
                    for member in tar:
                        path = member.name.split("/", 1)[-1]
                        if not member.isfile() or member.size > 1_000_000:
                            continue
                        if (
                            path.startswith("schemas/")
                            and path.endswith(".schema.json")
                            and Path(path).stem.split(".")[0]
                            in {"CPU", "Motherboard", "RAM", "GPU", "PSU", "PCCase"}
                        ):
                            target = OUT / "schemas" / Path(path).name
                            target.parent.mkdir(exist_ok=True)
                            target.write_bytes(tar.extractfile(member).read())
                        if re.fullmatch(
                            r"open-db/(CPU|Motherboard|RAM|GPU|PSU|PCCase)/[^/]+\.json",
                            path,
                        ):
                            add(
                                source,
                                path,
                                None,
                                json.loads(tar.extractfile(member).read()),
                            )
            else:
                for category in (
                    "cpu",
                    "motherboard",
                    "memory",
                    "video-card",
                    "power-supply",
                    "case",
                ):
                    path = f"data/json/{category}.json"
                    content = fetch(
                        client,
                        f"{raw}/{path}",
                        CACHE / source / revision / f"{category}.json",
                    )
                    for index, record in enumerate(json.loads(content)):
                        add(source, path, index, record)
        manifest = {
            "format_version": "hardware-sample-1",
            "sources": sources,
            "identity_notice": "candidate_targets are search matches, NOT accepted variant identities; importer must resolve or quarantine",
            "records": sorted(
                records, key=lambda r: (r["source"], r["path"], r["index"] or 0)
            ),
        }
        destination = OUT / "raw-sample.json"
        destination.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        index = [
            {
                "source": r["source"],
                "path": r["path"],
                "index": r["index"],
                "targets": r["candidate_targets"],
                "name": r["record"].get("name")
                or (r["record"].get("metadata") or {}).get("name"),
                "part_numbers": (r["record"].get("metadata") or {}).get("part_numbers"),
            }
            for r in records
        ]
        (OUT / "sample-index.json").write_text(
            json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(
            json.dumps(
                {
                    "sample_records": len(records),
                    "by_source": {
                        s: sum(r["source"] == s for r in records) for s in PINS
                    },
                    "missing_targets": {
                        s: [p for p in PATTERNS if not counts.get((s, p))] for s in PINS
                    },
                    "output": "backend/data/hardware-import/raw-sample.json",
                }
            )
        )


if __name__ == "__main__":
    main()
