"""Turn evidence is built from validated raw tool results, never from projections."""

import json
from datetime import datetime, timedelta, timezone

from mcp.types import CallToolResult, TextContent

from upgradejusto.assistant.evidence import TurnEvidence, normalize_name
from upgradejusto.catalog.models import Category, Component, ComponentPage, Source
from upgradejusto.compatibility.models import EvidenceRef, RuleResult
from upgradejusto.retail.models import Offer

PC_ID = "11111111-1111-1111-1111-111111111111"
OTHER_PC_ID = "22222222-2222-2222-2222-222222222222"


def mcp_result(data):
    return CallToolResult(
        structured_content=data,
        content=[TextContent(type="text", text=json.dumps(data))],
    )


def snapshot(**overrides):
    value = {
        "pc_id": PC_ID,
        "expected_pc_revision": 7,
        "objective": "gaming",
        "budget_ars": "2000000.00",
        "price_condition": "cash",
        "workload": None,
        "configuration": {
            "components": [
                {"category": "ram", "component_id": "ram-old", "quantity": 2}
            ],
            "context": {"bios_version": None, "notes": "private snapshot note"},
        },
        "selected_components": {"ram-old": "Memoria vieja 8 GB"},
    }
    value.update(overrides)
    return value


def evaluation_payload(pc_revision="7", component_id="ram-new", category="ram"):
    evidence = EvidenceRef(
        source_id="F01",
        url="https://example.org/fixture-rule",
        locator="fixture",
        consulted_on="2026-10-20",
    )
    rule = RuleResult(
        rule_id="R01",
        family="R01",
        state="pass",
        evidence=(evidence,),
    )
    return {
        "verdict": "compatible",
        "rule_results": [rule.model_dump(mode="json")],
        "missing_fields": [],
        "rules_version": "fixture-rules",
        "data_revision": "fixture-data",
        "pc_revision": pc_revision,
        "coverage": {
            "required": ["R01"],
            "implemented": ["R01"],
            "evaluated": ["R01"],
            "passed": ["R01"],
            "failed": [],
            "unknown": [],
            "not_applicable": [],
            "not_implemented": [],
            "complete": True,
        },
        "evaluated_configuration": {
            "components": [
                {
                    "category": category,
                    "component_id": component_id,
                    "quantity": 2 if category == "ram" else 1,
                }
            ],
            "context": {"bios_version": "P2.30", "notes": "private config note"},
        },
    }


def preview_payload(pc_revision="7", amount="150000.00"):
    return {
        "pc_id": PC_ID,
        "pc_revision": pc_revision,
        "objective": "gaming",
        "budget_ars": "2000000.00",
        "currency": "ARS",
        "items": [
            {
                "key": "alternative-1",
                "replacements": [],
                "evaluation": evaluation_payload(pc_revision, "gpu-new", "gpu"),
                "cost": {
                    "total_ars": amount,
                    "known_subtotal_ars": amount,
                    "within_budget": True,
                    "lines": [
                        {
                            "component_id": "gpu-new",
                            "quantity": 1,
                            "unit_amount": amount,
                            "currency": "ARS",
                            "date": "2026-11-01",
                            "source": "compragamer",
                        }
                    ],
                    "missing_fields": [],
                },
                "benefit": {"status": "unknown", "evidence": []},
                "status": "recommended",
                "missing_fields": [],
            }
        ],
        "limitations": [],
    }


def test_same_pc_revision_configuration_and_context_match():
    payload = evaluation_payload()
    first = TurnEvidence(snapshot())
    second = TurnEvidence(snapshot())

    assert first.record("evaluate_pc", {}, mcp_result(payload)) is True
    assert second.record("evaluate_pc", {}, mcp_result(payload)) is True

    assert first.evaluations == second.evaluations
    recorded = first.evaluations[0]
    assert recorded.pc_id == PC_ID
    assert recorded.pc_revision == 7
    assert recorded.context == first.context
    assert recorded.verdict == "compatible"
    assert recorded.rules == (("R01", "pass", ()),)
    assert recorded.component_ids == {"ram-new"}
    # Free text from the evaluated configuration is not stored as a fact.
    assert "private config note" not in recorded.configuration


def test_different_revision_does_not_match():
    evidence = TurnEvidence(snapshot())
    assert evidence.record("evaluate_pc", {}, mcp_result(evaluation_payload("7")))
    assert evidence.record("evaluate_pc", {}, mcp_result(evaluation_payload("8")))

    older, newer = evidence.evaluations
    assert older.pc_revision == 7
    assert newer.pc_revision == 8
    assert older.configuration == newer.configuration
    assert older.context == newer.context
    assert older != newer


def test_offer_without_stock_keeps_unknown_and_null_quantity():
    observed = datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc)
    offer = Offer(
        offer_id="O1",
        store="compragamer",
        product_id="P1",
        component_id="gpu-1",
        variant_key="default",
        amount="150000.00",
        condition="cash",
        availability="unknown",
        stock_quantity=None,
        source_url="https://compragamer.com/product/1",
        observed_at=observed,
        expires_at=observed + timedelta(days=1),
        status="fresh",
    )
    component = Component(
        id="gpu-1",
        category=Category.GPU,
        name="Placa de video sintética",
        attributes={},
        sources=(Source(id="F00", url="https://example.org/spec"),),
        offers=(offer,),
    )
    page = ComponentPage(
        dataset_version="fixture",
        items=(component,),
        total=1,
        page=1,
        page_size=1,
    )

    evidence = TurnEvidence(snapshot())
    assert evidence.record(
        "catalog_search", {}, mcp_result(page.model_dump(mode="json"))
    )

    recorded = evidence.offers[0]
    assert recorded.availability == "unknown"
    assert recorded.stock_quantity is None
    assert recorded.amount == "150000.00"
    assert recorded.currency == "ARS"
    assert recorded.source == "compragamer"
    assert recorded.observed_date == "2026-11-01"
    assert recorded.condition == "cash"
    assert recorded.component_id == "gpu-1"
    assert recorded.component_name == "Placa de video sintética"
    assert recorded.category == "gpu"
    assert evidence.pieces["gpu-1"].normalized_name == "placa de video sintetica"


def test_piece_from_another_configuration_is_not_in_evaluation():
    evidence = TurnEvidence(snapshot())
    assert evidence.record("evaluate_pc", {}, mcp_result(evaluation_payload()))

    recorded = evidence.evaluations[0]
    assert recorded.component_ids == {"ram-new"}
    assert "ram-old" not in recorded.component_ids
    # The saved PC piece stays as PC provenance, never as part of the evaluation.
    assert evidence.pieces["ram-old"].origins == {"pc"}
    assert evidence.pieces["ram-new"].origins == {"evaluation"}


def test_string_pc_revision_is_normalized_to_int():
    evidence = TurnEvidence(snapshot(expected_pc_revision="7"))
    assert evidence.expected_pc_revision == 7
    assert evidence.record("evaluate_pc", {}, mcp_result(evaluation_payload("7")))

    recorded = evidence.evaluations[0]
    assert recorded.pc_revision == 7
    assert recorded.pc_revision == evidence.expected_pc_revision
    assert type(recorded.pc_revision) is int


def test_preview_offer_uses_server_context_condition_and_evaluation():
    evidence = TurnEvidence(snapshot(price_condition="list"))
    assert evidence.record(
        "preview_recommendations", {}, mcp_result(preview_payload("7"))
    )

    recorded = evidence.offers[0]
    assert recorded.component_id == "gpu-new"
    assert recorded.category == "gpu"
    assert recorded.amount == "150000.00"
    assert recorded.currency == "ARS"
    assert recorded.source == "compragamer"
    assert recorded.observed_date == "2026-11-01"
    assert recorded.condition == "list"
    assert recorded.availability is None
    assert recorded.stock_quantity is None
    assert evidence.evaluations[0].tool == "preview_recommendations"
    assert evidence.evaluations[0].pc_id == PC_ID
    assert evidence.evaluations[0].component_ids == {"gpu-new"}


def test_preview_without_server_condition_does_not_invent_one():
    evidence = TurnEvidence(snapshot(price_condition=None))
    assert evidence.record("preview_recommendations", {}, mcp_result(preview_payload()))

    assert evidence.offers[0].condition is None


def test_failed_or_invalid_result_is_not_evidence():
    evidence = TurnEvidence(snapshot())
    failed = CallToolResult(is_error=True, content=[])
    assert evidence.record("evaluate_pc", {}, failed) is False
    assert (
        evidence.record("evaluate_pc", {}, mcp_result({"verdict": "compatible"}))
        is False
    )
    assert evidence.evaluations == []
    assert evidence.offers == []
    assert evidence.pieces.keys() == {"ram-old"}


def test_normalize_name_removes_accents_case_and_extra_spaces():
    assert normalize_name("  Placa   de Vídeo RTX  ") == "placa de video rtx"
    assert normalize_name(None) is None
