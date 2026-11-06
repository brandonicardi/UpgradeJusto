"""Deterministic paragraph grounding: text must match evidence tuples exactly."""

import json
from datetime import datetime, timedelta, timezone

from mcp.types import CallToolResult, TextContent

from upgradejusto.assistant.evidence import TurnEvidence
from upgradejusto.assistant.grounding import (
    CandidateParagraph,
    Claim,
    ParagraphResult,
    evidence_entries,
    parse_candidate,
    strip_references,
    validate_candidate,
)
from upgradejusto.catalog.models import Category, Component, ComponentPage, Source
from upgradejusto.compatibility.models import EvidenceRef, RuleResult
from upgradejusto.retail.models import Offer

PC_ID = "11111111-1111-1111-1111-111111111111"


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


def evaluation_payload(
    pc_revision="7", component_id="ram-old", category="ram", verdict="compatible"
):
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
        "verdict": verdict,
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


def make_offer(
    component_id,
    *,
    amount="150000.00",
    condition="cash",
    availability="in_stock",
    stock_quantity=3,
    store="compragamer",
    observed=datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc),
):
    return Offer(
        offer_id=f"O-{component_id}",
        store=store,
        product_id="P1",
        component_id=component_id,
        variant_key="default",
        amount=amount,
        condition=condition,
        availability=availability,
        stock_quantity=stock_quantity,
        source_url="https://compragamer.com/product/1",
        observed_at=observed,
        expires_at=observed + timedelta(days=1),
        status="fresh",
    )


def make_component(component_id, name, *, category=Category.RAM, offers=()):
    return Component(
        id=component_id,
        category=category,
        name=name,
        attributes={},
        sources=(Source(id="F00", url="https://example.org/spec"),),
        offers=tuple(offers),
    )


def catalog_of(*components):
    page = ComponentPage(
        dataset_version="fixture",
        items=tuple(components),
        total=len(components),
        page=1,
        page_size=len(components),
    )
    return page.model_dump(mode="json")


def catalog_payload(
    *,
    component_id="ram-kingston",
    name="Kingston Fury Beast 16GB DDR5",
    category=Category.RAM,
    amount="150000.00",
    condition="cash",
    availability="in_stock",
    stock_quantity=3,
    store="compragamer",
    observed=datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc),
):
    offer = make_offer(
        component_id,
        amount=amount,
        condition=condition,
        availability=availability,
        stock_quantity=stock_quantity,
        store=store,
        observed=observed,
    )
    return catalog_of(
        make_component(component_id, name, category=category, offers=(offer,))
    )


def preview_payload(component_id="gpu-new", category="gpu", verdict="compatible"):
    return {
        "pc_id": PC_ID,
        "pc_revision": "7",
        "objective": "gaming",
        "budget_ars": "2000000.00",
        "currency": "ARS",
        "items": [
            {
                "key": "alternative-1",
                "replacements": [],
                "evaluation": evaluation_payload(
                    component_id=component_id, category=category, verdict=verdict
                ),
                "cost": {
                    "total_ars": "150000.00",
                    "known_subtotal_ars": "150000.00",
                    "within_budget": True,
                    "lines": [
                        {
                            "component_id": component_id,
                            "quantity": 1,
                            "unit_amount": "150000.00",
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


def citations_payload(url="https://example.org/doc"):
    return {
        "citations": [
            {
                "source_id": "F01",
                "url": url,
                "title": "Guía de compatibilidad",
                "locator": "p1",
                "excerpt": "texto documental",
                "revision": "1",
            }
        ]
    }


def evidence_with(
    *,
    catalog=None,
    evaluation=None,
    citations=None,
    preview=None,
    price_condition="cash",
):
    evidence = TurnEvidence(snapshot(price_condition=price_condition))
    if catalog is not None:
        assert evidence.record("catalog_search", {}, mcp_result(catalog))
    if evaluation is not None:
        assert evidence.record("evaluate_pc", {}, mcp_result(evaluation))
    if preview is not None:
        assert evidence.record("preview_recommendations", {}, mcp_result(preview))
    if citations is not None:
        assert evidence.record("search_public_docs", {}, mcp_result(citations))
    return evidence


def reasons_of(results):
    return [result.reasons for result in results]


# --------------------------------------------------------------------- parsing


def test_parse_plain_text_by_blank_lines():
    paragraphs = parse_candidate("Primer párrafo.\n\nSegundo párrafo.")
    assert [p.id for p in paragraphs] == ["p1", "p2"]
    assert paragraphs[0].text == "Primer párrafo."
    assert paragraphs[0].claims == ()


def test_parse_json_candidate_with_claims():
    payload = json.dumps(
        {
            "paragraphs": [
                {
                    "id": "a",
                    "text": "La memoria está $150.000 [[E2]].",
                    "claims": [
                        {"kind": "price", "evidence": "offer:0", "value": "150000"}
                    ],
                }
            ]
        }
    )
    paragraphs = parse_candidate(payload)
    assert len(paragraphs) == 1
    assert paragraphs[0].id == "a"
    assert paragraphs[0].claims == (
        Claim(kind="price", evidence="offer:0", subject=None, value="150000"),
    )


def test_invalid_json_falls_back_to_text():
    paragraphs = parse_candidate("{no es json}")
    assert len(paragraphs) == 1
    assert paragraphs[0].text == "{no es json}"


def test_strip_references_removes_all_forms():
    assert strip_references("Hola [[E1]] mundo [E2] y E3.") == "Hola mundo y."
    assert strip_references("Sin referencias.") == "Sin referencias."


# ---------------------------------------------------------------------- pieces


def test_exact_id_and_natural_name_identify_piece():
    evidence = evidence_with(
        catalog=catalog_payload(),
        evaluation=evaluation_payload(component_id="ram-kingston"),
    )
    by_id = validate_candidate(evidence, "La ram-kingston encaja.")
    by_name = validate_candidate(evidence, "La Kingston Fury Beast encaja en tu PC.")
    assert by_id[0].failed is False
    assert by_name[0].failed is False


def test_generic_terms_do_not_identify_a_piece():
    evidence = evidence_with(
        catalog=catalog_payload(component_id="ram-generic", name="Memoria DDR5 16GB"),
        evaluation=evaluation_payload(component_id="ram-old"),
    )
    results = validate_candidate(evidence, "Tu PC es compatible con la memoria DDR5.")
    assert results[0].failed is False


def test_base_pc_verdict_does_not_prove_piece_compatibility():
    evidence = evidence_with(
        catalog=catalog_payload(),
        evaluation=evaluation_payload(component_id="ram-old"),
    )
    results = validate_candidate(
        evidence, "Tu PC es compatible con la Kingston Fury Beast."
    )
    assert results[0].failed is True
    assert "uncovered_verdict" in results[0].reasons


def test_verdict_mismatch_fails():
    evidence = evidence_with(evaluation=evaluation_payload(verdict="compatible"))
    results = validate_candidate(evidence, "Eso no encaja.")
    assert results[0].failed is True
    assert "uncovered_verdict" in results[0].reasons


def test_requires_verification_maps_to_engine_verdict():
    evidence = evidence_with(
        evaluation=evaluation_payload(verdict="requiere_verificacion")
    )
    results = validate_candidate(evidence, "Falta un dato para confirmarlo.")
    assert results[0].failed is False


# ---------------------------------------------------------------------- prices


def price_text():
    return (
        "La Kingston Fury Beast cuesta $150.000 en compragamer "
        "del 1/11/2026 en efectivo."
    )


def test_correct_price_with_currency_store_date_and_condition_passes():
    evidence = evidence_with(catalog=catalog_payload())
    results = validate_candidate(evidence, price_text())
    assert results[0].failed is False, results[0].reasons


def test_wrong_amount_fails():
    evidence = evidence_with(catalog=catalog_payload())
    results = validate_candidate(
        evidence,
        "La Kingston Fury Beast cuesta $95.000 en compragamer del 1/11/2026.",
    )
    assert results[0].failed is True
    assert "uncovered_amount" in results[0].reasons


def test_price_without_store_or_date_fails():
    evidence = evidence_with(catalog=catalog_payload())
    results = validate_candidate(evidence, "La Kingston Fury Beast cuesta $150.000.")
    assert results[0].failed is True
    assert "uncovered_amount" in results[0].reasons


def test_price_without_offer_condition_is_not_verified():
    preview = {
        "pc_id": PC_ID,
        "pc_revision": "7",
        "objective": "gaming",
        "budget_ars": "2000000.00",
        "currency": "ARS",
        "items": [
            {
                "key": "alternative-1",
                "replacements": [],
                "evaluation": evaluation_payload(
                    component_id="gpu-new", category="gpu"
                ),
                "cost": {
                    "total_ars": "150000.00",
                    "known_subtotal_ars": "150000.00",
                    "within_budget": True,
                    "lines": [
                        {
                            "component_id": "gpu-new",
                            "quantity": 1,
                            "unit_amount": "150000.00",
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
    evidence = TurnEvidence(snapshot(price_condition=None))
    assert evidence.record("preview_recommendations", {}, mcp_result(preview))
    results = validate_candidate(
        evidence, "Cuesta $150.000 en compragamer del 1/11/2026."
    )
    assert results[0].failed is True
    assert "uncovered_amount" in results[0].reasons


def test_price_does_not_imply_stock():
    evidence = evidence_with(
        catalog=catalog_payload(availability="unknown", stock_quantity=None)
    )
    price_only = validate_candidate(evidence, price_text())
    stock_claim = validate_candidate(
        evidence, "La Kingston Fury Beast está disponible en compragamer."
    )
    assert price_only[0].failed is False, price_only[0].reasons
    assert stock_claim[0].failed is True
    assert "uncovered_stock" in stock_claim[0].reasons


# ----------------------------------------------------------------------- stock


def test_positive_and_negative_stock():
    evidence = evidence_with(catalog=catalog_payload(availability="in_stock"))
    positive = validate_candidate(evidence, "Hay stock de la Kingston Fury Beast.")
    negative = validate_candidate(evidence, "La Kingston Fury Beast está agotada.")
    assert positive[0].failed is False
    assert negative[0].failed is True
    assert "uncovered_stock" in negative[0].reasons


def test_stock_quantity_must_match():
    evidence = evidence_with(
        catalog=catalog_payload(availability="in_stock", stock_quantity=3)
    )
    right = validate_candidate(evidence, "Quedan 3 unidades de la Kingston Fury.")
    wrong = validate_candidate(evidence, "Quedan 5 unidades de la Kingston Fury.")
    assert right[0].failed is False
    assert wrong[0].failed is True
    assert "uncovered_stock" in wrong[0].reasons


def test_explicit_doubt_about_stock_is_allowed():
    evidence = evidence_with(catalog=catalog_payload(availability="unknown"))
    results = validate_candidate(evidence, "No sé si hay stock de esa memoria.")
    assert results[0].failed is False


# ------------------------------------------------------------- uncovered tokens


def test_uncovered_number_date_code_and_url_fail():
    evidence = evidence_with()
    cases = {
        "unknown_number": "Hay 1.500 unidades en el depósito.",
        "unknown_date": "La revisión llegó el 5/5/2026.",
        "unknown_code": "El código cg-999 no existe.",
        "unknown_url": "Mirá https://evil.example/pagina.",
        "unknown_verdict": "Eso es compatible.",
    }
    expected = {
        "unknown_number": "uncovered_number",
        "unknown_date": "uncovered_date",
        "unknown_code": "uncovered_code",
        "unknown_url": "uncovered_url",
        "unknown_verdict": "uncovered_verdict",
    }
    for name, text in cases.items():
        result = validate_candidate(evidence, text)[0]
        assert result.failed is True, name
        assert expected[name] in result.reasons, name


def test_general_advice_without_specific_data_passes():
    evidence = evidence_with()
    results = validate_candidate(
        evidence, "Para jugar conviene tener 16 GB de RAM y un SSD."
    )
    assert results[0].failed is False


def test_failed_tool_only_allows_saying_no_data():
    evidence = evidence_with()
    safe = validate_candidate(evidence, "No pude consultar ese dato.")
    unsafe = validate_candidate(evidence, "Ese dato sale $100.")
    assert safe[0].failed is False
    assert unsafe[0].failed is True
    assert "uncovered_amount" in unsafe[0].reasons


# ------------------------------------------------------------------------- RAG


def test_rag_only_does_not_support_a_verdict():
    evidence = evidence_with(citations=citations_payload())
    results = validate_candidate(evidence, "Eso encaja, según el documento.")
    assert results[0].failed is True
    assert "uncovered_verdict" in results[0].reasons


def test_rag_url_is_a_valid_source():
    evidence = evidence_with(citations=citations_payload())
    results = validate_candidate(evidence, "Podés leer más en https://example.org/doc.")
    assert results[0].failed is False


# ---------------------------------------------------------------------- claims


def test_omitted_price_claim_still_fails():
    candidate = json.dumps(
        {"paragraphs": [{"id": "p1", "text": "Esa memoria sale $95.000."}]}
    )
    evidence = evidence_with(catalog=catalog_payload())
    results = validate_candidate(evidence, candidate)
    assert results[0].failed is True
    assert "uncovered_amount" in results[0].reasons


def test_misclassified_verdict_claim_fails_without_evaluation():
    candidate = json.dumps(
        {
            "paragraphs": [
                {
                    "id": "p1",
                    "text": "Eso encaja.",
                    "claims": [
                        {
                            "kind": "revision",
                            "evidence": "evaluation:0",
                            "value": "compatible",
                        }
                    ],
                }
            ]
        }
    )
    evidence = evidence_with()
    results = validate_candidate(evidence, candidate)
    assert results[0].failed is True
    assert "evidence_not_found" in results[0].reasons
    assert "uncovered_verdict" in results[0].reasons


def test_declared_claim_must_match_evidence_tuple():
    candidate = json.dumps(
        {
            "paragraphs": [
                {
                    "id": "p1",
                    "text": price_text(),
                    "claims": [
                        {
                            "kind": "price",
                            "evidence": "offer:0",
                            "subject": "ram-kingston",
                            "value": "150000.00",
                        }
                    ],
                }
            ]
        }
    )
    evidence = evidence_with(catalog=catalog_payload())
    results = validate_candidate(evidence, candidate)
    assert results[0].failed is False, results[0].reasons


def test_unknown_claim_kind_fails():
    candidate = json.dumps(
        {
            "paragraphs": [
                {
                    "id": "p1",
                    "text": "Un consejo general.",
                    "claims": [{"kind": "opinion", "evidence": "E1"}],
                }
            ]
        }
    )
    evidence = evidence_with(evaluation=evaluation_payload())
    results = validate_candidate(evidence, candidate)
    assert results[0].failed is True
    assert "unknown_claim_kind" in results[0].reasons


def test_declared_claim_value_mismatch_fails():
    candidate = json.dumps(
        {
            "paragraphs": [
                {
                    "id": "p1",
                    "text": price_text(),
                    "claims": [
                        {"kind": "price", "evidence": "offer:0", "value": "95000"}
                    ],
                }
            ]
        }
    )
    evidence = evidence_with(catalog=catalog_payload())
    results = validate_candidate(evidence, candidate)
    assert results[0].failed is True
    assert "claim_value_mismatch" in results[0].reasons


# --------------------------------------------------------------------- results


def test_results_keep_paragraph_and_stripped_text():
    evidence = evidence_with()
    results = validate_candidate(evidence, "Consejo general [[E1]].")
    assert isinstance(results[0], ParagraphResult)
    assert isinstance(results[0].paragraph, CandidateParagraph)
    assert results[0].text_sin_referencias == "Consejo general."


def test_revision_requires_matching_evaluation():
    evidence = evidence_with(evaluation=evaluation_payload(pc_revision="7"))
    right = validate_candidate(evidence, "La revisión 7 es la vigente.")
    wrong = validate_candidate(evidence, "La revisión 8 es la vigente.")
    assert right[0].failed is False
    assert wrong[0].failed is True
    assert "uncovered_revision" in wrong[0].reasons


# --------------------------------------------------- subject-aware grounding


def test_general_spec_advice_with_16gb_passes():
    evidence = evidence_with()
    results = validate_candidate(evidence, "Para jugar conviene tener 16 GB de RAM.")
    assert results[0].failed is False, results[0].reasons


def test_capacity_claim_about_a_named_piece_fails_without_evidence():
    evidence = evidence_with(catalog=catalog_payload(name="Kingston Fury"))
    results = validate_candidate(evidence, "La Kingston Fury tiene 16 GB.")
    assert results[0].failed is True
    assert "uncovered_number" in results[0].reasons


def test_price_of_piece_a_with_offer_of_piece_b_fails():
    catalog = catalog_of(
        make_component("ram-kingston", "Kingston Fury", offers=()),
        make_component(
            "ram-other",
            "Otra Memoria X",
            offers=(make_offer("ram-other", amount="120000.00", store="venex"),),
        ),
    )
    evidence = evidence_with(catalog=catalog)
    results = validate_candidate(
        evidence,
        "La Kingston Fury cuesta $120.000 en venex del 1/11/2026 en efectivo.",
    )
    assert results[0].failed is True
    assert "uncovered_amount" in results[0].reasons


def test_stock_of_piece_a_with_offer_of_piece_b_fails():
    catalog = catalog_of(
        make_component("ram-kingston", "Kingston Fury", offers=()),
        make_component(
            "ram-other",
            "Otra Memoria X",
            offers=(make_offer("ram-other", availability="in_stock"),),
        ),
    )
    evidence = evidence_with(catalog=catalog)
    results = validate_candidate(evidence, "La Kingston Fury tiene stock.")
    assert results[0].failed is True
    assert "uncovered_stock" in results[0].reasons


def test_pc_verdict_requires_direct_evaluation_not_a_preview():
    preview_only = evidence_with(preview=preview_payload())
    preview_result = validate_candidate(preview_only, "Tu PC es compatible.")
    assert preview_result[0].failed is True
    assert "uncovered_verdict" in preview_result[0].reasons

    direct = evidence_with(evaluation=evaluation_payload())
    direct_result = validate_candidate(direct, "Tu PC es compatible.")
    assert direct_result[0].failed is False, direct_result[0].reasons


def test_evidence_entries_is_stable_and_ordered():
    evidence = evidence_with(catalog=catalog_payload(), evaluation=evaluation_payload())
    entries = evidence_entries(evidence)
    assert entries[0] is evidence.evaluations[0]
    assert entries[1] is evidence.offers[0]
    assert [entry.component_id for entry in entries[2:]] == [
        "ram-kingston",
        "ram-old",
    ]
    assert evidence_entries(evidence) == entries
