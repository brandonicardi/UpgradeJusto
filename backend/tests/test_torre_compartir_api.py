"""Ingress PREPARATION gates. No fake owner/HMAC; no activation/logging claim."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.requests import Request

from upgradejusto.api.proxy_ip import permitted_tower_plan_request
from upgradejusto.api.tower_shares import router
from upgradejusto.main import app as production


def test_central_policy_rejects_noncanonical_private_share_ingress():
    app = FastAPI()
    app.exception_handlers.update(production.exception_handlers)
    app.include_router(router)
    path = "/api/tower-plans/00000000-0000-4000-8000-000000789ABC/shares"
    with TestClient(
        app, base_url="http://127.0.0.1", client=("127.0.0.1", 55001)
    ) as client:
        response = client.get(path)
    assert response.status_code == 403
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert str(path) not in response.text


def test_canonical_private_share_ingress_is_allowed_not_authorized():
    # Pure ingress only: acceptance here grants neither a session nor ownership.
    path = "/api/tower-plans/00000000-0000-4000-8000-000000789abc/shares"
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": path,
            "raw_path": path.encode("ascii"),
            "query_string": b"",
            "headers": [],
        }
    )
    assert permitted_tower_plan_request(request) is True


def test_public_and_private_capability_routes_are_not_mounted_in_main():
    paths = {getattr(route, "path", "") for route in production.routes}
    assert "/api/shared-tower-plans/{token}" not in paths
    assert "/api/tower-plans/{plan_id}/shares" not in paths
