"""CU03 sobre PG real con A/B; limpieza exclusivamente de fixtures propios."""

import hashlib
import hmac
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from upgradejusto.api.pcs import service
from upgradejusto.auth.security import digest
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.main import app
from upgradejusto.pcs.models import PCUpdate
from upgradejusto.pcs.repository import PCRepository
from upgradejusto.pcs.service import PCService
from upgradejusto.persistence.schema import attempts, pcs, sessions, users

ORIGIN = "http://127.0.0.1:3000"
BASE = "/api/pcs"
PASSWORD = "synthetic-pc-test-password"


def payload(**changes):
    return {
        "name": " PC manual ",
        "components": [],
        "context": {"bios_version": " Declarada-0123 ", "notes": None},
        **changes,
    }


@pytest.fixture
def actors(pg_engine, monkeypatch):
    monkeypatch.setenv("UJ_ORIGIN", ORIGIN)
    monkeypatch.setenv("UJ_ENV", "test")
    monkeypatch.setenv("UJ_ALLOW_INSECURE_LOOPBACK", "1")
    accounts, tokens = [], []
    try:
        with ExitStack() as stack:
            for _ in range(2):
                email = f"pc-{uuid.uuid4().hex}@example.test"
                ip = "127." + ".".join(str(v) for v in uuid.uuid4().bytes[:3])
                accounts.append((email, ip))
                client = stack.enter_context(
                    TestClient(app, base_url=ORIGIN, client=(ip, 50000))
                )
                csrf = client.get("/api/auth/csrf")
                tokens.append(client.cookies.get("uj_session"))
                assert csrf.status_code == 200
                headers = {"Origin": ORIGIN, "X-CSRF-Token": csrf.json()["csrf_token"]}
                data = {"email": email, "password": PASSWORD}
                registered = client.post(
                    "/api/auth/register", json=data, headers=headers
                )
                assert registered.status_code == 201
                logged = client.post("/api/auth/login", json=data, headers=headers)
                tokens.append(client.cookies.get("uj_session"))
                assert logged.status_code == 200
                csrf = client.get("/api/auth/csrf")
                headers["X-CSRF-Token"] = csrf.json()["csrf_token"]
                if len(accounts) == 1:
                    first = (client, headers, uuid.UUID(logged.json()["id"]), ip)
                else:
                    second = (client, headers, uuid.UUID(logged.json()["id"]), ip)
            yield first, second
    finally:
        with pg_engine.begin() as conn:
            ids = list(
                conn.scalars(
                    sa.select(users.c.id).where(
                        users.c.email.in_([e for e, _ in accounts])
                    )
                )
            )
            conn.execute(pcs.delete().where(pcs.c.owner_id.in_(ids)))
            conn.execute(
                sessions.delete().where(
                    sa.or_(
                        sessions.c.user_id.in_(ids),
                        sessions.c.digest.in_([digest(t) for t in tokens if t]),
                    )
                )
            )
            conn.execute(users.delete().where(users.c.id.in_(ids)))
            keys = [digest("email:" + e) for e, _ in accounts] + [
                digest("ip:" + ip) for _, ip in accounts
            ]
            conn.execute(attempts.delete().where(attempts.c.key.in_(keys)))


def create(actor, **changes):
    client, headers, _, _ = actor
    response = client.post(BASE, json=payload(**changes), headers=headers)
    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    return response.json()


def test_crud_replacement_and_unknown_context(actors):
    a, _ = actors
    client, headers, _, _ = a
    pc = create(
        a, components=[{"category": "ram", "component_id": "P04", "quantity": 2}]
    )
    assert set(pc) == {"id", "name", "revision", "components", "context"}
    assert pc["name"] == "PC manual" and pc["revision"] == 1
    assert pc["context"] == {"bios_version": "Declarada-0123", "notes": None}
    path = f"{BASE}/{pc['id']}"
    assert client.get(path).json() == pc
    listed = client.get(BASE, params={"page_size": 1}).json()
    assert listed == {"items": [pc], "total": 1, "page": 1, "page_size": 1}
    assert client.get(BASE, params={"page": 10000}).json()["items"] == []
    changed = client.put(
        path,
        headers=headers,
        json=payload(
            revision=1,
            components=[{"category": "cpu", "component_id": "P01", "quantity": 1}],
            context={"bios_version": None, "notes": " Nota declarada "},
        ),
    )
    assert changed.status_code == 200
    updated = changed.json()
    assert updated["revision"] == 2
    assert updated["components"] == [
        {"category": "cpu", "component_id": "P01", "quantity": 1}
    ]
    assert updated["context"] == {"bios_version": None, "notes": "Nota declarada"}
    assert client.get(path).json() == updated
    assert client.delete(path, headers=headers).status_code == 204
    assert client.get(path).status_code == 404
    assert client.get(BASE).json()["total"] == 0


def test_cross_owner_not_found_and_injection(actors):
    a, b = actors
    own = create(a)
    foreign = create(b)
    client, headers, _, _ = a
    path = f"{BASE}/{foreign['id']}"
    assert client.get(BASE).json()["items"] == [own]
    assert client.get(path).status_code == 404
    response = client.put(path, headers=headers, json=payload(revision=999))
    assert response.status_code == 404 and response.json() == {"detail": "PC not found"}
    assert client.delete(path, headers=headers).status_code == 404
    for key in ["owner_id", "user_id", "role"]:
        assert (
            client.post(
                BASE, headers=headers, json=payload(**{key: str(b[2])})
            ).status_code
            == 422
        )
        assert (
            client.put(
                path, headers=headers, json=payload(revision=1, **{key: str(b[2])})
            ).status_code
            == 422
        )
    assert b[0].get(path).json() == foreign


@pytest.mark.parametrize("quantity", [0, True, 1.0, 9, -1, "2"])
def test_strict_quantities(actors, quantity):
    a, _ = actors
    response = a[0].post(
        BASE,
        headers=a[1],
        json=payload(
            components=[
                {"category": "ram", "component_id": "P04", "quantity": quantity},
            ]
        ),
    )
    assert response.status_code == 422
    assert a[0].get(BASE).json()["total"] == 0


@pytest.mark.parametrize(
    "changes",
    [
        {"context": {"bios_version": None}},
        {"context": None},
        {"context": {"bios_version": 123, "notes": None}},
        {"context": {"bios_version": "", "notes": None}},
        {"context": {"bios_version": None, "notes": "\0"}},
        {"context": {"bios_version": None, "notes": None, "role": "admin"}},
        {"name": " "},
        {"components": [{"category": "cpu", "component_id": "P01", "quantity": 2}]},
        {"components": [{"category": "cpu", "component_id": "P99", "quantity": 1}]},
        {"components": [{"category": "gpu", "component_id": "P01", "quantity": 1}]},
        {"components": [{"category": "ram", "component_id": "P04"}]},
        {"components": [{"category": "ram", "component_id": "P04", "quantity": 1}] * 2},
    ],
)
def test_invalid_update_keeps_entire_previous_pc(actors, changes):
    a, _ = actors
    pc = create(a)
    path = f"{BASE}/{pc['id']}"
    response = a[0].put(path, headers=a[1], json=payload(revision=1, **changes))
    assert response.status_code == 422
    assert a[0].get(path).json() == pc


def test_revision_concurrency_and_transaction_rollback(actors, pg_engine):
    a, _ = actors
    pc = create(a)
    path = f"{BASE}/{pc['id']}"
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(
                lambda n: a[0].put(
                    path, headers=a[1], json=payload(revision=1, name=f"Update {n}")
                ),
                range(2),
            )
        )
    assert sorted(r.status_code for r in results) == [200, 409]
    updated = a[0].get(path).json()
    assert updated["revision"] == 2
    invalid = PCUpdate.model_validate(
        payload(
            revision=2,
            name="Must rollback",
            components=[
                {
                    "category": "ram",
                    "component_id": "missing-fixture-component",
                    "quantity": 2,
                },
            ],
        )
    )
    with pytest.raises(IntegrityError):
        # Reach the genuine missing-component FK, not the earlier stale-catalog
        # guard when TEST already has a newer active imported publication.
        PCRepository(
            pg_engine, PostgresCatalogRepository(pg_engine).dataset_version
        ).update(a[2], uuid.UUID(pc["id"]), invalid)
    assert a[0].get(path).json() == updated


def test_auth_csrf_uuid_paging_and_pg_failure(actors, pg_engine):
    a, _ = actors
    pc = create(a)
    path = f"{BASE}/{pc['id']}"
    with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50001)) as anonymous:
        for method, target, body in [
            ("GET", BASE, None),
            ("POST", BASE, payload()),
            ("PUT", path, payload(revision=1)),
            ("DELETE", path, None),
        ]:
            assert anonymous.request(method, target, json=body).status_code == 401
    for method, target, body in [
        ("POST", BASE, payload()),
        ("PUT", path, payload(revision=1)),
        ("DELETE", path, None),
    ]:
        assert a[0].request(method, target, json=body).status_code == 403
        assert (
            a[0]
            .request(method, target, json=body, headers={**a[1], "Origin": "null"})
            .status_code
            == 403
        )
    assert a[0].get(BASE + "/not-a-uuid").status_code == 422
    assert a[0].get(BASE, params={"page": 0}).status_code == 422
    assert a[0].get(BASE, params={"page_size": 51}).status_code == 422
    missing = pg_engine.execution_options(
        schema_translate_map={None: "missing_pc_" + uuid.uuid4().hex}
    )
    app.dependency_overrides[service] = lambda: PCService(PCRepository(missing), None)
    try:
        response = a[0].get(path)
        assert response.status_code == 503
        assert response.json() == {"detail": "Service unavailable"}
        assert response.headers["cache-control"] == "no-store"
    finally:
        app.dependency_overrides.pop(service, None)


def test_pc_signed_gateway_list_query_and_method_binding(actors, monkeypatch):
    a, _ = actors
    pc = create(a)
    secret = b"synthetic-pc-gateway-secret-only-32bytes"
    monkeypatch.setenv("UJ_PROXY_SECRET", secret.decode())
    monkeypatch.setenv("UJ_TRUSTED_PROXY_PEERS", a[3])
    stamp, ip = str(int(time.time())), "198.51.100.20"

    def signed(method, path):
        canonical = "\n".join((stamp, method, path, ip))
        return {
            **a[1],
            "X-UJ-Client-IP": ip,
            "X-UJ-Proxy-Timestamp": stamp,
            "X-UJ-Proxy-Signature": hmac.new(
                secret, canonical.encode(), hashlib.sha256
            ).hexdigest(),
        }

    response = a[0].get(BASE + "?page=1&page_size=20", headers=signed("GET", BASE))
    assert response.status_code == 200 and response.json()["items"] == [pc]
    assert (
        a[0].get(BASE + "?owner_id=other", headers=signed("GET", BASE)).status_code
        == 403
    )
    path = f"{BASE}/{pc['id']}"
    assert a[0].get(path + "?page=1", headers=signed("GET", path)).status_code == 403
    assert (
        a[0]
        .put(path, json=payload(revision=1), headers=signed("GET", path))
        .status_code
        == 403
    )
    assert (
        a[0]
        .put(path, json=payload(revision=1), headers=signed("PUT", path))
        .status_code
        == 200
    )
    assert a[0].delete(path, headers=signed("DELETE", path)).status_code == 204


def test_list_query_empty_unknown_duplicates_and_ranges_direct_and_signed(
    actors, monkeypatch
):
    a, _ = actors
    pc = create(a)
    secret = b"synthetic-pc-query-secret-only-32bytes"
    monkeypatch.setenv("UJ_PROXY_SECRET", secret.decode())
    monkeypatch.setenv("UJ_TRUSTED_PROXY_PEERS", a[3])
    stamp, ip = str(int(time.time())), "198.51.100.21"
    canonical = "\n".join((stamp, "GET", BASE, ip))
    signed = {
        "X-UJ-Client-IP": ip,
        "X-UJ-Proxy-Timestamp": stamp,
        "X-UJ-Proxy-Signature": hmac.new(
            secret, canonical.encode(), hashlib.sha256
        ).hexdigest(),
    }
    cases = [
        ("owner_id=", 403),
        ("unknown=", 403),
        ("owner%5Fid=", 403),
        ("=", 403),
        ("owner_id", 403),
        ("page=1&page=", 403),
        ("page=&page=1", 403),
        ("page=&page=", 403),
        ("page_size=20&page_size=", 403),
        ("page=1&owner_id=", 403),
        ("page=", 422),
        ("page_size=", 422),
        ("page=0", 422),
        ("page=10001", 422),
        ("page_size=0", 422),
        ("page_size=51", 422),
        ("page=1&page_size=1", 200),
        ("page=10000&page_size=50", 200),
    ]
    # Misma política antes del retorno directo y antes de adoptar IP firmada.
    for headers in [{}, signed]:
        for query, expected in cases:
            response = a[0].get(BASE + "?" + query, headers=headers)
            assert response.status_code == expected, (query, expected)
            assert response.headers["cache-control"] == "no-store"
            if expected == 403:
                assert response.json() == {"detail": "Forbidden"}
            if expected == 200:
                assert response.json()["total"] == 1
    assert a[0].get(f"{BASE}/{pc['id']}").json() == pc
