"""SYNTHETIC context byte/relevance proofs; no real hardware or live provider."""

import asyncio
import json
from types import SimpleNamespace

import pytest
from test_torre_extraccion import Budget, observed, output, populate

from upgradejusto.catalog.models import Category, Component
from upgradejusto.extraction.tower_context import (
    CONTEXT_BYTE_LIMIT,
    CONTEXT_VERSION,
    SYSTEM,
    prepare_context,
    relevant_components,
)
from upgradejusto.extraction.tower_models import (
    TowerExtractInput,
    TowerProviderProposal,
)
from upgradejusto.extraction.tower_provider import (
    TOWER_RESPONSE_FORMAT,
    TowerGroqExtractor,
)
from upgradejusto.extraction.tower_service import TowerExtractionService
from upgradejusto.pcs.service import PCError


def catalog(size=691):
    return tuple(
        Component(
            id=f"synthetic-{index:04}",
            category=Category.RAM,
            name=f"SYNTHETIC RAM CONTEXT {index:04}",
            attributes={"private_test_attribute": "NEVER_SEND_ATTRIBUTE"},
            sources=(),
        )
        for index in range(size)
    )


def test_691_snapshot_unknown_text_has_empty_context_and_exact_byte_measurement():
    text = "Hardware desconocido, cantidad por revisar"
    prepared = prepare_context(text, catalog(), "synthetic-publication")
    payload = json.loads(prepared.human_message)
    assert payload["catalog"] == []
    assert payload["untrusted_text"] == text
    assert payload["schema"] == TowerProviderProposal.model_json_schema()
    assert prepared.system_message == SYSTEM
    assert prepared.matched_catalog_count == 0
    assert prepared.selected_component_ids == ()
    assert prepared.context_version == CONTEXT_VERSION
    assert prepared.catalog_revision == "synthetic-publication"
    assert prepared.payload_utf8_bytes == len(SYSTEM.encode("utf-8")) + len(
        prepared.human_message.encode("utf-8")
    )
    assert prepared.payload_utf8_bytes < CONTEXT_BYTE_LIMIT
    assert prepared.human_message == json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
        allow_nan=False,
    )
    assert "Hardware" not in repr(prepared)
    assert "synthetic-publication" not in repr(prepared)


def test_literal_beyond50_is_retained_without_attributes_or_first_n_cutoff():
    parts = catalog()
    selected = (parts[690], parts[60])
    text = "; ".join("2x " + part.name for part in selected)
    prepared = prepare_context(text, parts, "synthetic-publication")
    assert prepared.selected_component_ids == (parts[60].id, parts[690].id)
    payload = json.loads(prepared.human_message)
    assert [row["id"] for row in payload["catalog"]] == list(
        prepared.selected_component_ids
    )
    assert all(set(row) == {"id", "category", "name"} for row in payload["catalog"])
    assert "NEVER_SEND_ATTRIBUTE" not in prepared.human_message
    assert (
        prepare_context(text, reversed(parts)).human_message == prepared.human_message
    )


@pytest.mark.parametrize("suffix", [" PLUS", "+", "/OC", ".PLUS", " (OC)"])
def test_variant_extension_never_sends_the_literal_base_id(suffix):
    parts = catalog()
    prepared = prepare_context("2x " + parts[690].name + suffix, parts)
    assert prepared.matched_catalog_count == 0
    assert json.loads(prepared.human_message)["catalog"] == []


def test_ambiguous_exact_names_retain_all_ids_not_an_arbitrary_winner():
    parts = catalog(1)
    duplicate = parts[0].model_copy(update={"id": "another-synthetic-id"})
    prepared = prepare_context("2x " + parts[0].name, parts + (duplicate,))
    assert prepared.matched_catalog_count == 2
    assert set(prepared.selected_component_ids) == {parts[0].id, duplicate.id}


def test_full_known_variant_does_not_send_its_base_model():
    parts = catalog(1)
    variant = parts[0].model_copy(
        update={"id": "variant", "name": parts[0].name + " PLUS"}
    )
    assert relevant_components("2x " + variant.name, parts + (variant,)) == (variant,)


def test_catalog_name_with_conjunction_is_not_split_in_relevance():
    part = Component(
        id="kit",
        category=Category.RAM,
        name="SYNTHETIC KIT y COMBO",
        attributes={},
        sources=(),
    )
    assert relevant_components("2x SYNTHETIC KIT y COMBO", (part,)) == (part,)


def test_utf8_exact_boundary_is_inclusive_and_input_is_not_truncated():
    empty = prepare_context("", ())
    remaining = CONTEXT_BYTE_LIMIT - empty.payload_utf8_bytes
    text = "界" * (remaining // 3) + "a" * (remaining % 3)
    # Context's byte invariant, independently of the HTTP12000 character guard.
    assert len(text) <= 12000
    data = TowerExtractInput(text=text)
    prepared = prepare_context(data.text, ())
    assert prepared.payload_utf8_bytes == CONTEXT_BYTE_LIMIT
    assert json.loads(prepared.human_message)["untrusted_text"] == text
    with pytest.raises(PCError) as raised:
        prepare_context(text + "a", ())
    assert raised.value.status == 422
    assert "shorten pasted text" in raised.value.detail


def test_excess_catalog_context_does_not_drop_identified_models_to_fit():
    parts = catalog(300)
    text = ";".join("1x " + part.name for part in parts)
    assert len(text) <= 12000
    assert len(relevant_components(text, parts)) == len(parts)
    with pytest.raises(PCError) as raised:
        prepare_context(text, parts)
    assert raised.value.status == 422


class ControlledProvider:
    def __init__(self, raw=None):
        self.received = []
        self.raw = raw or output()

    async def extract_prepared(self, prepared):
        self.received.append(prepared)
        return self.raw


def test_empty_catalog_context_still_allows_literal_declared_hardware():
    raw = output()
    text = "2x Ventilador Acme desconocido"
    populate(
        raw,
        "fan",
        observed(
            label="Ventilador Acme desconocido",
            quantity=2,
            excerpt=text,
            quantity_excerpt=text,
        ),
    )
    provider = ControlledProvider(raw)
    towers = SimpleNamespace(
        catalog=SimpleNamespace(
            snapshot=catalog, repository=SimpleNamespace(dataset_version="synthetic-v")
        )
    )
    result = asyncio.run(
        TowerExtractionService(towers, provider, Budget()).preview(
            TowerExtractInput(text=text), "server-owner"
        )
    )
    assert provider.received[0].matched_catalog_count == 0
    assert result.proposal.lines[0].component_id is None
    assert result.proposal.lines[0].declared_model == "Ventilador Acme desconocido"
    assert result.proposal.lines[0].quantity == 2


def test_ambiguous_ids_reach_context_but_do_not_authorize_a_selection():
    first = catalog(1)[0]
    duplicate = first.model_copy(update={"id": "ambiguous-synthetic"})
    parts = (first, duplicate)
    raw = output()
    text = "2x " + first.name
    line = observed(label=first.name, quantity=2, excerpt=text, quantity_excerpt=text)
    line["candidate_ids"] = [first.id, duplicate.id]
    populate(raw, "ram", line)
    provider = ControlledProvider(raw)
    towers = SimpleNamespace(
        catalog=SimpleNamespace(
            snapshot=lambda: parts,
            repository=SimpleNamespace(dataset_version="synthetic-v"),
        )
    )
    result = asyncio.run(
        TowerExtractionService(towers, provider, Budget()).preview(
            TowerExtractInput(text=text), "server-owner"
        )
    )
    assert provider.received[0].matched_catalog_count == 2
    assert result.proposal.category_status["ram"] == "unknown"
    assert result.proposal.lines == []


def test_preflight_rejects_before_admission_and_valid_unknown_call_admits_once():
    provider, budget = ControlledProvider(), Budget()
    towers = SimpleNamespace(
        catalog=SimpleNamespace(
            snapshot=catalog, repository=SimpleNamespace(dataset_version="synthetic-v")
        )
    )
    svc = TowerExtractionService(towers, provider, budget)
    with pytest.raises(PCError) as raised:
        asyncio.run(svc.preview(TowerExtractInput(text="界" * 12000), "server-owner"))
    assert raised.value.status == 422
    assert budget.admissions == [] and provider.received == []
    result = asyncio.run(
        svc.preview(TowerExtractInput(text="Modelo desconocido"), "server-owner")
    )
    assert result.proposal.lines == []
    assert budget.admissions == ["server-owner"] and budget.active == 0
    assert len(provider.received) == 1
    assert provider.received[0].matched_catalog_count == 0


def test_sdk_sends_the_exact_prepared_strings_and_no_metadata(monkeypatch):
    import upgradejusto.extraction.tower_provider as module

    prepared = prepare_context("Modelo desconocido", catalog(), "synthetic-v")

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

    class Model:
        def bind(self, **kwargs):
            assert kwargs == {"response_format": TOWER_RESPONSE_FORMAT}
            return self

        async def ainvoke(self, messages, config):
            assert messages == [
                ("system", prepared.system_message),
                ("human", prepared.human_message),
            ]
            assert (
                sum(len(message.encode("utf-8")) for _, message in messages)
                == prepared.payload_utf8_bytes
            )
            assert config == {"callbacks": [], "tags": ["cu02-tower-stateless"]}
            return SimpleNamespace(content=json.dumps(output()))

    monkeypatch.setattr(module, "http_client", Client)
    monkeypatch.setattr(module, "model", lambda client: Model())
    response = asyncio.run(TowerGroqExtractor().extract_prepared(prepared))
    assert len(response.categories) == 9
