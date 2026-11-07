"""Actual TEST main/session/PG; temporary mounts only, never production activation."""

import asyncio
import hashlib
import hmac
import os
from time import time
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from test_pcs_postgres import ORIGIN, create
from test_pcs_postgres import actors as actors
from test_torre_plan_pg import body

from upgradejusto.api.body_limits import BodyLimits
from upgradejusto.api.tower_share_boundary import (
    SHARE_HEADERS,
    ShareResponseInterrupted,
    TowerShareBoundary,
)
from upgradejusto.api.tower_shares import public_router, router
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.main import app
from upgradejusto.persistence.runtime import Unavailable
from upgradejusto.plans.tower_tables import headers
from upgradejusto.shares.tower_repository import TowerShareRepository
from upgradejusto.shares.tower_tables import budgets

KEY = "synthetic-share-mounted-key-not-a-deployed-secret"
NOTE = "synthetic-private-share-note@example.invalid"
PUBLISH = {
    "expected_plan_revision": 1,
    "title": "Plan de mejora de torre",
    "public_projection_confirmed": True,
}


def checked(response, status):
    if response.status_code != status:
        pytest.fail("Share HTTP status gate failed (details withheld)", pytrace=False)
    for key, value in SHARE_HEADERS:
        if response.headers.get(key.decode()) != value.decode():
            pytest.fail("Share HTTP header gate failed", pytrace=False)
    return response


def signed(method, path, actor):
    timestamp = str(int(time()))
    canonical = "\n".join((timestamp, method, path, actor[3]))
    signature = hmac.new(KEY.encode(), canonical.encode(), hashlib.sha256).hexdigest()
    return {
        **actor[1],
        "x-uj-client-ip": actor[3],
        "x-uj-proxy-timestamp": timestamp,
        "x-uj-proxy-signature": signature,
    }


@pytest.fixture
def share_context(actors, pg_engine, monkeypatch):
    if (
        os.environ.get("UJ_ENV") != "test"
        or not os.environ.get("DATABASE_URL")
        or os.environ.get("DATABASE_URL") != os.environ.get("TEST_DATABASE_URL")
    ):
        pytest.fail("Matched TEST environment required", pytrace=False)
    a, b = actors
    monkeypatch.setenv("UJ_PROXY_SECRET", KEY)
    monkeypatch.setenv("UJ_TRUSTED_PROXY_PEERS", f"{a[3]},{b[3]},127.0.0.1")
    saved = create(a, context={"bios_version": None, "notes": NOTE})
    version = PostgresCatalogRepository(pg_engine).dataset_version
    rate_ip = "127.253." + ".".join(str(v) for v in uuid4().bytes[:2])
    old_routes = list(app.router.routes)
    old_schema = app.openapi_schema
    try:
        app.include_router(router)
        app.include_router(public_router)
        app.openapi_schema = None
        yield SimpleNamespace(a=a, b=b, saved=saved, version=version, rate_ip=rate_ip)
    finally:
        app.router.routes[:] = old_routes
        app.openapi_schema = old_schema
        keys = [
            hashlib.sha256(("tower-share-read-1:" + ip).encode()).hexdigest()
            for ip in (a[3], b[3], rate_ip)
        ]
        with pg_engine.begin() as conn:
            conn.execute(headers.delete().where(headers.c.owner_id.in_([a[2], b[2]])))
            conn.execute(budgets.delete().where(budgets.c.key_digest.in_(keys)))


def test_mounted_share_owner_csrf_signed_frozen_revoke_budget_and_headers(
    share_context, monkeypatch
):
    ctx = share_context
    a, b = ctx.a, ctx.b
    root = "/api/tower-plans"
    payload = body(ctx)
    created_plan = a[0].post(root, headers=signed("POST", root, a), json=payload)
    if created_plan.status_code != 201:
        pytest.fail("Synthetic private plan setup failed", pytrace=False)
    plan = created_plan.json()
    plan_path = root + "/" + plan["id"]
    collection = plan_path + "/shares"
    checked(b[0].post(collection, headers=b[1], json=PUBLISH), 404)
    checked(a[0].post(collection, headers={"Origin": ORIGIN}, json=PUBLISH), 403)
    checked(a[0].post(collection, headers=a[1], json={}), 422)
    checked(a[0].post(collection, headers=a[1], content=b"x" * 262145), 413)
    with TestClient(app, base_url=ORIGIN, client=(a[3], 50111)) as anonymous:
        checked(anonymous.get(collection), 401)
    created = checked(
        a[0].post(collection, headers=signed("POST", collection, a), json=PUBLISH),
        201,
    ).json()
    listed = checked(
        a[0].get(collection, headers=signed("GET", collection, a)), 200
    ).json()
    assert listed["items"][0]["effective_state"] == "active"
    checked(b[0].get(collection), 404)
    public = "/api/shared-tower-plans/" + created["token"]
    frozen = checked(a[0].get(public, headers=signed("GET", public, a)), 200)
    frozen_bytes = frozen.content
    values = (NOTE, plan["id"], ctx.saved["id"], str(a[2]))
    if any(value.encode() in frozen_bytes for value in values):
        pytest.fail("Public privacy gate failed (details withheld)", pytrace=False)
    assert frozen.json()["status"] != "ready"
    checked(a[0].get(public + "?ignored=1", headers=signed("GET", public, a)), 403)
    checked(a[0].get(public, headers=signed("POST", public, a)), 403)
    checked(a[0].get(public, headers={"x-uj-client-ip": a[3]}), 403)
    forged = {**signed("GET", public, a), "x-uj-user-id": str(a[2])}
    checked(a[0].get(public, headers=forged), 403)
    alias = public.replace("/shared-tower-plans/", "/%73hared-tower-plans/")
    checked(a[0].get(alias, headers=signed("GET", alias, a)), 403)
    checked(a[0].get(collection + "?page=1"), 403)
    for method in ("HEAD", "OPTIONS", "POST"):
        checked(a[0].request(method, public), 405)
    checked(a[0].get("/api/shared-tower-plans/missing/extra"), 404)
    with monkeypatch.context() as unavailable:
        # Synthetic failure branch, NOT an actual PG outage or fake owner/service.
        def fail_lookup(self, digest):
            raise Unavailable

        unavailable.setattr(TowerShareRepository, "public", fail_lookup)
        checked(a[0].get(public), 503)
    recalc = plan_path + "/recalculate"
    update = {**payload, "client_request_id": str(uuid4()), "expected_plan_revision": 1}
    if a[0].post(recalc, headers=a[1], json=update).status_code != 200:
        pytest.fail("Synthetic recalculation failed", pytrace=False)
    if checked(a[0].get(public), 200).content != frozen_bytes:
        pytest.fail("Frozen public bytes changed after recalculation", pytrace=False)
    deleted_pc = a[0].delete(f"/api/pcs/{ctx.saved['id']}", headers=a[1])
    if deleted_pc.status_code != 204:
        pytest.fail("Synthetic PC deletion failed", pytrace=False)
    if checked(a[0].get(public), 200).content != frozen_bytes:
        pytest.fail("Frozen public bytes changed after PC deletion", pytrace=False)
    revoke = collection + "/" + created["id"]
    checked(
        a[0].request(
            "DELETE",
            revoke,
            headers=signed("DELETE", revoke, a),
            json={"expected_plan_revision": 1},
        ),
        204,
    )
    revoked = checked(a[0].get(public), 404)
    invalid = checked(a[0].get("/api/shared-tower-plans/short"), 404)
    assert revoked.content == invalid.content
    assert (
        checked(a[0].get(collection), 200).json()["items"][0]["effective_state"]
        == "revoked"
    )
    with TestClient(app, base_url=ORIGIN, client=(ctx.rate_ip, 50112)) as limited:
        for _ in range(60):
            checked(limited.get("/api/shared-tower-plans/short"), 404)
        throttled = checked(limited.get(public), 429)
        assert 1 <= int(throttled.headers["retry-after"]) <= 60


def test_share_boundary_pre_router_timeout_statuses_and_stream_passthrough():
    assert app.user_middleware[0].cls is TowerShareBoundary
    assert app.user_middleware[1].cls is BodyLimits

    async def run():
        path = "/api/shared-tower-plans/synthetic"
        for status in (403, 404, 405, 408, 413, 422, 429, 503):
            sent = []
            chunks = [
                {"type": "http.response.body", "body": b"first", "more_body": True},
                {"type": "http.response.body", "body": b"last", "more_body": False},
            ]

            async def downstream(scope, receive, send):
                await send(
                    {"type": "http.response.start", "status": status, "headers": []}
                )
                for chunk in chunks:
                    await send(chunk)

            async def receive():
                return {"type": "http.request", "body": b"", "more_body": False}

            async def send(message):
                sent.append(message)

            await TowerShareBoundary(downstream)(
                {"type": "http", "path": path}, receive, send
            )
            assert set(SHARE_HEADERS) <= set(sent[0]["headers"])
            assert sent[1] is chunks[0] and sent[2] is chunks[1]

        sent = []

        async def slow_receive():
            await asyncio.sleep(0.05)
            return {"type": "http.request", "body": b"", "more_body": False}

        await TowerShareBoundary(BodyLimits(downstream, timeout_seconds=0.001))(
            {"type": "http", "path": path, "headers": []}, slow_receive, send
        )
        assert sent[0]["status"] == 408
        assert set(SHARE_HEADERS) <= set(sent[0]["headers"])

    asyncio.run(run())


def test_share_boundary_closed_prefixes_do_not_change_other_cus():
    async def run():
        identity = "12345678-1234-1234-1234-123456789abc"
        for path, expected in (
            ("/api/shared-tower-plans", True),
            ("/api/shared-tower-plans/invalid/extra", True),
            (f"/api/tower-plans/{identity}/shares", True),
            (f"/api/tower-plans/{identity}/shares/invalid", True),
            ("/api/shared-tower-plans-other/value", False),
            (f"/api/tower-plans/{identity}/shares-other", False),
            (f"/api/tower-plans/{identity}", False),
            ("/api/conversations/example/messages", False),
            ("/api/catalog", False),
        ):
            sent = []
            start = {
                "type": "http.response.start",
                "status": 404,
                "headers": [(b"cache-control", b"public"), (b"x-existing", b"keep")],
            }

            async def downstream(scope, receive, send):
                await send(start)
                await send({"type": "http.response.body", "body": b"unchanged"})

            async def receive():
                return {"type": "http.request", "body": b"", "more_body": False}

            async def send(message):
                sent.append(message)

            await TowerShareBoundary(downstream)(
                {"type": "http", "path": path}, receive, send
            )
            if expected:
                assert set(SHARE_HEADERS) <= set(sent[0]["headers"])
                assert (b"x-existing", b"keep") in sent[0]["headers"]
            else:
                assert sent[0] is start

    asyncio.run(run())


def test_share_boundary_unexpected_dependency500_headers_and_nonshare_control():
    # Complete FastAPI/Starlette stack, including the exterior ServerErrorMiddleware.
    # Synthetic dependency failure only, NOT a PG outage/auth or public mounting gate.
    test_app = FastAPI()
    marker = "synthetic-private-unexpected-error@example.invalid"
    token = "synthetic-capability-never-rendered"

    def unexpected_dependency():
        raise RuntimeError(marker + ":" + token)

    @test_app.get("/api/shared-tower-plans/{token}")
    @test_app.get("/api/tower-plans/{plan_id}/shares")
    @test_app.get("/api/nonshare-unexpected")
    def failed_route(dependency=Depends(unexpected_dependency)):
        return {"unexpected": "unreachable"}

    test_app.add_middleware(BodyLimits)
    test_app.add_middleware(TowerShareBoundary)
    with TestClient(test_app, raise_server_exceptions=False) as client:
        for path in (
            "/api/shared-tower-plans/" + token,
            "/api/tower-plans/12345678-1234-1234-1234-123456789abc/shares",
        ):
            response = checked(client.get(path), 500)
            if response.content != b'{"detail":"Internal server error"}':
                pytest.fail("Share unexpected500 body gate failed", pytrace=False)
            if (
                marker in response.text
                or token in response.text
                or path in response.text
            ):
                pytest.fail("Share unexpected500 privacy gate failed", pytrace=False)
        control = client.get("/api/nonshare-unexpected")
        assert control.status_code == 500
        assert "x-robots-tag" not in control.headers
        assert "referrer-policy" not in control.headers
        assert control.content == b"Internal Server Error"


def test_share_boundary_started_errors_and_cancellation_propagate():
    async def run():
        sent = []

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            sent.append(message)

        chunk = {
            "type": "http.response.body",
            "body": b"data: first\n\n",
            "more_body": True,
        }

        async def started_stream(scope, receive, send):
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send(chunk)
            raise RuntimeError("synthetic-after-start")

        scope = {"type": "http", "path": "/api/shared-tower-plans/synthetic"}
        with pytest.raises(
            ShareResponseInterrupted, match="^Public share response interrupted$"
        ) as escaped:
            await TowerShareBoundary(started_stream)(scope, receive, send)
        assert escaped.value.__cause__ is None
        assert escaped.value.__context__ is None
        assert len(sent) == 2
        assert sent[0]["status"] == 200
        assert sent[1] is chunk
        assert set(SHARE_HEADERS) <= set(sent[0]["headers"])
        sent.clear()

        async def cancelled(scope, receive, send):
            raise asyncio.CancelledError

        with pytest.raises(asyncio.CancelledError):
            await TowerShareBoundary(cancelled)(scope, receive, send)
        assert sent == []

    asyncio.run(run())


def test_share_boundary_post_start_error_is_closed_without_exception_chain():
    async def run():
        marker = "synthetic-private-post-start-note@example.invalid"
        token = "synthetic-capability-never-propagated"
        paths = (
            "/api/shared-tower-plans/" + token,
            "/api/tower-plans/12345678-1234-1234-1234-123456789abc/shares",
        )

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        for path in paths:
            attempts = []

            async def failing_send(message):
                attempts.append(message)
                raise RuntimeError(marker + ":" + token)

            async def downstream(scope, receive, send):
                await send(
                    {"type": "http.response.start", "status": 200, "headers": []}
                )

            with pytest.raises(ShareResponseInterrupted) as escaped:
                await TowerShareBoundary(downstream)(
                    {"type": "http", "path": path}, receive, failing_send
                )
            error = escaped.value
            assert type(error) is ShareResponseInterrupted
            assert str(error) == "Public share response interrupted"
            assert error.args == ("Public share response interrupted",)
            assert error.__cause__ is None
            assert error.__context__ is None
            assert marker not in repr(error) and token not in repr(error)
            assert len(attempts) == 1
            assert attempts[0]["status"] == 200
            assert set(SHARE_HEADERS) <= set(attempts[0]["headers"])

        original = RuntimeError(marker)
        sent = []

        async def unchanged_nonshare(scope, receive, send):
            raise original

        async def send(message):
            sent.append(message)

        with pytest.raises(RuntimeError) as escaped:
            await TowerShareBoundary(unchanged_nonshare)(
                {"type": "http", "path": "/api/conversations/synthetic/messages"},
                receive,
                send,
            )
        assert escaped.value is original
        assert sent == []

    asyncio.run(run())
