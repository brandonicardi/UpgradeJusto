"""Revision-bound provenance checks; never fetch or interpret source contents."""

from upgradejusto.compatibility.basic_specs import validate_envelope
from upgradejusto.retail.technical_parser import load_technical_envelope


def validate_technical_binding(raw, component_id, component, source_rows):
    envelope = load_technical_envelope(raw)
    identity = envelope.identity
    if (identity.component_id, identity.category, identity.name) != (
        component_id,
        component["category"],
        component["name"].strip(),
    ):
        raise ValueError("Technical component identity mismatch")
    pairs = {(s["id"], s["url"]) for s in component["sources"]}
    for ref in envelope.references():
        matches = [row for row in source_rows if row["source_id"] == ref.source_id]
        if len(matches) != 1 or (ref.source_id, ref.url) not in pairs:
            raise ValueError("Unbound technical source")
        row = matches[0]
        if (row["url"], row["consulted_on"], row["locator"]) != (
            ref.url,
            ref.consulted_on,
            ref.locator,
        ):
            raise ValueError("Technical source metadata mismatch")
    raw_basic = component["attributes"].get("basic_stock_v1")
    if raw_basic is not None and identity.category == "case":
        basic = validate_envelope(raw_basic)
        key = "cooler_height_limit_mm"
        basic_value = basic["data"].get(key)
        basic_conflicts = basic["conflicts"].get(key, [])
        if key in envelope.data and (
            basic_conflicts
            or (
                basic_value is not None
                and basic.get("fields", {}).get(key)
                and basic_value != envelope.data[key]
            )
        ):
            raise ValueError("Technical facts cannot override basic evidence")
        if key in envelope.conflicts:
            expected = [(item["value"], [item["source"]]) for item in basic_conflicts]
            if basic_value is not None and basic["fields"].get(key):
                expected.append((basic_value, basic["fields"][key]))
            for value, ids in expected:
                if not any(
                    item.value == value
                    and any(ref.source_id in ids for ref in item.source_refs)
                    for item in envelope.conflicts[key]
                ):
                    raise ValueError("Basic conflict observation must be retained")
    return envelope


def preserve_retail_resource(resource, previous, component):
    """True only for retained identity/provenance, not a retail reconciliation."""
    if (
        previous["id"] != component["id"]
        or previous["category"] != component["category"]
        or previous["name"].strip() != component["name"].strip()
    ):
        return False
    old_pairs = {(s["id"], s["url"]) for s in previous["sources"]}
    new_pairs = {(s["id"], s["url"]) for s in component["sources"]}
    if not old_pairs <= new_pairs:
        return False
    identity = resource["identity"]
    prefix = {"compragamer": "cg", "venex": "venex"}.get(identity.get("store"))
    if (
        prefix is None
        or resource["component_id"] != f"{prefix}-{identity.get('product_id')}"
    ):
        return False
    if (
        identity.get("category") != component["category"]
        or not identity.get("variant_key")
        or identity.get("source_url") not in {url for _, url in new_pairs}
    ):
        return False
    raw = component["attributes"].get("tower_stock_v1")
    envelope = load_technical_envelope(raw) if raw is not None else None
    if (
        envelope is not None
        and envelope.identity.manufacturer_part_number is not None
        and identity.get("mpn") is not None
        and envelope.identity.manufacturer_part_number != identity["mpn"]
    ):
        raise ValueError("Technical and retail manufacturer identity conflict")
    additions = new_pairs - old_pairs
    if additions:
        if envelope is None:
            return False
        technical_pairs = {(ref.source_id, ref.url) for ref in envelope.references()}
        if not additions <= technical_pairs:
            return False
    # Resource identity/offer/image payload is copied verbatim by the repository.
    return True
