"""Prueba HTTP/HTTPS y reinicio real, exclusivamente sobre la base test del proyecto."""

import hashlib
import http.client
import http.cookiejar
import json
import os
import secrets
import socket
import ssl
import subprocess
import sys
import time
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import delete, update

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from upgradejusto.persistence.database import build_engine  # noqa: E402
from upgradejusto.persistence.schema import pcs, plans, sessions, users  # noqa: E402

LOCAL = ROOT / ".local/postgresql"
PYTHON = ROOT / "backend/.venv/Scripts/python.exe"


def start_server(environment, port, secure):
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", port))
    args = [
        str(PYTHON),
        "-m",
        "uvicorn",
        "upgradejusto.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(port),
        "--loop",
        "asyncio",
        "--http",
        "h11",
        "--no-access-log",
        "--no-proxy-headers",
    ]
    if secure:
        args.extend(
            [
                "--ssl-keyfile",
                str(LOCAL / "tls-proof/key.pem"),
                "--ssl-certfile",
                str(LOCAL / "tls-proof/cert.pem"),
            ]
        )
    log = (LOCAL / f"auth-runtime-{port}.log").open("a", encoding="utf-8")
    process = subprocess.Popen(
        args,
        cwd=ROOT / "backend",
        env=environment,
        stdout=log,
        stderr=subprocess.STDOUT,
    )
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        if process.poll() is not None:
            log.close()
            raise RuntimeError("Own HTTP server failed to start")
        with socket.socket() as probe:
            if probe.connect_ex(("127.0.0.1", port)) == 0:
                return process, log
        time.sleep(0.2)
    stop_server((process, log))
    raise RuntimeError("Own HTTP readiness timed out")


def stop_server(server):
    process, log = server
    if process.poll() is None:
        subprocess.run(
            ["taskkill.exe", "/PID", str(process.pid), "/T", "/F"],
            capture_output=True,
            timeout=15,
        )
        process.wait(timeout=10)
    log.close()


def main():
    config = json.loads((LOCAL / "runtime.json").read_text())
    engine = build_engine(config["TEST_DATABASE_URL"])
    if (engine.url.host, engine.url.port, engine.url.database, engine.url.username) != (
        "127.0.0.1",
        55433,
        "upgradejusto_test",
        "upgradejusto_test_app",
    ):
        raise RuntimeError("Refuse non-exclusive test target")
    if engine.url.query:
        raise RuntimeError("Connection query options are forbidden in runtime proof")
    certificate = LOCAL / "tls-proof/cert.pem"
    context = ssl.create_default_context(cafile=str(certificate))
    environment = {
        **os.environ,
        "DATABASE_URL": config["TEST_DATABASE_URL"],
        "UJ_ENV": "test",
        "UJ_ORIGIN": "https://127.0.0.1:18001",
        "UJ_ALLOW_INSECURE_LOOPBACK": "0",
        "UJ_PROXY_SECRET": config["UJ_PROXY_SECRET"],
        "UJ_TRUSTED_PROXY_PEERS": "127.0.0.1",
    }
    jar = http.cookiejar.CookieJar()
    digests = set()
    owned_users = set()
    plan_mode = "--plans" in sys.argv
    pc_mode = "--pc" in sys.argv or plan_mode
    saved_pc = None
    saved_plan = None
    shared_path = None
    revoked_path = None
    public_snapshot = None
    other_jar = http.cookiejar.CookieJar()
    source_host = f"127.42.{secrets.randbelow(253) + 1}.{secrets.randbelow(253) + 1}"
    email = f"runtime-{uuid.uuid4().hex}@example.invalid"
    password = secrets.token_urlsafe(24)
    servers = []
    cluster_stopped = False
    checks = {}

    def request(method, path, payload=None, csrf=None, secure=True, session_jar=None):
        active_jar = jar if session_jar is None else session_jar
        port = 18001 if secure else 18002
        base = f"{'https' if secure else 'http'}://127.0.0.1:{port}"
        body = json.dumps(payload).encode() if payload is not None else None
        headers = {"Origin": base}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if csrf is not None:
            headers["X-CSRF-Token"] = csrf
        req = urllib.request.Request(
            base + path, data=body, headers=headers, method=method
        )
        active_jar.add_cookie_header(req)
        cls = http.client.HTTPSConnection if secure else http.client.HTTPConnection
        options = {"context": context} if secure else {}
        connection = cls(
            "127.0.0.1", port, timeout=12, source_address=(source_host, 0), **options
        )
        try:
            connection.request(
                method, path, body=body, headers=dict(req.header_items())
            )
            response = connection.getresponse()
            active_jar.extract_cookies(response, req)
            data = response.read()
            for cookie in active_jar:
                if cookie.name == "uj_session":
                    digests.add(hashlib.sha256(cookie.value.encode()).hexdigest())
            return response.status, json.loads(data) if data else None
        finally:
            connection.close()

    def cluster(action):
        result = subprocess.run(
            [str(PYTHON), str(ROOT / "scripts/postgres_admin.py"), action],
            capture_output=True,
            timeout=50,
        )
        if result.returncode:
            raise RuntimeError(f"Project cluster {action} failed")

    try:
        servers.append(start_server(environment, 18001, True))
        status, body = request("GET", "/api/auth/csrf")
        assert status == 200
        csrf = body["csrf_token"]
        status, registered = request(
            "POST", "/api/auth/register", {"email": email, "password": password}, csrf
        )
        assert status == 201
        owner_id = uuid.UUID(registered["id"])
        owned_users.add(owner_id)
        assert (
            request(
                "POST", "/api/auth/login", {"email": email, "password": password}, csrf
            )[0]
            == 200
        )
        cookie = next(c for c in jar if c.name == "uj_session")
        assert (
            cookie.secure
            and cookie.path == "/api"
            and any(k.lower() == "httponly" for k in cookie._rest)
        )
        checks["real_https_secure_httponly_cookie"] = True
        assert request("GET", "/api/auth/session")[0] == 200

        insecure_env = {
            **environment,
            "UJ_ORIGIN": "http://127.0.0.1:18002",
            "UJ_ALLOW_INSECURE_LOOPBACK": "1",
        }
        servers.append(start_server(insecure_env, 18002, False))
        assert request("GET", "/api/auth/session", secure=False)[0] == 401
        checks["secure_cookie_not_sent_over_http"] = True
        stop_server(servers.pop())

        if pc_mode:
            csrf = request("GET", "/api/auth/csrf")[1]["csrf_token"]
            payload = {
                "name": "Runtime PC proof",
                "components": [
                    {"category": "ram", "component_id": "P04", "quantity": 2}
                ],
                "context": {"bios_version": "P2.30", "notes": None},
            }
            status, saved_pc = request("POST", "/api/pcs", payload, csrf)
            assert status == 201 and saved_pc["revision"] == 1
            payload = {
                **payload,
                "name": "Runtime PC edited",
                "context": {"bios_version": None, "notes": "Declared runtime fixture"},
                "revision": 1,
            }
            status, saved_pc = request(
                "PUT", f"/api/pcs/{saved_pc['id']}", payload, csrf
            )
            assert status == 200 and saved_pc["revision"] == 2
            other_email = f"runtime-b-{uuid.uuid4().hex}@example.invalid"
            other_password = secrets.token_urlsafe(24)
            other_csrf = request("GET", "/api/auth/csrf", session_jar=other_jar)[1][
                "csrf_token"
            ]
            status, registered = request(
                "POST",
                "/api/auth/register",
                {"email": other_email, "password": other_password},
                other_csrf,
                session_jar=other_jar,
            )
            assert status == 201
            owned_users.add(uuid.UUID(registered["id"]))
            assert (
                request(
                    "POST",
                    "/api/auth/login",
                    {"email": other_email, "password": other_password},
                    other_csrf,
                    session_jar=other_jar,
                )[0]
                == 200
            )
            other_csrf = request("GET", "/api/auth/csrf", session_jar=other_jar)[1][
                "csrf_token"
            ]
            assert request("GET", "/api/pcs", session_jar=other_jar)[1]["total"] == 0
            for method in ("GET", "PUT", "DELETE"):
                data = (
                    {**payload, "revision": saved_pc["revision"]}
                    if method == "PUT"
                    else None
                )
                assert (
                    request(
                        method,
                        f"/api/pcs/{saved_pc['id']}",
                        data,
                        other_csrf,
                        session_jar=other_jar,
                    )[0]
                    == 404
                )
            checks["pc_direct_http_cross_owner_rejected"] = True

        if plan_mode:
            status, saved_plan = request(
                "POST",
                "/api/plans",
                {
                    "name": "Runtime plan fixture",
                    "pc_id": saved_pc["id"],
                    "expected_pc_revision": saved_pc["revision"],
                    "objective": "general",
                    "budget_ars": "2000000.00",
                    "stages": [
                        {
                            "name": "RAM draft",
                            "replacements": [
                                {
                                    "category": "ram",
                                    "candidates": [
                                        {"component_id": "P05", "quantity": 2}
                                    ],
                                }
                            ],
                        },
                        {
                            "name": "Unpriced RAM draft",
                            "replacements": [
                                {
                                    "category": "ram",
                                    "candidates": [
                                        {"component_id": "P04", "quantity": 1}
                                    ],
                                }
                            ],
                        },
                    ],
                },
                csrf,
            )
            assert status == 201 and saved_plan["status"] != "ready"
            assert saved_plan["cost"]["total_ars"] is None
            share_request = {
                "expected_plan_revision": 1,
                "title": "Public runtime fixture",
            }
            status, share = request(
                "POST", f"/api/plans/{saved_plan['id']}/shares", share_request, csrf
            )
            assert status == 201
            shared_path = "/api/shared-plans/" + share["path"].rsplit("/", 1)[1]
            status, public_snapshot = request(
                "GET", shared_path, session_jar=http.cookiejar.CookieJar()
            )
            assert status == 200
            serialized = json.dumps(public_snapshot)
            assert all(
                secret not in serialized
                for secret in (
                    email,
                    saved_pc["id"],
                    saved_plan["id"],
                    "Declared runtime fixture",
                )
            )
            status, revoke = request(
                "POST", f"/api/plans/{saved_plan['id']}/shares", share_request, csrf
            )
            assert status == 201
            revoked_path = "/api/shared-plans/" + revoke["path"].rsplit("/", 1)[1]
            assert (
                request(
                    "DELETE",
                    f"/api/plans/{saved_plan['id']}/shares/{revoke['id']}",
                    csrf=csrf,
                )[0]
                == 204
            )
            assert request("GET", revoked_path)[0] == 404
            assert (
                request("GET", f"/api/plans/{saved_plan['id']}", session_jar=other_jar)[
                    0
                ]
                == 404
            )

        cluster("stop")
        cluster_stopped = True
        status, body = request("GET", "/api/catalog/components")
        assert status == 503 and body == {"detail": "Service unavailable"}
        checks["real_database_outage_sanitized_503"] = True
        if plan_mode:
            assert request("GET", shared_path)[0] == 503
            checks["public_share_database_outage_no_cached_success"] = True
        cluster("start")
        cluster_stopped = False
        status, body = request("GET", "/api/auth/session")
        assert status == 200 and body["email"] == email
        checks["authenticated_session_survives_cluster_restart"] = True

        if plan_mode:
            status, restored_plan = request("GET", f"/api/plans/{saved_plan['id']}")
            assert status == 200 and restored_plan == saved_plan
            assert request("GET", shared_path)[1] == public_snapshot
            assert request("GET", revoked_path)[0] == 404
            checks["plan_snapshot_and_revocation_survive_real_cluster_restart"] = True

        if pc_mode:
            status, restored = request("GET", f"/api/pcs/{saved_pc['id']}")
            assert status == 200 and restored == saved_pc
            assert (
                restored["context"]["bios_version"] is None
                and restored["components"][0]["quantity"] == 2
            )
            assert (
                request("GET", f"/api/pcs/{saved_pc['id']}", session_jar=other_jar)[0]
                == 404
            )
            checks["pc_revision_components_nulls_survive_real_cluster_restart"] = True
            csrf = request("GET", "/api/auth/csrf")[1]["csrf_token"]
            assert request("DELETE", f"/api/pcs/{saved_pc['id']}", csrf=csrf)[0] == 204
            assert request("GET", f"/api/pcs/{saved_pc['id']}")[0] == 404
            checks["pc_owner_delete_confirmed"] = True
            if plan_mode:
                status, retained = request("GET", f"/api/plans/{saved_plan['id']}")
                assert status == 200 and retained["pc_id"] is None
                assert retained["stages"] == saved_plan["stages"]
                assert (
                    request("DELETE", f"/api/plans/{saved_plan['id']}", csrf=csrf)[0]
                    == 204
                )
                assert request("GET", shared_path)[0] == 404
                checks["pc_delete_preserves_plan_plan_delete_revokes_public_share"] = (
                    True
                )

        csrf = request("GET", "/api/auth/csrf")[1]["csrf_token"]
        assert request("POST", "/api/auth/logout", csrf=csrf)[0] == 204
        assert request("GET", "/api/auth/session")[0] == 401
        checks["logout_revokes_session"] = True
        csrf = request("GET", "/api/auth/csrf")[1]["csrf_token"]
        assert (
            request(
                "POST", "/api/auth/login", {"email": email, "password": password}, csrf
            )[0]
            == 200
        )
        with engine.begin() as connection:
            owner = owner_id
            now = datetime.now(timezone.utc)
            connection.execute(
                update(sessions)
                .where(sessions.c.user_id == owner)
                .values(
                    created_at=now - timedelta(hours=13),
                    expires_at=now - timedelta(minutes=1),
                )
            )
        assert request("GET", "/api/auth/session")[0] == 401
        checks["expired_session_rejected_over_real_https"] = True
        report = (
            "plan-runtime-proof-GH.json"
            if plan_mode
            else "auth-runtime-proof-C.json"
            if pc_mode
            else "auth-runtime-proof.json"
        )
        (ROOT / ".local/evidence/sprint32" / report).write_text(
            json.dumps(
                {
                    "date": datetime.now(timezone.utc).date().isoformat(),
                    "checks": checks,
                    "exit": 0,
                }
            ),
            encoding="utf-8",
        )
        print("Real HTTPS/auth/restart checks:", json.dumps(checks))
        return 0
    except Exception as error:
        failure = {
            "checks_completed": checks,
            "error_class": type(error).__name__,
            "sqlstate": getattr(getattr(error, "orig", None), "sqlstate", None),
        }
        (ROOT / ".local/evidence/sprint32/runtime-proof-failure.json").write_text(
            json.dumps(failure), encoding="utf-8"
        )
        raise
    finally:
        if cluster_stopped:
            cluster("start")
        for server in reversed(servers):
            stop_server(server)
        with engine.begin() as connection:
            connection.execute(delete(sessions).where(sessions.c.digest.in_(digests)))
            if owned_users:
                if plan_mode:
                    connection.execute(
                        delete(plans).where(plans.c.owner_id.in_(owned_users))
                    )
                if pc_mode:
                    connection.execute(
                        delete(pcs).where(pcs.c.owner_id.in_(owned_users))
                    )
                connection.execute(
                    delete(sessions).where(sessions.c.user_id.in_(owned_users))
                )
                connection.execute(delete(users).where(users.c.id.in_(owned_users)))
        engine.dispose()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(
            f"Runtime auth proof failed ({type(error).__name__}); sensitive values omitted"
        )
        raise SystemExit(1)
