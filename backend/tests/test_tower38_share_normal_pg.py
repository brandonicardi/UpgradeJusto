"""Normal main + real TEST PG/session/HMAC; no injected mounts or auth overrides."""

import ast
import hashlib
import inspect
import logging
import os
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from test_pcs_postgres import ORIGIN, create
from test_pcs_postgres import actors as actors
from test_tower38_plan_pg import body
from test_tower38_share_mounted import KEY, PUBLISH, signed

from upgradejusto import main as main_module
from upgradejusto.api.tower_share_boundary import SHARE_HEADERS
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.main import app
from upgradejusto.plans.tower_tables import headers
from upgradejusto.shares.tower_tables import budgets


def require(condition, phase):
    if not condition:
        pytest.fail("NORMAL_CU09 " + phase, pytrace=False)


def checked(response, status, phase):
    require(response.status_code == status, phase)
    require(
        all(
            response.headers.get(key.decode()) == value.decode()
            for key, value in SHARE_HEADERS
        ),
        "privacy_headers",
    )
    return response


@pytest.fixture
def normal_share_context(actors, pg_engine, monkeypatch, request, caplog):
    require(not request.config.getoption("showlocals", default=False), "no_locals")
    require(os.environ.get("UJ_ENV") == "test", "test_environment")
    caplog.set_level(logging.WARNING, logger="httpx")
    a, b = actors
    monkeypatch.setenv("UJ_PROXY_SECRET", KEY)
    monkeypatch.setenv("UJ_TRUSTED_PROXY_PEERS", f"{a[3]},{b[3]},127.0.0.1")
    try:
        saved = create(a, context={"bios_version": None, "notes": "SYNTHETIC PRIVATE"})
        yield SimpleNamespace(
            a=a,
            b=b,
            saved=saved,
            version=PostgresCatalogRepository(pg_engine).dataset_version,
        )
    finally:
        # Only this test's synthetic actors; plans/shares cascade, no global reset.
        keys = [
            hashlib.sha256(("tower-share-read-1:" + actor[3]).encode()).hexdigest()
            for actor in (a, b)
        ]
        try:
            with pg_engine.begin() as conn:
                conn.execute(
                    headers.delete().where(headers.c.owner_id.in_([a[2], b[2]]))
                )
                conn.execute(budgets.delete().where(budgets.c.key_digest.in_(keys)))
        finally:
            caplog.clear()


def normal_share_scenario(ctx):
    a, b = ctx.a, ctx.b
    collection_template = "/api/tower-plans/{plan_id}/shares"
    expected = [
        ("POST", collection_template),
        ("GET", collection_template),
        ("DELETE", collection_template + "/{share_id}"),
        ("GET", "/api/shared-tower-plans/{token}"),
    ]
    mounted = []
    methods = {"get", "post", "put", "patch", "delete", "head", "options", "trace"}
    for path, operations in app.openapi()["paths"].items():
        if path.startswith("/api/shared-tower-plans") or (
            path.startswith("/api/tower-plans/") and "/shares" in path
        ):
            mounted.extend(
                (method.upper(), path) for method in operations if method in methods
            )
    # OpenAPI proves the public inventory, not duplicate-registration absence.
    require(sorted(mounted) == sorted(expected), "normal_routes_once_no_probes")
    source = ast.parse(inspect.getsource(main_module))
    imports = [node for node in ast.walk(source) if isinstance(node, ast.ImportFrom)]
    share_imports = [
        alias
        for node in imports
        if node.module == "upgradejusto.api.tower_shares"
        for alias in node.names
    ]
    require(
        sorted(alias.name for alias in share_imports) == ["public_router", "router"],
        "normal_share_imports",
    )
    aliases = {alias.asname or alias.name for alias in share_imports}
    calls = [
        node
        for node in ast.walk(source)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "app"
        and node.func.attr == "include_router"
        and node.args
        and isinstance(node.args[0], ast.Name)
        and node.args[0].id in aliases
    ]
    top_calls = [node.value for node in source.body if isinstance(node, ast.Expr)]
    require(
        len(calls) == 2
        and {node.args[0].id for node in calls} == aliases
        and all(node in top_calls for node in calls),
        "normal_share_mounts_once_unconditional",
    )
    modules = [node.module or "" for node in imports]
    modules.extend(
        alias.name
        for node in ast.walk(source)
        if isinstance(node, ast.Import)
        for alias in node.names
    )
    require(
        not any(
            part.startswith("test") or "probe" in part
            for module in modules
            for part in module.lower().split(".")
        ),
        "no_test_or_probe_imports",
    )
    require(not app.dependency_overrides, "no_dependency_overrides")
    root = "/api/tower-plans"
    payload = body(ctx)
    response = a[0].post(root, headers=signed("POST", root, a), json=payload)
    require(response.status_code == 201, "create_plan")
    plan = response.json()
    collection = root + "/" + plan["id"] + "/shares"
    pc_path = "/api/pcs/" + ctx.saved["id"]
    before_pc = a[0].get(pc_path)
    require(before_pc.status_code == 200, "read_pc_before")
    before_list = a[0].get("/api/pcs")
    require(before_list.status_code == 200, "list_pc_before")
    checked(
        b[0].post(collection, headers=signed("POST", collection, b), json=PUBLISH),
        404,
        "foreign_publish",
    )
    created = checked(
        a[0].post(collection, headers=signed("POST", collection, a), json=PUBLISH),
        201,
        "publish",
    ).json()
    checked(
        b[0].get(collection, headers=signed("GET", collection, b)), 404, "foreign_list"
    )
    public = "/api/shared-tower-plans/" + created["token"]
    with TestClient(app, base_url=ORIGIN, client=(a[3], 50191)) as anonymous:
        require(not anonymous.cookies, "anonymous_no_cookie")
        frozen = checked(
            anonymous.get(public, headers=signed("GET", public, a)),
            200,
            "anonymous_read",
        )
        require(not anonymous.cookies, "anonymous_still_no_cookie")
        require(
            not any(
                value.encode() in frozen.content
                for value in (
                    ctx.saved["id"],
                    plan["id"],
                    str(a[2]),
                    "SYNTHETIC PRIVATE",
                )
            ),
            "public_projection_private_fields",
        )
        recalc = root + "/" + plan["id"] + "/recalculate"
        changed = a[0].post(
            recalc,
            headers=signed("POST", recalc, a),
            json={
                **payload,
                "client_request_id": str(uuid4()),
                "expected_plan_revision": 1,
            },
        )
        require(changed.status_code == 200, "recalculate_own_plan")
        reread = checked(
            anonymous.get(public, headers=signed("GET", public, a)),
            200,
            "frozen_reread",
        )
        require(reread.content == frozen.content, "frozen_bytes")
        revoke = collection + "/" + created["id"]
        checked(
            b[0].request(
                "DELETE",
                revoke,
                headers=signed("DELETE", revoke, b),
                json={"expected_plan_revision": 1},
            ),
            404,
            "foreign_revoke",
        )
        checked(
            a[0].request(
                "DELETE",
                revoke,
                headers=signed("DELETE", revoke, a),
                json={"expected_plan_revision": 1},
            ),
            204,
            "revoke",
        )
        revoked = checked(
            anonymous.get(public, headers=signed("GET", public, a)), 404, "revoked_read"
        )
        missing = "/api/shared-tower-plans/short"
        invalid = checked(
            anonymous.get(missing, headers=signed("GET", missing, a)),
            404,
            "invalid_read",
        )
        require(revoked.content == invalid.content, "uniform_not_found")
    after_pc, after_list = a[0].get(pc_path), a[0].get("/api/pcs")
    require(after_pc.status_code == after_list.status_code == 200, "read_pc_after")
    require(after_pc.json() == before_pc.json(), "pc_unchanged")
    require(after_list.json() == before_list.json(), "pc_inventory_unchanged")


def test_normal_main_share_publish_frozen_owner_revoke_without_pc_writes(
    normal_share_context,
):
    try:
        normal_share_scenario(normal_share_context)
    except Exception:
        pytest.fail("NORMAL_CU09 unexpected_application_failure", pytrace=False)
