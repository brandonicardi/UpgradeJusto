"""Real HTTP/Groq/MCP/RAG history and exclusive local restart proof on TEST only.

No browser claims. No raw SSE, cookies, messages or fixture IDs in console/report.
"""

import hashlib
import http.client
import http.cookiejar
import importlib.util
import json
import os
import secrets
import subprocess
import sys
import urllib.request
from pathlib import Path
from uuid import UUID, uuid4

import sqlalchemy as sa

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from upgradejusto.assistant.models import MessageCreate  # noqa: E402
from upgradejusto.assistant.repository import Repository  # noqa: E402
from upgradejusto.assistant.tables import conversations, messages  # noqa: E402
from upgradejusto.persistence.database import build_engine  # noqa: E402
from upgradejusto.persistence.schema import sessions, users  # noqa: E402


def main():
    spec = importlib.util.spec_from_file_location(
        "runtime_helpers", ROOT / "scripts/verify-auth-runtime.py"
    )
    helpers = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helpers)
    engine = build_engine(os.environ.get("DATABASE_URL"))
    if (
        (engine.url.host, engine.url.port, engine.url.database, engine.url.username)
        != (
            "127.0.0.1",
            55433,
            "upgradejusto_test",
            "upgradejusto_test_app",
        )
        or engine.url.query
        or os.environ.get("TEST_DATABASE_URL") != os.environ.get("DATABASE_URL")
    ):
        raise RuntimeError("Refuse any non-exclusive test target")
    with engine.connect() as conn:
        if conn.scalar(
            sa.select(sa.func.count())
            .select_from(messages)
            .where(messages.c.status == "pending")
        ):
            raise RuntimeError(
                "Existing pending turns: exclusive recovery proof refused"
            )
    env = {
        **os.environ,
        "UJ_ENV": "test",
        "UJ_ORIGIN": "http://127.0.0.1:18003",
        "UJ_ALLOW_INSECURE_LOOPBACK": "1",
        "UJ_ASSISTANT_EXCLUSIVE_STARTUP": "1",
    }
    source = f"127.43.{secrets.randbelow(253) + 1}.{secrets.randbelow(253) + 1}"
    jars = [http.cookiejar.CookieJar(), http.cookiejar.CookieJar()]
    owned, digests, servers, checks = set(), set(), [], {}
    stopped = False

    def request(actor, method, path, data=None, csrf=None):
        body = json.dumps(data).encode() if data is not None else None
        req = urllib.request.Request(
            "http://127.0.0.1:18003" + path,
            data=body,
            method=method,
            headers={"Origin": env["UJ_ORIGIN"], "Content-Type": "application/json"},
        )
        if csrf:
            req.add_header("X-CSRF-Token", csrf)
        jars[actor].add_cookie_header(req)
        conn = http.client.HTTPConnection(
            "127.0.0.1", 18003, timeout=95, source_address=(source, 0)
        )
        try:
            conn.request(method, path, body=body, headers=dict(req.header_items()))
            response = conn.getresponse()
            jars[actor].extract_cookies(response, req)
            for cookie in jars[actor]:
                if cookie.name == "uj_session":
                    digests.add(hashlib.sha256(cookie.value.encode()).hexdigest())
            payload = response.read().decode("utf-8")
            if response.getheader("Content-Type", "").startswith("text/event-stream"):
                return response.status, payload
            return response.status, json.loads(payload) if payload else None
        finally:
            conn.close()

    def cluster(action):
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts/postgres_admin.py"), action],
            capture_output=True,
            timeout=50,
        )
        if result.returncode:
            raise RuntimeError("Own cluster transition failed")

    try:
        servers.append(helpers.start_server(env, 18003, False))
        csrf_tokens = []
        for actor in range(2):
            csrf = request(actor, "GET", "/api/auth/csrf")[1]["csrf_token"]
            credentials = {
                "email": f"assistant-runtime-{uuid4().hex}@example.test",
                "password": secrets.token_urlsafe(24),
            }
            status, account = request(
                actor, "POST", "/api/auth/register", credentials, csrf
            )
            assert status == 201
            owned.add(UUID(account["id"]))
            assert (
                request(actor, "POST", "/api/auth/login", credentials, csrf)[0] == 200
            )
            csrf_tokens.append(request(actor, "GET", "/api/auth/csrf")[1]["csrf_token"])
        status, conversation = request(
            0,
            "POST",
            "/api/conversations",
            {"title": "Runtime history proof"},
            csrf_tokens[0],
        )
        assert status == 201
        cid = conversation["id"]
        status, stream = request(
            0,
            "POST",
            f"/api/conversations/{cid}/messages",
            {
                "content": "Usa search_public_docs para buscar Kingston DDR4 KVR32N22S8/8 memory specifications. Cita el documento y aclara que no es un veredicto de compatibilidad.",
                "client_request_id": str(uuid4()),
            },
            csrf_tokens[0],
        )
        assert status == 200 and all(
            f"event: {kind}" in stream
            for kind in ("start", "tool_status", "citation", "delta", "done")
        )
        assert "event: error" not in stream
        before = request(0, "GET", f"/api/conversations/{cid}/messages")[1]
        assert (
            before["items"][1]["status"] == "completed"
            and before["items"][1]["citations"]
        )
        for path in (f"/api/conversations/{cid}", f"/api/conversations/{cid}/messages"):
            assert request(1, "GET", path)[0] == 404
        checks["real_http_groq_mcp_vector_citations_history_and_owner"] = True
        # Simulate the durable reservation left by a crashed worker, not a live turn.
        owner = UUID(request(0, "GET", "/api/auth/session")[1]["id"])
        Repository(engine).begin(
            owner,
            UUID(cid),
            MessageCreate(
                content="Abandoned test reservation", client_request_id=uuid4()
            ),
        )
        helpers.stop_server(servers.pop())
        cluster("stop")
        stopped = True
        cluster("start")
        stopped = False
        servers.append(helpers.start_server(env, 18003, False))
        assert request(0, "GET", "/api/auth/session")[0] == 200
        after = request(0, "GET", f"/api/conversations/{cid}/messages")[1]
        assert after["items"][:2] == before["items"]
        assert (
            len(after["items"]) == 4 and after["items"][-1]["status"] == "interrupted"
        )
        assert after["items"][-1]["content"] == ""
        assert request(1, "GET", f"/api/conversations/{cid}/messages")[0] == 404
        checks["real_api_and_pg_restart_preserve_history_citations_session"] = True
        checks[
            "exclusive_startup_recovers_abandoned_pending_without_provider_replay"
        ] = True
        csrf = request(0, "GET", "/api/auth/csrf")[1]["csrf_token"]
        assert request(0, "DELETE", f"/api/conversations/{cid}", csrf=csrf)[0] == 204
        report = ROOT / ".local/evidence/sprint32/assistant-runtime.json"
        report.write_text(
            json.dumps({"checks": checks, "exit": 0}, indent=2), encoding="utf-8"
        )
        print("Real assistant HTTP/restart proof:", json.dumps(checks))
    finally:
        if stopped:
            cluster("start")
        for server in reversed(servers):
            helpers.stop_server(server)
        with engine.begin() as conn:
            conn.execute(sa.delete(sessions).where(sessions.c.digest.in_(digests)))
            if owned:
                conn.execute(
                    sa.delete(conversations).where(conversations.c.owner_id.in_(owned))
                )
                conn.execute(sa.delete(sessions).where(sessions.c.user_id.in_(owned)))
                conn.execute(sa.delete(users).where(users.c.id.in_(owned)))
        engine.dispose()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(
            f"Assistant runtime proof failed ({type(error).__name__}); sensitive values omitted"
        )
        raise SystemExit(1) from None
