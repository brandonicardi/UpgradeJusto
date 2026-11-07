"""Actual main app + TEST PG/session controls; no provider or fake auth profile."""

import hashlib
import hmac
from time import time
from types import SimpleNamespace
from urllib.parse import unquote
from uuid import uuid4

import pytest
import sqlalchemy as sa
from fastapi import Request
from fastapi.testclient import TestClient
from test_pcs_postgres import ORIGIN, create
from test_pcs_postgres import actors as actors
from test_torre_plan_pg import body

from upgradejusto.administration.tables import active
from upgradejusto.api.proxy_ip import permitted_query
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.main import app
from upgradejusto.persistence.runtime import Unavailable
from upgradejusto.persistence.schema import components
from upgradejusto.plans.tower_repository import TowerPlanRepository
from upgradejusto.plans.tower_tables import headers

ROOT = "/api/tower-plans"
SYNTHETIC_KEY = "synthetic-plan-mounted-signature-key-only-not-a-secret"


@pytest.fixture
def mounted_context(actors, pg_engine):
    a, b = actors
    saved = create(a, context={"bios_version": None, "notes": "Synthetic private note"})
    version = PostgresCatalogRepository(pg_engine).dataset_version
    with pg_engine.connect() as conn:
        point = conn.scalar(sa.select(active.c.version).where(active.c.singleton == 1))
        count = conn.scalar(
            sa.select(sa.func.count())
            .select_from(components)
            .where(components.c.dataset_version == version)
        )
    try:
        yield SimpleNamespace(a=a, b=b, saved=saved, version=version)
    finally:
        with pg_engine.begin() as conn:
            # Synthetic owners only; no reset/pointer/publication/legacy-row writes.
            conn.execute(headers.delete().where(headers.c.owner_id.in_([a[2], b[2]])))
            assert (
                conn.scalar(sa.select(active.c.version).where(active.c.singleton == 1))
                == point
            )
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(components)
                    .where(components.c.dataset_version == version)
                )
                == count
            )


def signed(method, raw_path, actor):
    timestamp = str(int(time()))
    canonical = "\n".join((timestamp, method, raw_path, actor[3]))
    signature = hmac.new(
        SYNTHETIC_KEY.encode(), canonical.encode(), hashlib.sha256
    ).hexdigest()
    return {
        **actor[1],
        "x-uj-client-ip": actor[3],
        "x-uj-proxy-timestamp": timestamp,
        "x-uj-proxy-signature": signature,
    }


def checked(response, status):
    assert response.status_code == status, response.text
    assert response.headers["cache-control"] == "no-store"
    return response


def test_mounted_tower_plan_signed_owner_history_cache_and_caps(
    mounted_context, monkeypatch
):
    ctx = mounted_context
    a, b = ctx.a, ctx.b
    # TEST fixture-local synthetic trust/key; never read a deployed secret, change
    # env files or override identity/CSRF/client_ip/service construction.
    monkeypatch.setenv("UJ_PROXY_SECRET", SYNTHETIC_KEY)
    monkeypatch.setenv("UJ_TRUSTED_PROXY_PEERS", f"{a[3]},{b[3]}")
    payload = body(ctx)
    response = checked(
        a[0].post(ROOT, headers=signed("POST", ROOT, a), json=payload), 201
    )
    first = response.json()
    assert first["snapshot"]["status"] == "requires_verification"
    path = ROOT + "/" + first["id"]
    checked(a[0].get(path, headers=signed("GET", path, a)), 200)
    checked(b[0].get(path, headers=signed("GET", path, b)), 404)
    known_history = path + "/revisions/1"
    assert (
        checked(
            a[0].get(known_history, headers=signed("GET", known_history, a)), 200
        ).json()
        == first
    )
    for revision in (2147483647, 2147483648, 9999999999):
        missing_history = path + f"/revisions/{revision}"
        missing = checked(
            a[0].get(missing_history, headers=signed("GET", missing_history, a)), 404
        )
        assert missing.json() == {"detail": "Plan revision not found"}
    upper_history = path + "/revisions/9999999999"
    foreign_history = checked(
        b[0].get(upper_history, headers=signed("GET", upper_history, b)), 404
    )
    assert foreign_history.json() == {"detail": "Plan not found"}
    with TestClient(app, base_url=ORIGIN, client=(a[3], 50021)) as anonymous:
        checked(anonymous.get(path, headers=signed("GET", path, a)), 401)
        checked(
            anonymous.get(upper_history, headers=signed("GET", upper_history, a)), 401
        )
    no_csrf = signed("POST", ROOT, a)
    no_csrf.pop("X-CSRF-Token")
    checked(a[0].post(ROOT, headers=no_csrf, json=payload), 403)
    bad_origin = {**signed("POST", ROOT, a), "Origin": "https://evil.example.test"}
    checked(a[0].post(ROOT, headers=bad_origin, json=payload), 403)
    checked(b[0].post(ROOT, headers=signed("POST", ROOT, b), json=payload), 404)
    checked(
        a[0].post(
            ROOT,
            headers=signed("POST", ROOT, a),
            json={**payload, "technical_evidence": {}},
        ),
        422,
    )
    checked(
        a[0].post(ROOT, headers=signed("POST", ROOT, a), content=b"x" * 262145), 413
    )
    for query in (
        "?page=0",
        "?page=01",
        "?page=10001",
        "?page_size=0",
        "?page_size=51",
        "?page=1&page=2",
        "?page=1&owner_id=x",
        "?%70age=1",
        "?Page=1",
        "?page=",
    ):
        checked(a[0].get(ROOT + query, headers=signed("GET", ROOT, a)), 403)
    checked(
        a[0].post(ROOT + "?page=1", headers=signed("POST", ROOT, a), json=payload), 403
    )
    listed = checked(
        a[0].get(ROOT + "?page=1&page_size=1", headers=signed("GET", ROOT, a)), 200
    ).json()
    assert listed["total"] == 1 and listed["items"][0]["id"] == first["id"]
    checked(
        a[0].get(ROOT + "?page=10000&page_size=50", headers=signed("GET", ROOT, a)),
        200,
    )
    checked(a[0].get(path + "?page=1", headers=signed("GET", path, a)), 403)
    checked(a[0].get(path, headers=signed("POST", path, a)), 403)
    checked(a[0].get(path, headers=signed("GET", ROOT, a)), 403)
    checked(a[0].get(path, headers={**a[1], "x-uj-client-ip": a[3]}), 403)
    checked(
        a[0].get(path, headers={**signed("GET", path, a), "x-uj-user-id": str(a[2])}),
        403,
    )
    for alias in (
        path.replace("/tower-plans/", "/%74ower-plans/"),
        ROOT + "/AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA",
        path + "/revisions/01",
        path + "/revisions/10000000000",
    ):
        checked(a[0].get(alias, headers=signed("GET", alias, a)), 403)
    replay = checked(
        a[0].post(ROOT, headers=signed("POST", ROOT, a), json=payload), 200
    )
    assert replay.headers["idempotency-replayed"] == "true" and replay.json() == first
    recalc = path + "/recalculate"
    update = {**payload, "client_request_id": str(uuid4()), "expected_plan_revision": 1}
    second = checked(
        a[0].post(recalc, headers=signed("POST", recalc, a), json=update), 200
    )
    assert second.json()["revision"] == 2
    third = {**update, "client_request_id": str(uuid4()), "expected_plan_revision": 2}
    assert (
        checked(
            a[0].post(recalc, headers=signed("POST", recalc, a), json=third), 200
        ).json()["revision"]
        == 3
    )
    old_replay = checked(
        a[0].post(recalc, headers=signed("POST", recalc, a), json=update), 200
    )
    assert old_replay.json() == second.json()
    assert old_replay.headers["idempotency-replayed"] == "true"
    historical = path + "/revisions/1"
    assert (
        checked(a[0].get(historical, headers=signed("GET", historical, a)), 200).json()
        == first
    )
    checked(
        a[0].post(
            recalc,
            headers=signed("POST", recalc, a),
            json={**update, "client_request_id": str(uuid4())},
        ),
        409,
    )
    with monkeypatch.context() as unavailable:
        # Synthetic failure branch, NOT a claim of an actual PG outage. Auth,
        # signed ingress, middleware and mounted handler remain the real ones.
        def fail_read(self, owner, identity, revision=None):
            raise Unavailable

        unavailable.setattr(TowerPlanRepository, "get", fail_read)
        checked(a[0].get(path, headers=signed("GET", path, a)), 503)
    public = a[0].get("/api/shared-tower-plans/synthetic-unpublished-token")
    assert public.status_code == 404
    assert "Synthetic private note" not in public.text
    assert a[0].get(f"/api/pcs/{ctx.saved['id']}").json() == ctx.saved
    checked(
        b[0].request(
            "DELETE",
            path,
            headers=signed("DELETE", path, b),
            json={"expected_plan_revision": 3},
        ),
        404,
    )
    checked(
        a[0].request(
            "DELETE",
            path,
            headers=signed("DELETE", path, a),
            json={"expected_plan_revision": 3},
        ),
        204,
    )
    checked(a[0].get(path, headers=signed("GET", path, a)), 404)


def policy(method, raw_path, query=b""):
    return permitted_query(
        Request(
            {
                "type": "http",
                "method": method,
                "scheme": "http",
                "headers": [],
                "server": ("127.0.0.1", 8000),
                "client": ("127.0.0.1", 50000),
                "path": unquote(raw_path.decode("ascii")),
                "raw_path": raw_path,
                "query_string": query,
            }
        )
    )


def test_tower_plan_central_policy_is_closed_before_empty_query_shortcut():
    root = ROOT.encode()
    identity = b"12345678-1234-1234-1234-123456789abc"
    one = root + b"/" + identity
    for method, path in (
        ("GET", root),
        ("POST", root),
        ("GET", one),
        ("DELETE", one),
        ("GET", one + b"/revisions/1"),
        ("GET", one + b"/revisions/9999999999"),
        ("POST", one + b"/recalculate"),
    ):
        assert policy(method, path)
    assert policy("GET", root, b"page=10000&page_size=50")
    assert policy("GET", root, b"page_size=50&page=1")
    for method, path in (
        ("DELETE", root),
        ("PUT", one),
        ("POST", one),
        ("GET", one + b"/recalculate"),
        ("POST", one + b"/revisions/1"),
        ("GET", one + b"/revisions/0"),
        ("GET", one + b"/revisions/01"),
        ("GET", one + b"/revisions/10000000000"),
        ("GET", root + b"/" + identity.upper()),
        ("GET", root.replace(b"tower", b"%74ower") + b"/" + identity),
    ):
        assert not policy(method, path)
    for query in (
        b"page=10001",
        b"page_size=51",
        b"page=01",
        b"page=0",
        b"page=1&page=2",
        b"%70age=1",
        b"Page=1",
        b"page=",
        b"owner_id=x",
        b"page=" + b"9" * 5000,
    ):
        assert not policy("GET", root, query)
        assert not policy("POST", root, query)
        assert not policy("GET", one, query)
    # Existing route policy is neither broadened nor made tower-plan-specific.
    assert policy("GET", b"/api/pcs", b"page=1")
    assert not policy("POST", b"/api/pcs", b"page=1")
