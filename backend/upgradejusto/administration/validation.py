"""Valida referencias de una revisión completa antes de cualquier publicación."""

import json

from upgradejusto.administration.models import SupportData, validate_data
from upgradejusto.catalog.models import Component
from upgradejusto.compatibility.basic_specs import validate_envelope


def materialize(entries):
    groups = {key: {} for key in ("components", "prices", "sources", "cpu_support")}
    for entry in entries:
        groups[entry["collection"]][entry["id"]] = validate_data(
            entry["collection"], entry["data"]
        )
    sources = {(s["source_id"], s["url"]) for s in groups["sources"].values()}
    if len(sources) != len(groups["sources"]):
        raise ValueError("Duplicate source reference")
    source_dates = {
        (s["source_id"], s["url"], s["consulted_on"])
        for s in groups["sources"].values()
    }
    components = groups["components"]
    if not components:
        raise ValueError("Empty catalog")
    for component in components.values():
        if any((s["id"], s["url"]) not in sources for s in component["sources"]):
            raise ValueError("Missing component source")
        raw_basic = component["attributes"].get("basic_stock_v1")
        if raw_basic is not None:
            basic = validate_envelope(raw_basic)
            component_source_ids = {source["id"] for source in component["sources"]}
            if any(
                identity not in component_source_ids
                for identities in basic["fields"].values()
                for identity in identities
            ):
                raise ValueError("Missing basic stock field evidence source")
    prices = {identity: [] for identity in components}
    for price in groups["prices"].values():
        if price["component_id"] not in components:
            raise ValueError("Missing priced component")
        prices[price["component_id"]].append(
            {k: v for k, v in price.items() if k != "component_id"}
        )
    pairs = set()
    for data in groups["cpu_support"].values():
        support = SupportData.model_validate_json(json.dumps(data))
        cpu, board = (
            components.get(support.cpu_component_id),
            components.get(support.motherboard_component_id),
        )
        pair = (support.cpu_component_id, support.motherboard_component_id)
        if pair in pairs:
            raise ValueError("Duplicate exact CPU support pair")
        pairs.add(pair)
        if (
            not cpu
            or not board
            or cpu["category"] != "cpu"
            or board["category"] != "motherboard"
        ):
            raise ValueError("Invalid CPU support references")
        if (
            cpu["name"] != support.row.cpu_model
            or board["name"] != support.row.motherboard_model
        ):
            raise ValueError("CPU support must match exact model")
        if cpu["attributes"].get("socket") not in (None, support.cpu_socket.value):
            raise ValueError("Conflicting CPU socket evidence")
        observations = (
            support.cpu_socket,
            support.motherboard_socket,
            support.applicable_revision,
        )
        for evidence in (
            *support.row.evidence,
            *(e for observation in observations for e in observation.evidence),
        ):
            if (
                evidence.source_id,
                evidence.url,
                evidence.consulted_on,
            ) not in source_dates:
                raise ValueError("Missing CPU support evidence source")
    return [
        Component(id=identity, **data, prices=prices[identity]).model_dump(mode="json")
        for identity, data in components.items()
    ]
