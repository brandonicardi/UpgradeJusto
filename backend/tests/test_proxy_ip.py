"""Firma sintética controlada: no sustituye gateway/socket ni browser reales."""

import hashlib
import hmac

import pytest
from starlette.requests import Request

from upgradejusto.api.proxy_ip import client_ip, normalized_ip
from upgradejusto.auth.service import AuthError

SYNTHETIC_SECRET = "synthetic-test-only-" * 3
STAMP = "1792843200"
PATH = "/api/auth/login"
IP = "198.51.100.42"


def signed_headers(ip=IP, method="POST", path=PATH, stamp=STAMP):
    canonical = "\n".join((stamp, method, path, normalized_ip(ip)))
    signature = hmac.new(
        SYNTHETIC_SECRET.encode(), canonical.encode(), hashlib.sha256
    ).hexdigest()
    return {
        "x-uj-client-ip": normalized_ip(ip),
        "x-uj-proxy-timestamp": stamp,
        "x-uj-proxy-signature": signature,
    }


def request(headers, peer="127.0.0.1", method="POST", path=PATH, query=b""):
    return Request(
        {
            "type": "http",
            "method": method,
            "path": path,
            "raw_path": path.encode(),
            "query_string": query,
            "headers": [(k.encode(), v.encode()) for k, v in headers.items()],
            "client": (peer, 50000),
            "server": ("127.0.0.1", 8000),
            "scheme": "http",
        }
    )


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setenv("UJ_PROXY_SECRET", SYNTHETIC_SECRET)
    monkeypatch.setenv("UJ_TRUSTED_PROXY_PEERS", "127.0.0.1,::1")
    monkeypatch.setattr("upgradejusto.api.proxy_ip.time.time", lambda: int(STAMP))


@pytest.mark.parametrize("delta", [-30, 0, 30])
def test_valid_signature_and_mapped_transport(configured, delta):
    assert client_ip(request(signed_headers(stamp=str(int(STAMP) + delta)))) == IP
    assert client_ip(request(signed_headers(), peer="::ffff:127.0.0.1")) == IP
    assert normalized_ip("::ffff:198.51.100.42") == IP


def test_direct_ignores_xff_and_forwarded():
    assert (
        client_ip(request({"x-forwarded-for": IP, "forwarded": "for=" + IP}))
        == "127.0.0.1"
    )


@pytest.mark.parametrize(
    "change",
    [
        {"x-uj-proxy-signature": "0" * 64},
        {"x-uj-proxy-signature": "A" * 64},
        {"x-uj-client-ip": "198.51.100.43"},
        {"x-uj-client-ip": "::ffff:198.51.100.42"},
        {"x-uj-client-ip": "198.51.100.42:8000"},
        {"x-uj-proxy-timestamp": "+1792843200"},
        {"x-uj-socket-ip": IP},
    ],
)
def test_forged_or_noncanonical_headers(configured, change):
    with pytest.raises(AuthError) as error:
        client_ip(request({**signed_headers(), **change}))
    assert (error.value.status, error.value.detail) == (403, "Forbidden")


@pytest.mark.parametrize(
    "kwargs",
    [
        {"peer": "127.0.0.2"},
        {"method": "GET"},
        {"path": "/api/auth/register"},
        {"query": b"unexpected=1"},
    ],
)
def test_peer_method_path_and_query_bound(configured, kwargs):
    with pytest.raises(AuthError):
        client_ip(request(signed_headers(), **kwargs))


@pytest.mark.parametrize("delta", [-31, 31])
def test_expired_or_future_timestamp(configured, delta):
    with pytest.raises(AuthError):
        client_ip(request(signed_headers(stamp=str(int(STAMP) + delta))))


@pytest.mark.parametrize(
    "name,value",
    [
        ("UJ_PROXY_SECRET", ""),
        ("UJ_PROXY_SECRET", "short"),
        ("UJ_TRUSTED_PROXY_PEERS", ""),
        ("UJ_TRUSTED_PROXY_PEERS", "198.51.100.1"),
        ("UJ_TRUSTED_PROXY_PEERS", "localhost"),
    ],
)
def test_missing_or_invalid_configuration(configured, monkeypatch, name, value):
    monkeypatch.setenv(name, value)
    with pytest.raises(AuthError):
        client_ip(request(signed_headers()))


def test_partial_and_duplicate_headers(configured):
    with pytest.raises(AuthError):
        client_ip(request({"x-uj-client-ip": IP}))
    duplicate = request(signed_headers())
    duplicate.scope["headers"].append((b"x-uj-client-ip", IP.encode()))
    with pytest.raises(AuthError):
        client_ip(duplicate)


ADMIN_DRAFT = "/api/admin/revisions/revision-" + "a" * 32
ADMIN_LISTS = (
    ["/api/admin/revisions"]
    + [
        f"{ADMIN_DRAFT}/{collection}"
        for collection in ("components", "prices", "sources", "cpu_support")
    ]
    + ["/api/admin/revisions/sprint31b-a-v1/components"]
)


@pytest.mark.parametrize("path", ADMIN_LISTS)
@pytest.mark.parametrize("signed", [False, True])
def test_admin_pagination_direct_and_signed(configured, path, signed):
    headers = signed_headers(method="GET", path=path) if signed else {}
    assert client_ip(
        request(headers, method="GET", path=path, query=b"limit=25&offset=0")
    ) == (IP if signed else "127.0.0.1")


@pytest.mark.parametrize(
    "query",
    [
        b"unknown=1",
        b"page=1",
        b"limit=1&limit=2",
        b"offset=0&offset=1",
        b"limit=",
        b"offset=",
        b"limit",
        b"limit=1&",
        b"%6cimit=1",
        b"limit=%31",
        b"limit=+1",
        b"limit=-1",
        b"limit=1%26offset=0",
        b"limit=1;offset=0",
    ],
)
@pytest.mark.parametrize("signed", [False, True])
def test_admin_noncanonical_queries_rejected(configured, query, signed):
    path = "/api/admin/revisions"
    headers = signed_headers(method="GET", path=path) if signed else {}
    with pytest.raises(AuthError) as error:
        client_ip(request(headers, method="GET", path=path, query=query))
    assert error.value.status == 403


@pytest.mark.parametrize(
    "path,method",
    [
        ("/api/admin/revisions", "POST"),
        (f"{ADMIN_DRAFT}/components", "POST"),
        (f"{ADMIN_DRAFT}/components/row-id", "PATCH"),
        (f"{ADMIN_DRAFT}/components/row-id", "DELETE"),
        (f"{ADMIN_DRAFT}/publish", "POST"),
        (f"{ADMIN_DRAFT}/unknown", "GET"),
        ("/api/admin/revisions/not-a-revision/components", "GET"),
        (f"{ADMIN_DRAFT}/%63omponents", "GET"),
        (f"{ADMIN_DRAFT}/../components", "GET"),
        (f"{ADMIN_DRAFT}/%2e%2e/components", "GET"),
        (f"{ADMIN_DRAFT}%2fcomponents", "GET"),
        ("/api/pcs/extract", "POST"),
        ("/api/pcs/extract/confirm", "POST"),
    ],
)
@pytest.mark.parametrize("signed", [False, True])
def test_queries_not_allowed_on_other_admin_or_extraction_routes(
    configured, path, method, signed
):
    headers = signed_headers(method=method, path=path) if signed else {}
    with pytest.raises(AuthError):
        client_ip(request(headers, method=method, path=path, query=b"limit=1"))


def test_admin_signature_still_binds_raw_path(configured):
    headers = signed_headers(method="GET", path=f"{ADMIN_DRAFT}/components")
    with pytest.raises(AuthError):
        client_ip(
            request(
                headers,
                method="GET",
                path=f"{ADMIN_DRAFT}/prices",
                query=b"limit=1&offset=0",
            )
        )
