"""Manufacturer facts for retail pieces: exact identity, per-field provenance.

The versioned file is curated by hand from manufacturer pages. Any identity
mismatch rejects the whole proposal: nothing is published by approximation.
"""

import hashlib
import json
from dataclasses import dataclass


@dataclass(frozen=True)
class ManufacturerProposal:
    components: dict
    sources: tuple
    support: tuple


def digest(value):
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _sources(document):
    rows = {}
    for source in document["sources"]:
        if source["source_id"] in rows:
            raise ValueError("Duplicate manufacturer source")
        rows[source["source_id"]] = {
            "source_id": source["source_id"],
            "url": source["url"],
            "consulted_on": document["consulted_on"],
            "locator": source["locator"],
        }
    return rows


def _component(entry, current, retail_mpn, rows):
    identity = entry["component_id"]
    if current is None:
        raise ValueError("Manufacturer fact for an unknown piece")
    if (current["category"], current["name"].strip()) != (
        entry["category"],
        entry["name"],
    ):
        raise ValueError("Manufacturer identity differs from the catalog piece")
    if retail_mpn != entry["mpn"]:
        raise ValueError("Manufacturer part number differs from the retail batch")
    facts = entry["facts"]
    used = dict.fromkeys(
        (entry["identity_source"], *(f["source"] for f in facts.values()))
    )
    envelope = {
        "version": 1,
        "identity": {
            "component_id": identity,
            "category": entry["category"],
            "name": entry["name"],
            "manufacturer_part_number": entry["mpn"],
            "source_refs": [_ref(rows[entry["identity_source"]])],
        },
        "data": {key: fact["value"] for key, fact in facts.items()},
        "fields": {key: [_ref(rows[fact["source"]])] for key, fact in facts.items()},
        "conflicts": {},
        "import_digest": digest(entry),
    }
    known = {source["id"] for source in current["sources"]}
    return {
        **current,
        "attributes": {
            **current["attributes"],
            "tower_stock_v1": json.dumps(
                envelope, ensure_ascii=False, separators=(",", ":")
            ),
        },
        "sources": [
            *current["sources"],
            *(
                {"id": source_id, "url": rows[source_id]["url"]}
                for source_id in used
                if source_id not in known
            ),
        ],
    }


def _ref(row):
    return {
        "source_id": row["source_id"],
        "url": row["url"],
        "consulted_on": row["consulted_on"],
        "locator": row["locator"],
    }


def _observation(value, *rows):
    return {
        "value": value,
        "status": "documented",
        "evidence": [_ref(row) for row in rows],
    }


def _support(entry, components, rows):
    cpu = components[entry["cpu_component_id"]]
    board = components[entry["motherboard_component_id"]]
    cpu_facts = json.loads(cpu["attributes"]["tower_stock_v1"])["data"]
    board_facts = json.loads(board["attributes"]["tower_stock_v1"])["data"]
    board_row, cpu_row = rows[entry["board_source"]], rows[entry["cpu_source"]]
    revision = entry["applicable_revision"]
    return {
        "cpu_component_id": entry["cpu_component_id"],
        "motherboard_component_id": entry["motherboard_component_id"],
        "cpu_socket": _observation(cpu_facts["socket"], cpu_row),
        "motherboard_socket": _observation(board_facts["socket"], board_row),
        "applicable_revision": _observation(revision, board_row),
        "row": {
            "cpu_model": cpu["name"].strip(),
            "motherboard_model": board["name"].strip(),
            "applicable_revision": revision,
            "minimum_bios": entry["minimum_bios"],
            "earlier_bios": entry["earlier_bios"],
            "evidence": [_ref(rows[entry["source"]])],
        },
    }


def build_manufacturer_proposal(document, components, retail_mpns):
    """All-or-nothing: `components` is the active revision, keyed by piece id."""
    if document.get("version") != 1:
        raise ValueError("Unsupported manufacturer facts version")
    rows = _sources(document)
    updated = {
        entry["component_id"]: _component(
            entry,
            components.get(entry["component_id"]),
            retail_mpns.get(entry["component_id"]),
            rows,
        )
        for entry in document["components"]
    }
    support = tuple(_support(entry, updated, rows) for entry in document["cpu_support"])
    return ManufacturerProposal(updated, tuple(rows.values()), support)
