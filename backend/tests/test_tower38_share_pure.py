"""Synthetic privacy/type gates, not PG, log-redaction or real hardware proof."""

import json
from copy import deepcopy
from uuid import uuid4

import pytest
from pydantic import ValidationError
from test_tower38_plan_pure import calculate, draft, stage
from test_tower38_recommend_pure import NOW, catalog, cpus, part, tower

from upgradejusto.catalog.models import Source
from upgradejusto.catalog.service import ResolvedCatalog
from upgradejusto.compatibility.tower_contract import (
    EssentialScope,
    EssentialScopeV2,
    TowerScope,
)
from upgradejusto.compatibility.tower_essential import PHYSICAL_SPACE_NOT_EVALUATED
from upgradejusto.pcs.service import PCError
from upgradejusto.recommendations.tower_service import replacement
from upgradejusto.shares.tower_models import TowerPublishRequest
from upgradejusto.shares.tower_projection import TowerPublicProjection
from upgradejusto.shares.tower_registry import (
    ESSENTIAL_ORIGIN,
    EXCLUDES,
    ORIGIN,
    money,
    typed_value,
    url_class,
)
from upgradejusto.shares.tower_service import (
    ProjectionGeneration,
    ReadBudgetExceeded,
    TowerShareService,
    token_digest,
)
from upgradejusto.shares.tower_sources import PublicSources

TITLE = "Plan de mejora de torre"
MARKER = "PRIVATE-person@example.invalid"


def projection_fixture():
    old, new = cpus()
    data, base = catalog(old, new), tower(old)
    document = calculate(base, draft(base, [stage(replacement(new))]), data)
    return document, PublicSources(data, "synthetic-publication", [])


def project(document, sources):
    return ProjectionGeneration().project(document, TITLE, sources, 1, NOW)


def recount(evaluation):
    rules = evaluation["rule_results"]
    evaluation["coverage"].update(
        passed=[rule["rule_id"] for rule in rules if rule["state"] == "pass"],
        failed=[rule["rule_id"] for rule in rules if rule["state"] == "fail"],
        unknown=[rule["rule_id"] for rule in rules if rule["state"] == "unknown"],
        not_applicable=[
            rule["rule_id"] for rule in rules if rule["state"] == "not_applicable"
        ],
        evaluated=[
            rule["rule_id"] for rule in rules if rule["state"] in ("pass", "fail")
        ],
    )


def mutate_state(evaluation, identity, state, conditions=None):
    rule = next(
        rule for rule in evaluation["rule_results"] if rule["rule_id"] == identity
    )
    rule["state"] = state
    if conditions is not None:
        rule["conditions"] = conditions
    if state == "not_applicable":
        rule["missing_fields"] = []
    recount(evaluation)


def as_v1(document):
    document = deepcopy(document)
    document["versions"].update(
        {
            key: ESSENTIAL_ORIGIN[key]
            for key in ("scope", "policy", "inventory", "rules")
        }
    )
    for item in document["stages"]:
        evaluation = item["evaluation"]
        for rule in evaluation["rule_results"]:
            if rule["state"] == "not_applicable":
                # Authentic v1 snapshots never carried n/a.
                rule["state"] = "unknown"
                rule["missing_fields"] = ["case.not_evaluated_in_v1"]
        evaluation["rules_version"] = ESSENTIAL_ORIGIN["rules"]
        evaluation["scope"] = EssentialScope().model_dump(mode="json")
        evaluation["warnings"] = list(EssentialScope().excludes)
        recount(evaluation)
    return document


def as_stock(document):
    document = as_v1(document)
    document["versions"].update(
        {key: ORIGIN[key] for key in ("scope", "policy", "inventory", "rules")}
    )
    ids = [f"T{index:02}" for index in range(1, 13)]
    for item in document["stages"]:
        item["evaluation"].update(
            rules_version=ORIGIN["rules"],
            scope=TowerScope().model_dump(mode="json"),
            warnings=list(EXCLUDES),
            additional_checks=[],
            missing_fields=[],
            verdict="compatible",
            rule_results=[
                {
                    "rule_id": rule_id,
                    "family": rule_id,
                    "state": "pass",
                    "facts": [],
                    "evidence": [],
                    "conditions": [],
                    "missing_fields": [],
                }
                for rule_id in ids
            ],
            coverage={
                "required": ids,
                "implemented": ids,
                "evaluated": ids,
                "passed": ids,
                "failed": [],
                "unknown": [],
                "not_applicable": [],
                "not_implemented": [],
                "complete": True,
            },
        )
    return document


def test_essential_v2_labels_and_v1_stock_contracts_stay_accepted():
    document, sources = projection_fixture()
    v2 = project(document, sources)
    assert v2["versions"]["scope"] == "cu05-tower-essential-2"
    assert v2["versions"]["policy"] == "tower-essential-policy-2"
    assert v2["versions"]["rules"] == "cu05-tower-essential-engine-2"
    evaluation = v2["stages"][0]["evaluation"]
    assert evaluation["scope"]["id"] == "cu05-tower-essential-2"
    assert evaluation["scope"]["excludes"] == list(EssentialScopeV2().excludes)
    assert evaluation["rule_results"][0]["reason"].startswith("CPU y placa: ")
    assert not [
        fact
        for rule in evaluation["rule_results"]
        for fact in rule["facts"]
        if "bios" in json.dumps(fact).lower()
    ]
    assert not [
        missing
        for rule in evaluation["rule_results"]
        for missing in rule["missing_fields"]
        if "bios" in json.dumps(missing).lower()
    ]

    v1_document = as_v1(document)
    v1_before = deepcopy(v1_document)
    v1 = project(v1_document, sources)
    assert v1_document == v1_before
    assert v1["versions"]["scope"] == "cu05-tower-essential-1"
    assert v1["stages"][0]["evaluation"]["scope"]["id"] == "cu05-tower-essential-1"
    assert v1["stages"][0]["evaluation"]["rule_results"][0]["reason"].startswith(
        "CPU/placa/BIOS: "
    )
    assert v1["stages"][0]["evaluation"]["scope"]["excludes"] == list(
        EssentialScope().excludes
    )

    stock_document = as_stock(v1_document)
    ids = [f"T{index:02}" for index in range(1, 13)]
    stock_before = deepcopy(stock_document)
    stock = project(stock_document, sources)
    assert stock_document == stock_before
    assert stock["versions"]["scope"] == "cu05-tower-stock-1"
    assert stock["versions"]["rules"] == "cu05-tower-stock-engine-1"
    assert [
        rule["rule_id"] for rule in stock["stages"][0]["evaluation"]["rule_results"]
    ] == (ids)
    assert stock["stages"][0]["evaluation"]["scope"]["id"] == "cu05-tower-stock-1"
    assert stock["stages"][0]["evaluation"]["rule_results"][0]["reason"].startswith(
        "CPU/placa/BIOS: "
    )


def test_essential_v2_not_applicable_and_physical_warning_are_validated():
    document, sources = projection_fixture()
    evaluation = document["stages"][0]["evaluation"]
    rules = {rule["rule_id"]: rule for rule in evaluation["rule_results"]}
    assert rules["T04"]["state"] == "not_applicable"
    assert rules["T07"]["state"] == "not_applicable"
    assert PHYSICAL_SPACE_NOT_EVALUATED in evaluation["warnings"]
    public = project(document, sources)
    projected = public["stages"][0]["evaluation"]
    states = {rule["rule_id"]: rule for rule in projected["rule_results"]}
    assert states["T04"]["state"] == "not_applicable"
    assert states["T07"]["state"] == "not_applicable"
    assert states["T04"]["reason"].startswith("Largo GPU: no evaluada")
    assert states["T07"]["reason"].startswith("Formatos y montaje: no evaluada")
    assert set(projected["coverage"]["not_applicable"]) >= {"T04", "T07"}
    assert not {"T04", "T07"} & set(projected["coverage"]["evaluated"])
    # The free-text notice is reserved, never republished verbatim.
    assert PHYSICAL_SPACE_NOT_EVALUATED not in json.dumps(public)


def test_essential_v2_accepts_all_physical_checks_as_not_applicable_with_reason():
    document, sources = projection_fixture()
    evaluation = document["stages"][0]["evaluation"]
    for identity in ("T04", "T07", "T08"):
        mutate_state(
            evaluation, identity, "not_applicable", [PHYSICAL_SPACE_NOT_EVALUATED]
        )
    public = project(document, sources)
    projected = public["stages"][0]["evaluation"]
    assert set(projected["coverage"]["not_applicable"]) == {"T04", "T07", "T08"}
    assert all(
        rule["state"] == "not_applicable"
        for rule in projected["rule_results"]
        if rule["rule_id"] in ("T04", "T07", "T08")
    )


@pytest.mark.parametrize("identity", ["T01", "T02"])
def test_essential_v2_rejects_not_applicable_outside_physical_checks(identity):
    document, sources = projection_fixture()
    evaluation = document["stages"][0]["evaluation"]
    mutate_state(evaluation, identity, "not_applicable", ["Synthetic reason"])
    with pytest.raises(PCError) as error:
        project(document, sources)
    assert error.value.status == 422


def test_essential_v2_rejects_not_applicable_without_conditions():
    document, sources = projection_fixture()
    mutate_state(document["stages"][0]["evaluation"], "T04", "not_applicable", [])
    with pytest.raises(PCError) as error:
        project(document, sources)
    assert error.value.status == 422


def test_essential_v1_and_stock_reject_not_applicable():
    document, sources = projection_fixture()
    for converted in (as_v1(document), as_stock(document)):
        mutate_state(
            converted["stages"][0]["evaluation"],
            "T04",
            "not_applicable",
            ["Synthetic reason"],
        )
        with pytest.raises(PCError) as error:
            project(converted, sources)
        assert error.value.status == 422


def test_all_three_contexts_free_facts_reasons_and_future_keys_never_escape():
    document, sources = projection_fixture()
    original = deepcopy(document)
    document["name"] = MARKER
    document["future_private"] = {"id": MARKER}
    configs = [
        document["base_configuration"],
        document["stages"][0]["evaluated_configuration"],
        document["stages"][0]["evaluation"]["evaluated_configuration"],
    ]
    private_ids = set()
    for config in configs:
        config["name"] = MARKER
        config["future_private"] = {"secret": MARKER}
        config["context"]["notes"] = MARKER
        config["context"]["bios_version"] = MARKER
        config["context"]["future_private"] = MARKER
        private_ids.add(str(config.get("id")))
        for line in config["lines"]:
            private_ids.add(line["line_id"])
            line["future_private"] = MARKER
    evaluation = document["stages"][0]["evaluation"]
    evaluation["data_revision"] = MARKER
    evaluation["pc_revision"] = MARKER
    for rule in evaluation["rule_results"]:
        rule["facts"].append({"name": MARKER, "value": MARKER, "unit": MARKER})
        rule["conditions"] = [MARKER]
        rule["missing_fields"].append(MARKER)
        rule["evidence"].append(
            {
                "source_id": MARKER,
                "url": "https://private.invalid/" + MARKER,
                "consulted_on": "2026-10-26",
                "locator": MARKER,
            }
        )
    evaluation["rule_results"][0]["facts"].append(
        {"name": "cpu_model", "value": MARKER, "unit": MARKER}
    )
    document["stages"][0]["actions"][0]["candidates"] = [
        {
            "declared_model": MARKER,
            "component_id": None,
            "quantity": 1,
            "future_private": MARKER,
        }
    ]
    document["stages"][0]["name"] = MARKER
    document["stages"][0]["benefit"]["label"] = MARKER
    public = project(document, sources)
    encoded = json.dumps(public)
    assert MARKER not in encoded
    assert all(
        identity not in encoded for identity in private_ids if identity != "None"
    )
    assert public["projection"]["evidence_complete"] is False
    assert public["status"] != "ready"
    assert public["stages"][0]["status"] != "ready"
    assert (
        public["stages"][0]["evaluation"]["verdict"]
        == original["stages"][0]["evaluation"]["verdict"]
    )
    assert (
        public["stages"][0]["evaluation"]["coverage"]
        == original["stages"][0]["evaluation"]["coverage"]
    )
    assert public["stages"][0]["evaluation"]["missing_fields"]


def test_closed_inventory_fail_dominates_without_erasing_missing():
    document, sources = projection_fixture()
    evaluation = document["stages"][0]["evaluation"]
    rule = evaluation["rule_results"][0]
    for key in ("passed", "unknown", "failed"):
        evaluation["coverage"][key] = [
            v for v in evaluation["coverage"][key] if v != "T01"
        ]
    rule["state"] = "fail"
    evaluation["coverage"]["failed"].insert(0, "T01")
    evaluation["coverage"]["evaluated"] = [
        "T01",
        *[v for v in evaluation["coverage"]["evaluated"] if v != "T01"],
    ]
    evaluation["verdict"] = "incompatible"
    public = project(document, sources)
    assert public["status"] == "blocked"
    assert public["stages"][0]["evaluation"]["missing_fields"]
    rule["rule_id"] = "T13"
    with pytest.raises(PCError) as error:
        project(document, sources)
    assert error.value.status == 422


@pytest.mark.parametrize(
    "private_status,cause",
    [
        ("blocked", "budget"),
        ("blocked", "material"),
        ("requires_verification", "unknown"),
    ],
)
def test_stage_blocked_dominates_withheld_without_technical_failure(
    private_status, cause
):
    # Synthetic presentation regression, NOT compatible hardware or cost proof.
    document, sources = projection_fixture()
    stage = document["stages"][0]
    stage["status"] = private_status
    document["status"] = private_status
    stage["missing_fields"] = ["synthetic_required_" + cause]
    if cause == "budget":
        stage["cost"]["within_budget"] = False
        stage["cumulative_cost"]["within_budget"] = False
        document["cost"]["within_budget"] = False
    elif cause == "material":
        stage["dependencies"] = [
            {
                "kind": "thermal_compound",
                "required": True,
                "state": "missing",
                "amount_ars": None,
                "source_refs": [],
            }
        ]
    evaluation = stage["evaluation"]
    rule_ids = [rule["rule_id"] for rule in evaluation["rule_results"]]
    for rule in evaluation["rule_results"]:
        rule["state"] = "pass"
        rule["missing_fields"] = []
    evaluation["verdict"] = "compatible"
    evaluation["missing_fields"] = []
    evaluation["coverage"] = {
        "required": rule_ids[:],
        "implemented": rule_ids[:],
        "evaluated": rule_ids[:],
        "passed": rule_ids[:],
        "failed": [],
        "unknown": [],
        "not_applicable": [],
        "not_implemented": [],
        "complete": True,
    }
    original = deepcopy(document)
    public = project(document, sources)
    projected = public["stages"][0]
    assert projected["status"] == private_status
    assert public["status"] == private_status
    assert public["projection"]["evidence_complete"] is False
    assert projected["evaluation"]["verdict"] == "compatible"
    assert projected["evaluation"]["coverage"] == evaluation["coverage"]
    assert projected["evaluation"]["missing_fields"] == []
    assert projected["missing_fields"] == [
        {"code": "required_fact_missing", "count": 1}
    ]
    for scope in ("cost", "cumulative_cost"):
        for key in (
            "total_ars",
            "known_subtotal_ars",
            "within_budget",
            "lines",
            "excluded",
        ):
            assert projected[scope][key] == stage[scope][key]
        assert projected[scope]["missing_fields"] == [
            {
                "code": "quote_unresolved",
                "count": len(stage[scope]["missing_fields"]),
            }
        ]
    assert public["missing_fields"]
    if cause == "budget":
        assert projected["cost"]["within_budget"] is False
    elif cause == "material":
        assert projected["dependencies"][0]["state"] == "missing"
    assert document == original


def test_gain_rebuilds_closed_private_inputs_and_preserves_server_selections(
    monkeypatch,
):
    import upgradejusto.shares.tower_projection as module

    document, sources = projection_fixture()
    projection = TowerPublicProjection(document, TITLE, sources, 1, NOW)
    before = deepcopy(document["base_configuration"])
    after = deepcopy(document["stages"][0]["evaluated_configuration"])
    for configuration in (before, after):
        configuration["name"] = MARKER
        configuration["future_private"] = {"secret": MARKER}
        configuration["context"] = {
            "notes": MARKER,
            "bios_version": MARKER,
            "future_private": MARKER,
        }
        for line in configuration["lines"]:
            line["future_private"] = {"secret": MARKER}
    contaminated = deepcopy((before, after))
    captured = []
    original = module.benefit

    def inspect(clean_before, clean_after, catalog_data, objective, workload):
        for clean, raw in ((clean_before, before), (clean_after, after)):
            serialized = clean.model_dump(mode="json")
            assert MARKER not in json.dumps(serialized)
            assert serialized["id"] == raw["id"]
            assert [line["line_id"] for line in serialized["lines"]] == [
                line["line_id"] for line in raw["lines"]
            ]
            assert [(line.component_id, line.quantity) for line in clean.lines] == [
                (line["component_id"], line["quantity"]) for line in raw["lines"]
            ]
        captured.append(True)
        return original(clean_before, clean_after, catalog_data, objective, workload)

    monkeypatch.setattr(module, "benefit", inspect)
    result = projection.gain(document["stages"][0]["benefit"], before, after)
    assert captured == [True]
    assert (before, after) == contaminated
    assert MARKER not in json.dumps(result)


def test_gain_malformed_selection_is_sanitized_and_unbound_catalog_is_reserved():
    document, sources = projection_fixture()
    projection = TowerPublicProjection(document, TITLE, sources, 1, NOW)
    before = deepcopy(document["base_configuration"])
    after = deepcopy(document["stages"][0]["evaluated_configuration"])
    malformed = deepcopy(after)
    malformed["lines"][0]["quantity"] = MARKER
    with pytest.raises(PCError) as error:
        projection.gain(document["stages"][0]["benefit"], before, malformed)
    assert error.value.status == 422
    assert MARKER not in error.value.detail
    after["lines"][0]["component_id"] = "unpublished-synthetic-component"
    result = projection.gain(document["stages"][0]["benefit"], before, after)
    assert result["status"] == "unknown"
    assert result["before"] is None and result["after"] is None
    assert projection.withheld > 0


@pytest.mark.parametrize(
    "url",
    [
        "http://imagenes.compragamer.com/a.jpg",
        "https://private.invalid/a.jpg",
        "https://imagenes.compragamer.com/a.jpg?private=1",
    ],
)
def test_photo_policy_denies_http_unknown_host_and_query(url):
    assert url_class(url, {"store": "compragamer"}, image=True) is None


def test_unknown_zero_and_bool_are_distinct_and_money_is_decimal_text():
    assert typed_value("count", None)
    assert typed_value("count", 0)
    assert not typed_value("count", False)
    assert not typed_value("count", 0.0)
    assert money("999999999999999999.00") == "999999999999999999.00"
    for value in (True, 1.0, "1e2", "NaN", "-1.00"):
        with pytest.raises(ValueError):
            money(value)


@pytest.mark.parametrize("confirmation", [False, 1, "true", None])
def test_publish_requires_explicit_confirmation(confirmation):
    with pytest.raises(ValidationError):
        TowerPublishRequest(
            expected_plan_revision=1,
            title=TITLE,
            public_projection_confirmed=confirmation,
        )


def test_budget_precedes_even_malformed_lookup_and_commit_precedes_token_return():
    class Repository:
        attempts = 0
        lookups = 0

        def consume_read(self, key):
            assert len(key) == 64 and "127.0.0.1" not in key
            self.attempts += 1
            return self.attempts <= 60, 42

        def public(self, digest):
            self.lookups += 1
            return {"synthetic": True}

        def publish(self, *args):
            assert len(args[3]) == 64
            raise PCError(503, "Share storage unavailable")

    repo = Repository()
    svc = TowerShareService(repo)
    for _ in range(60):
        with pytest.raises(PCError) as error:
            svc.public("malformed", "127.0.0.1")
        assert error.value.status == 404
    with pytest.raises(ReadBudgetExceeded) as error:
        svc.public("A" * 43, "127.0.0.1")
    assert error.value.retry_after == 42
    assert repo.lookups == 0
    request = TowerPublishRequest(
        expected_plan_revision=1, title=TITLE, public_projection_confirmed=True
    )
    with pytest.raises(PCError) as error:
        svc.publish(uuid4(), uuid4(), request)
    assert "token" not in error.value.detail
    assert len(token_digest("A" * 43)) == 64


def test_whole_payload_and_deadline_reject_without_truncation():
    document, sources = projection_fixture()
    document["future_private"] = "x" * (1024 * 1024)
    with pytest.raises(PCError) as error:
        project(document, sources)
    assert error.value.status == 422
    generation = ProjectionGeneration()
    generation.deadline = 0
    with pytest.raises(PCError) as error:
        generation.check()
    assert error.value.status == 503


def test_historical_quote_exact_binding_no_freshness_and_photo_allowlist():
    source_url = "https://compragamer.com/producto/123"
    component = part("synthetic-drive", "storage", MARKER).model_copy(
        update={"sources": (Source(id="synthetic-retail", url=source_url),)}
    )
    rows = [
        {
            "source_id": "synthetic-retail",
            "url": source_url,
            "consulted_on": "2026-10-26",
            "locator": MARKER,
        }
    ]
    data = ResolvedCatalog((component,), (), rows)
    binding = {
        "store": "compragamer",
        "product_id": "123",
        "variant_key": "synthetic-exact",
        "category": "storage",
        "source_url": source_url,
    }
    raw = {
        "offer_id": "synthetic-offer",
        "component_id": component.id,
        **{k: binding[k] for k in ("store", "product_id", "variant_key", "source_url")},
        "amount": "12.34",
        "currency": "ARS",
        "condition": "cash",
        "availability": "unknown",
        "stock_quantity": None,
        "observed_at": "2025-01-01T00:00:00+00:00",
        "expires_at": "2025-01-02T00:00:00+00:00",
    }
    image = {
        "url": "https://imagenes.compragamer.com/productos/compragamer_Imganen_general_123.jpg",
        "source_url": source_url,
        "status": "verified",
        "exact_variant": True,
        "retrieved_at": "2025-01-01T00:00:00+00:00",
        "rights_note": MARKER,
        "alt": MARKER,
        "future_private": MARKER,
    }
    resources = [
        {
            "component_id": component.id,
            "identity": binding,
            "image_evidence": image,
            "offers": [raw],
        }
    ]
    sources = PublicSources(data, "synthetic-historical", resources)
    quoted = sources.quote(deepcopy(raw))
    assert quoted["amount"] == "12.34"
    assert quoted["availability_at_quote"] == "unknown"
    assert "stock_quantity" not in quoted
    assert MARKER not in json.dumps(
        {
            "quote": quoted,
            "photo": sources.photo(component),
            "refs": sources.public_refs,
        }
    )
    for field, value in (
        ("amount", "13.00"),
        ("variant_key", "wrong"),
        ("observed_at", "2025-01-03T00:00:00+00:00"),
    ):
        with pytest.raises(PCError):
            sources.quote({**raw, field: value})
    image["url"] = image["url"].replace("https:", "http:")
    assert sources.photo(component) is None
    image["url"] = (
        "https://imagenes.compragamer.com/productos/compragamer_Imganen_general_123.jpg"
    )
    image["exact_variant"] = False
    assert sources.photo(component) is None
