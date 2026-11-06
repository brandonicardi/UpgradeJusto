"""F API: fixtures A/B obligan PostgreSQL real mediante wrapper existente."""

import hashlib
import hmac
import time
import uuid

from fastapi.testclient import TestClient
from test_pcs_postgres import actors as actors
from test_pcs_postgres import create

from upgradejusto.api.recommendations import service
from upgradejusto.main import app
from upgradejusto.pcs.repository import PCRepository
from upgradejusto.pcs.service import PCService
from upgradejusto.recommendations.service import RecommendationService

GROUPS = [
    {"category": "cpu", "component_id": "P01", "quantity": 1},
    {"category": "motherboard", "component_id": "P03", "quantity": 1},
    {"category": "ram", "component_id": "P04", "quantity": 2},
]


def payload(**changes):
    return {
        "expected_pc_revision": 1,
        "objective": "gaming",
        "budget_ars": "2000000.00",
        "alternatives": [
            {
                "key": "ram",
                "replacements": [
                    {
                        "category": "ram",
                        "candidates": [{"component_id": "P05", "quantity": 2}],
                    }
                ],
            }
        ],
        **changes,
    }


def test_preview_conservative_ephemeral_and_insufficient(actors):
    a, _ = actors
    pc = create(a, components=GROUPS, context={"bios_version": "P2.30", "notes": None})
    path = f"/api/pcs/{pc['id']}/recommendations/preview"
    response = a[0].post(path, json=payload(), headers=a[1])
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert body["pc_id"] == pc["id"] and body["pc_revision"] == "1"
    item = body["items"][0]
    assert item["status"] == "requires_verification"
    assert item["benefit"] == {"status": "unknown", "evidence": []}
    assert item["cost"]["total_ars"] == "766417.98"
    assert item["cost"]["within_budget"] is True
    assert item["cost"]["lines"][0]["date"] == "2026-10-20"
    assert item["evaluation"]["verdict"] == "requiere_verificacion"
    # Scope change is explicit, not reduced coverage under the old engine version.
    assert item["evaluation"]["rules_version"] == "cu05-basic-stock-engine-1"
    assert item["evaluation"]["scope"]["id"] == "cu05-basic-stock-1"
    assert item["evaluation"]["coverage"]["required"] == [
        f"B{i:02}" for i in range(1, 8)
    ]
    assert {check["id"] for check in item["evaluation"]["additional_checks"]} >= {
        "B08",
        "B09",
    }
    assert item["missing_fields"] and body["limitations"]
    low = a[0].post(path, json=payload(budget_ars="766417.97"), headers=a[1])
    assert low.status_code == 200 and low.json()["items"][0]["status"] == "rejected"
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc


def test_owner_revision_validation_csrf_and_unavailable(actors, pg_engine):
    a, b = actors
    pc = create(a, components=GROUPS)
    path = f"/api/pcs/{pc['id']}/recommendations/preview"
    assert (
        b[0].post(path, json=payload(expected_pc_revision=99), headers=b[1]).status_code
        == 404
    )
    assert (
        a[0].post(path, json=payload(expected_pc_revision=99), headers=a[1]).status_code
        == 409
    )
    assert a[0].post(path, json=payload()).status_code == 403
    assert (
        a[0].post(path, json=payload(), headers={**a[1], "Origin": "null"}).status_code
        == 403
    )
    assert a[0].post(path + "?page=1", json=payload(), headers=a[1]).status_code == 403
    for changes in ({"owner_id": str(a[2])}, {"budget_ars": 100}, {"objective": "fps"}):
        assert a[0].post(path, json=payload(**changes), headers=a[1]).status_code == 422
    invalid = payload()
    invalid["alternatives"][0]["replacements"][0]["candidates"][0]["component_id"] = (
        "P99"
    )
    assert a[0].post(path, json=invalid, headers=a[1]).status_code == 422
    with TestClient(
        app, base_url="http://127.0.0.1:3000", client=("127.0.0.1", 50000)
    ) as anonymous:
        assert anonymous.post(path, json=payload()).status_code == 401
    missing = pg_engine.execution_options(
        schema_translate_map={None: "missing_f_" + uuid.uuid4().hex}
    )
    app.dependency_overrides[service] = lambda: RecommendationService(
        PCService(PCRepository(missing), None), None
    )
    try:
        response = a[0].post(path, json=payload(), headers=a[1])
        assert response.status_code == 503
        assert response.json() == {"detail": "Service unavailable"}
    finally:
        app.dependency_overrides.pop(service, None)
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc


def test_gateway_signature_bound_to_preview(actors, monkeypatch):
    a, _ = actors
    pc = create(a, components=GROUPS)
    path = f"/api/pcs/{pc['id']}/recommendations/preview"
    secret = b"synthetic-F-proxy-secret-only-32bytes"
    monkeypatch.setenv("UJ_PROXY_SECRET", secret.decode())
    monkeypatch.setenv("UJ_TRUSTED_PROXY_PEERS", a[3])
    stamp, ip = str(int(time.time())), "198.51.100.45"
    canonical = "\n".join((stamp, "POST", path, ip))
    headers = {
        **a[1],
        "X-UJ-Client-IP": ip,
        "X-UJ-Proxy-Timestamp": stamp,
        "X-UJ-Proxy-Signature": hmac.new(
            secret, canonical.encode(), hashlib.sha256
        ).hexdigest(),
    }
    assert a[0].post(path, json=payload(), headers=headers).status_code == 200
    assert (
        a[0]
        .post(
            path.replace("recommendations/preview", "compatibility/evaluate"),
            json={"expected_pc_revision": 1},
            headers=headers,
        )
        .status_code
        == 403
    )
