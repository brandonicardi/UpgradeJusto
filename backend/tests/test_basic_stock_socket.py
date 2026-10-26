"""Published socket reconciliation against real imported structured facts."""

import json

import pytest
from test_basic_stock_imported_ram import imported_catalog
from test_basic_stock_scenarios import base

from upgradejusto.compatibility.application import evaluate_current


def socket_metadata(part, *, conflict=True, absent=False):
    metadata = json.loads(part.attributes["basic_stock_v1"])
    if absent:
        metadata["data"].pop("socket", None)
        metadata["fields"].pop("socket", None)
        metadata["conflicts"].pop("socket", None)
    elif conflict:
        identity = metadata["fields"]["socket"][0]
        metadata["data"]["socket"] = None
        metadata["conflicts"]["socket"] = [
            {"value": "AM4", "source": identity},
            {"value": "AM5", "source": identity},
        ]
    else:
        metadata["data"]["socket"] = "AM5"
        metadata["conflicts"].pop("socket", None)
    return {
        **part.attributes,
        "basic_stock_v1": json.dumps(metadata, separators=(",", ":")),
    }


@pytest.mark.parametrize("identity,label", [("P01", "cpu"), ("P03", "motherboard")])
@pytest.mark.parametrize("conflict", [True, False])
def test_socket_conflict_or_documented_disagreement_never_green(
    identity, label, conflict
):
    pinned = imported_catalog()
    assert evaluate_current(base(), pinned, 1, "clean").verdict == "compatible"
    part = pinned[identity]
    pinned[identity] = part.model_copy(
        update={"attributes": socket_metadata(part, conflict=conflict)}
    )
    result = evaluate_current(base(), pinned, 1, "contradictory")
    assert result.verdict == "requiere_verificacion"
    suffix = "source_conflict" if conflict else "source_disagreement"
    assert f"cpu_support.{label}_socket_{suffix}" in result.missing_fields
    assert result.rule_results[0].state == "unknown"
    assert result.rule_results[0].evidence


@pytest.mark.parametrize("bios,gpu", [("P1.20", "P06"), ("P2.30", "P16")])
def test_socket_conflict_preserves_known_bios_or_length_failure(bios, gpu):
    pinned = imported_catalog()
    part = pinned["P01"]
    pinned["P01"] = part.model_copy(update={"attributes": socket_metadata(part)})
    configuration = base(bios=bios)
    for group in configuration.components:
        if group.category == "gpu":
            group.component_id = gpu
        if group.category == "case":
            group.component_id = "P10"
    result = evaluate_current(configuration, pinned, 1, "contradictory-with-fail")
    assert result.verdict == "incompatible"
    assert "cpu_support.cpu_socket_source_conflict" in result.missing_fields
    assert ("B01" if bios == "P1.20" else "B04") in result.coverage.failed


def test_missing_dataset_socket_does_not_discard_valid_published_cpu_support():
    pinned = imported_catalog()
    for identity in ("P01", "P03"):
        part = pinned[identity]
        pinned[identity] = part.model_copy(
            update={"attributes": socket_metadata(part, absent=True)}
        )
    assert (
        evaluate_current(base(), pinned, 1, "socket-source-independent").verdict
        == "compatible"
    )
