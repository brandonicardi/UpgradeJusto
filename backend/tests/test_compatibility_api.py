"""D API + PG real; fixture A/B reutilizado, sin persistir evaluaciones."""

import hashlib
import hmac
import time
import uuid

import pytest
from fastapi.testclient import TestClient
from test_pcs_postgres import actors as actors
from test_pcs_postgres import create

from upgradejusto.api.compatibility import service
from upgradejusto.compatibility.application import CompatibilityService
from upgradejusto.main import app
from upgradejusto.pcs.repository import PCRepository
from upgradejusto.pcs.service import PCService

ORIGIN = "http://127.0.0.1:3000"
GROUPS = [
    {"category": "cpu", "component_id": "P01", "quantity": 1},
    {"category": "motherboard", "component_id": "P03", "quantity": 1},
    {"category": "ram", "component_id": "P04", "quantity": 2},
]


def endpoints(pc):
    return f"/api/pcs/{pc['id']}/compatibility"


def test_evaluate_and_simulate_are_ephemeral_and_replace_all_ram(actors):
    a, _ = actors
    pc = create(a, components=GROUPS, context={"bios_version": "P2.30", "notes": None})
    root = endpoints(pc)
    response = a[0].post(
        root + "/evaluate", headers=a[1], json={"expected_pc_revision": 1}
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "verdict",
        "rule_results",
        "missing_fields",
        "rules_version",
        "data_revision",
        "pc_revision",
        "coverage",
        "evaluated_configuration",
        "scope",
        "additional_checks",
        "warnings",
    }
    # New calculations use the authorized basic scope; legacy engine tests keep12.
    assert body["pc_revision"] == "1" and body["rules_version"] == "cu05-basic-stock-engine-1"
    assert body["scope"]["id"] == "cu05-basic-stock-1"
    assert body["scope"]["inventory_version"] == "basic-stock-inventory-1"
    assert body["verdict"] == "requiere_verificacion"
    assert body["coverage"]["required"] == [f"B{i:02}" for i in range(1, 8)]
    assert {check["id"] for check in body["additional_checks"]} >= {"B08", "B09"}
    assert body["warnings"]
    assert body["rule_results"][0]["state"] == "pass"
    assert response.headers["cache-control"] == "no-store"
    response = a[0].post(
        root + "/simulate",
        headers=a[1],
        json={
            "expected_pc_revision": 1,
            "category": "ram",
            "candidates": [
                {"component_id": "P04", "quantity": 1},
                {"component_id": "P05", "quantity": 3},
            ],
        },
    )
    assert response.status_code == 200
    groups = response.json()["evaluated_configuration"]["components"]
    assert [g for g in groups if g["category"] == "ram"] == [
        {"category": "ram", "component_id": "P04", "quantity": 1},
        {"category": "ram", "component_id": "P05", "quantity": 3},
    ]
    assert (
        response.json()["evaluated_configuration"]["context"]["bios_version"] == "P2.30"
    )
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc


@pytest.mark.parametrize(
    "context,state,bios",
    [
        ({}, "unknown", None),
        ({"candidate_context": {"bios_version": None}}, "unknown", None),
        ({"candidate_context": {"bios_version": "P2.30"}}, "pass", "P2.30"),
        ({"candidate_context": {"bios_version": "P1.20"}}, "fail", "P1.20"),
    ],
)
def test_new_motherboard_never_inherits_bios(actors, context, state, bios):
    a, _ = actors
    pc = create(a, components=GROUPS, context={"bios_version": "P2.30", "notes": None})
    response = a[0].post(
        endpoints(pc) + "/simulate",
        headers=a[1],
        json={
            "expected_pc_revision": 1,
            "category": "motherboard",
            "candidates": [{"component_id": "P03", "quantity": 1}],
            **context,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["evaluated_configuration"]["context"]["bios_version"] == bios
    assert body["rule_results"][0]["state"] == state
    assert body["verdict"] == (
        "incompatible" if state == "fail" else "requiere_verificacion"
    )
    assert body["missing_fields"] and not body["coverage"]["complete"]
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc


@pytest.mark.parametrize(
    "changes",
    [
        {"candidates": []},
        {"candidates": [{"component_id": "P99", "quantity": 1}]},
        {"candidates": [{"component_id": "P01", "quantity": 1}]},
        {"candidates": [{"component_id": "P05", "quantity": True}]},
        {"candidates": [{"component_id": "P05", "quantity": 1.0}]},
        {"candidates": [{"component_id": "P05", "quantity": 0}]},
        {
            "candidates": [
                {"component_id": "P04", "quantity": 5},
                {"component_id": "P05", "quantity": 4},
            ]
        },
        {"candidates": [{"component_id": "P05", "quantity": 1}] * 2},
        {"candidate_context": {"bios_version": None}},
        {"category": "motherboard", "candidate_context": None},
        {"category": "cpu", "candidates": [{"component_id": "P01", "quantity": 2}]},
        {"coverage": {"complete": True}},
        {"results": []},
        {"user_id": "owner"},
        {"expected_pc_revision": True},
    ],
)
def test_operational_validation_and_no_preapproved_results(actors, changes):
    a, _ = actors
    pc = create(a, components=GROUPS)
    response = a[0].post(
        endpoints(pc) + "/simulate",
        headers=a[1],
        json={
            "expected_pc_revision": 1,
            "category": "ram",
            "candidates": [{"component_id": "P05", "quantity": 2}],
            **changes,
        },
    )
    assert response.status_code == 422
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc


def test_owner_revision_auth_csrf_gateway_and_pg_failure(actors, pg_engine):
    a, b = actors
    pc = create(a, components=GROUPS)
    root = endpoints(pc)
    data = {"expected_pc_revision": 1}
    for action, payload in [
        ("evaluate", data),
        (
            "simulate",
            {
                **data,
                "category": "cpu",
                "candidates": [{"component_id": "P02", "quantity": 1}],
            },
        ),
    ]:
        assert (
            b[0].post(root + "/" + action, headers=b[1], json=payload).status_code
            == 404
        )
        assert (
            a[0]
            .post(
                root + "/" + action,
                headers=a[1],
                json={**payload, "expected_pc_revision": 99},
            )
            .status_code
            == 409
        )
        assert a[0].post(root + "/" + action, json=payload).status_code == 403
        assert (
            a[0]
            .post(root + "/" + action, headers={**a[1], "Origin": "null"}, json=payload)
            .status_code
            == 403
        )
        assert (
            a[0]
            .post(root + "/" + action + "?page=1", headers=a[1], json=payload)
            .status_code
            == 403
        )
    with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50000)) as anonymous:
        assert anonymous.post(root + "/evaluate", json=data).status_code == 401
    missing = pg_engine.execution_options(
        schema_translate_map={None: "missing_d_" + uuid.uuid4().hex}
    )
    app.dependency_overrides[service] = lambda: CompatibilityService(
        PCService(PCRepository(missing), None), None
    )
    try:
        response = a[0].post(root + "/evaluate", headers=a[1], json=data)
        assert response.status_code == 503
        assert response.json() == {"detail": "Service unavailable"}
    finally:
        app.dependency_overrides.pop(service, None)
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc


def test_signed_actions_bound_to_post_and_exact_path(actors, monkeypatch):
    a, _ = actors
    pc = create(a)
    secret = b"synthetic-D-proxy-secret-only-32bytes"
    monkeypatch.setenv("UJ_PROXY_SECRET", secret.decode())
    monkeypatch.setenv("UJ_TRUSTED_PROXY_PEERS", a[3])
    stamp, ip = str(int(time.time())), "198.51.100.44"
    path = endpoints(pc) + "/evaluate"
    canonical = "\n".join((stamp, "POST", path, ip))
    headers = {
        **a[1],
        "X-UJ-Client-IP": ip,
        "X-UJ-Proxy-Timestamp": stamp,
        "X-UJ-Proxy-Signature": hmac.new(
            secret, canonical.encode(), hashlib.sha256
        ).hexdigest(),
    }
    assert (
        a[0].post(path, headers=headers, json={"expected_pc_revision": 1}).status_code
        == 200
    )
    assert (
        a[0]
        .post(
            endpoints(pc) + "/simulate",
            headers=headers,
            json={
                "expected_pc_revision": 1,
                "category": "cpu",
                "candidates": [{"component_id": "P02", "quantity": 1}],
            },
        )
        .status_code
        == 403
    )
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc
