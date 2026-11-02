"""Frontera de confianza HTTP del gateway B; no concede identidad de usuario."""

import hashlib
import hmac
import ipaddress
import os
import re
import time
from urllib.parse import parse_qsl

from fastapi import Request

from upgradejusto.auth.service import AuthError

GATEWAY_HEADERS = {
    "x-uj-client-ip",
    "x-uj-proxy-timestamp",
    "x-uj-proxy-signature",
}


def permitted_tower_plan_request(request: Request) -> bool:
    """Closed CU07/CU09 route policy, identical for direct/signed ingress."""
    root = rb"/api/tower-plans"
    uid = rb"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    path = request.scope["raw_path"]
    if request.method == "GET":
        pattern = root + rb"(?:/" + uid + rb"(?:/revisions/[1-9][0-9]{0,9}|/shares)?)?"
    elif request.method == "POST":
        pattern = root + rb"(?:/" + uid + rb"/(?:recalculate|shares))?"
    elif request.method == "DELETE":
        pattern = root + rb"/" + uid + rb"(?:/shares/" + uid + rb")?"
    else:
        return False
    if not re.fullmatch(pattern, path):
        return False
    query = request.scope.get("query_string", b"")
    if not query:
        return True
    if request.method != "GET" or path != b"/api/tower-plans" or len(query) > 23:
        return False
    pair = rb"(?:page=[1-9][0-9]{0,4}|page_size=[1-9][0-9]?)"
    if not re.fullmatch(pair + rb"(?:&" + pair + rb")*", query):
        return False
    pairs = [value.split(b"=", 1) for value in query.split(b"&")]
    return len({key for key, _ in pairs}) == len(pairs) and all(
        int(value) <= (10000 if key == b"page" else 50) for key, value in pairs
    )


def permitted_query(request: Request) -> bool:
    if request.url.path == "/api/shared-tower-plans" or request.url.path.startswith(
        "/api/shared-tower-plans/"
    ):
        return (
            request.method == "GET"
            and not request.scope.get("query_string")
            and re.fullmatch(
                rb"/api/shared-tower-plans/[A-Za-z0-9_-]{1,128}",
                request.scope["raw_path"],
            )
            is not None
        )
    if request.url.path == "/api/tower-plans" or request.url.path.startswith(
        "/api/tower-plans/"
    ):
        return permitted_tower_plan_request(request)
    if not request.scope.get("query_string"):
        return True
    path = request.scope["raw_path"]
    admin_list = path == b"/api/admin/revisions" or bool(
        re.fullmatch(
            rb"/api/admin/revisions/(?:sprint31b-a-v1|revision-[0-9a-f]{32})/"
            rb"(?:components|prices|sources|cpu_support)",
            path,
        )
    )
    if admin_list:
        # Canonical literal keys/digits only: reject encoded aliases, blank values,
        # duplicates and unknown keys before both direct and gateway processing.
        query = request.scope["query_string"]
        if request.method != "GET" or not re.fullmatch(
            rb"(?:limit|offset)=[0-9]+(?:&(?:limit|offset)=[0-9]+)*", query
        ):
            return False
        keys = [pair.split(b"=", 1)[0] for pair in query.split(b"&")]
        return len(keys) == len(set(keys))
    conversation_list = path == b"/api/conversations" or bool(
        re.fullmatch(
            rb"/api/conversations/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/messages",
            path,
        )
    )
    if request.method != "GET" or not (
        path in (b"/api/pcs", b"/api/towers", b"/api/plans") or conversation_list
    ):
        return False
    try:
        pairs = parse_qsl(
            request.scope["query_string"].decode("ascii"),
            keep_blank_values=True,
            strict_parsing=True,
        )
    except (UnicodeError, ValueError):
        return False
    return len({key for key, _ in pairs}) == len(pairs) and all(
        key in {"page", "page_size"} for key, _ in pairs
    )


def normalized_ip(value: str) -> str:
    if "%" in value:
        raise ValueError("Scoped IP not allowed")
    address = ipaddress.ip_address(value)
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        address = address.ipv4_mapped
    return str(address)


def client_ip(request: Request) -> str:
    """Headers parciales, configuración ausente y firmas malas fallan cerrados."""
    try:
        # Private route policies apply before returning a direct transport peer.
        if request.url.path in (
            "/api/pcs",
            "/api/towers",
            "/api/tower-plans",
            "/api/shared-tower-plans",
            "/api/plans",
            "/api/conversations",
            "/api/admin",
        ) or request.url.path.startswith(
            (
                "/api/pcs/",
                "/api/towers/",
                "/api/tower-plans/",
                "/api/shared-tower-plans/",
                "/api/plans/",
                "/api/shared-plans/",
                "/api/conversations/",
                "/api/admin/",
            )
        ):
            if not permitted_query(request):
                raise ValueError("Unexpected private query")
        peer = normalized_ip(request.client.host) if request.client else None
        if not peer:
            raise ValueError("Missing transport peer")
        supplied = {name for name in request.headers if name.startswith("x-uj-")}
        if not supplied:
            return peer
        if supplied != GATEWAY_HEADERS or any(
            len(request.headers.getlist(name)) != 1 for name in GATEWAY_HEADERS
        ):
            raise ValueError("Invalid gateway headers")
        configured = os.environ.get("UJ_TRUSTED_PROXY_PEERS", "")
        peers = {normalized_ip(item.strip()) for item in configured.split(",")}
        if any(not ipaddress.ip_address(item).is_loopback for item in peers):
            raise ValueError("Only explicit loopback peers are permitted")
        secret = os.environ.get("UJ_PROXY_SECRET", "").encode("utf-8")
        if peer not in peers or len(secret) < 32:
            raise ValueError("Gateway not configured")
        raw_ip = request.headers["x-uj-client-ip"]
        resolved = normalized_ip(raw_ip)
        timestamp = request.headers["x-uj-proxy-timestamp"]
        signature = request.headers["x-uj-proxy-signature"]
        if (
            resolved != raw_ip
            or not re.fullmatch(r"[0-9]{1,12}", timestamp)
            or abs(time.time() - int(timestamp)) > 30
            or not re.fullmatch(r"[0-9a-f]{64}", signature)
            or not permitted_query(request)
        ):
            raise ValueError("Invalid signed request")
        path = request.scope["raw_path"].decode("ascii")
        canonical = "\n".join((timestamp, request.method.upper(), path, resolved))
        expected = hmac.new(
            secret, canonical.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise ValueError("Invalid signature")
        return resolved
    except (ValueError, UnicodeError):
        raise AuthError(403, "Forbidden") from None
