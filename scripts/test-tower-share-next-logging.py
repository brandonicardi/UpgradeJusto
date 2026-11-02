"""Actual Next dev/prod + TEST backend; RAM-only capability log gate.

Run explicitly from backend with the existing TEST environment. No LLM calls,
production mounts, persistent credentials, browser traces or log forwarding.
"""

import hashlib
import http.client
import json
import os
import secrets
import shutil
import socket
import subprocess
import sys
import threading
from pathlib import Path
from time import monotonic

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[1]
if (
    os.environ.get("UJ_ENV") != "test"
    or not os.environ.get("DATABASE_URL")
    or os.environ.get("DATABASE_URL") != os.environ.get("TEST_DATABASE_URL")
):
    pytest.fail(
        "Matched TEST environment required before resource imports", pytrace=False
    )

sys.path.insert(0, str(ROOT / "backend/tests"))
from conftest import pg_engine as pg_engine  # noqa: E402
from test_pcs_postgres import actors as actors  # noqa: E402
from test_tower38_share_mounted import (  # noqa: E402
    NOTE,
    PUBLISH,
    body,
    signed,
)
from test_tower38_share_mounted import (  # noqa: E402
    share_context as share_context,
)


class CapturedChild:
    def __init__(self, command, cwd, environment, ready, stop, closed):
        self.output = bytearray()
        self.overflow = False
        self.eof = False
        self.ready = threading.Event()
        self.closed_marker = closed
        self.stop = stop
        self.forced = False
        self.close_failed = False
        self.shutdown_seconds = None
        self.process = subprocess.Popen(
            command,
            cwd=cwd,
            env=environment,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )

        def drain():
            try:
                while chunk := self.process.stdout.read1(4096):
                    remaining = max(0, 1048576 - len(self.output))
                    self.output.extend(chunk[:remaining])
                    self.overflow |= len(chunk) > remaining
                    if ready in self.output and self.process.poll() is None:
                        self.ready.set()
            except (OSError, ValueError):
                self.overflow = True
            finally:
                self.eof = True

        self.reader = threading.Thread(target=drain, daemon=True)
        self.reader.start()

    def wait_ready(self, seconds):
        if not self.ready.wait(seconds) or self.process.poll() is not None:
            raise RuntimeError("owned_startup_unavailable")

    def close(self):
        started = monotonic()
        try:
            if self.process.poll() is None:
                try:
                    self.process.stdin.write(self.stop)
                    self.process.stdin.flush()
                    self.process.stdin.close()
                except (OSError, ValueError):
                    self.close_failed = True
            self.process.wait(timeout=15)
        except (OSError, subprocess.TimeoutExpired):
            self.forced = True
            try:
                if self.process.poll() is None:
                    self.process.kill()
                self.process.wait(timeout=5)
            except (OSError, subprocess.TimeoutExpired):
                self.close_failed = True
        finally:
            try:
                self.reader.join(timeout=5)
                self.process.stdout.close()
            except (OSError, ValueError, RuntimeError):
                self.close_failed = True
            self.shutdown_seconds = round(monotonic() - started, 3)

    def result(self, markers):
        return {
            "startup_verified": self.ready.is_set(),
            "graceful": self.closed_marker in self.output and not self.forced,
            "closed_marker": self.closed_marker in self.output,
            "close_failed_marker": b"UJ_SHARE_TEST_CLOSE_FAILED" in self.output,
            "forced": self.forced,
            "close_failed": self.close_failed,
            "shutdown_seconds": self.shutdown_seconds,
            "capture_eof": self.eof and not self.reader.is_alive(),
            "exit0": self.process.returncode == 0,
            "overflow": self.overflow,
            "marker_hits": marker_hits(self.output, markers),
            "bytes": len(self.output),
        }


def marker_hits(output, markers):
    return sum(bool(marker) and marker in output for marker in markers)


def close_children(children):
    for child in reversed(children):
        try:
            child.close()
        except Exception:
            # Never let one owned child's cleanup suppress the next cleanup/report.
            child.close_failed = True


def test_scanner_detects_raw_encoded_target_without_literal_token():
    canonical = b"synthetic-capability-for-unit-only"
    target = b"/shared-tower-plans/%73ynthetic-capability-for-unit-only"
    output = b"GET " + target + b" 404"
    assert marker_hits(output, [canonical]) == 0
    assert marker_hits(output, [canonical, target]) == 1


def test_cleanup_failure_does_not_skip_next_owned_child():
    class SyntheticChild:
        close_failed = False
        called = False

        def close(self):
            self.called = True

    class FailingChild(SyntheticChild):
        def close(self):
            self.called = True
            raise RuntimeError("synthetic-unit-close-failure")

    first, last = SyntheticChild(), FailingChild()
    close_children([first, last])
    assert first.called and last.called and last.close_failed


def require(value):
    if not value:
        raise RuntimeError("http_contract_failed")


def safe_headers(response):
    require("no-store" in response.headers.get("cache-control", ""))
    require(response.headers.get("referrer-policy") == "no-referrer")
    require(response.headers.get("x-content-type-options") == "nosniff")
    require(response.headers.get("x-robots-tag") == "noindex, nofollow")


def raw_get(target):
    # Preserve percent aliases and dot segments; never normalize through a URL parser.
    connection = http.client.HTTPConnection("127.0.0.1", 3000, timeout=5)
    try:
        connection.request("GET", target)
        response = connection.getresponse()
        data = response.read(1048577)
        require(len(data) <= 1048576)
        require(response.status == 404)
        fields = {key.lower(): value for key, value in response.getheaders()}
        require("no-store" in fields.get("cache-control", ""))
        require(fields.get("referrer-policy") == "no-referrer")
        require(fields.get("x-content-type-options") == "nosniff")
        require(fields.get("x-robots-tag") == "noindex, nofollow")
    finally:
        connection.close()


@pytest.mark.parametrize("mode", ["production", "dev"])
def test_next_share_capability_logs_and_raw_paths(share_context, mode):
    ctx = share_context
    phase = "ports"
    children = []
    markers = [NOTE.encode(), ctx.a[1]["X-CSRF-Token"].encode()]
    report = {"mode": mode, "completed": False}
    try:
        for port in (3000, 8000):
            with socket.socket() as reservation:
                reservation.bind(("127.0.0.1", port))
        environment = os.environ.copy()
        error_tokens = (secrets.token_urlsafe(32), secrets.token_urlsafe(32))
        markers.extend(token.encode() for token in error_tokens)
        environment.update(
            UJ_TEST_SHARE_ERROR_PROBE="1",
            UJ_TEST_SHARE_ERROR_BEFORE_TOKEN=error_tokens[0],
            UJ_TEST_SHARE_ERROR_AFTER_TOKEN=error_tokens[1],
            UJ_ASSISTANT_EXCLUSIVE_STARTUP="0",
            CATALOG_API_URL="http://127.0.0.1:8000",
            NEXT_TELEMETRY_DISABLED="1",
        )
        phase = "backend_startup"
        backend = CapturedChild(
            [sys.executable, "tests/tower_share_process_worker.py", "8000"],
            ROOT / "backend",
            environment,
            b"Uvicorn running on http://127.0.0.1:8000 (",
            b"STOP\n",
            b"WORKER_GRACEFUL_COMPLETED",
        )
        children.append(backend)
        backend.wait_ready(10)
        phase = "web_startup"
        environment["UJ_TEST_SHARE_SERVER_CONTROL"] = "1"
        node = shutil.which("node")
        require(node is not None)
        web = CapturedChild(
            [node, "server.mjs", *(["--dev"] if mode == "dev" else [])],
            ROOT / "frontend",
            environment,
            b"UJ_SHARE_TEST_READY\n",
            b"UJ_SHARE_TEST_STOP\n",
            b"UJ_SHARE_TEST_GRACEFUL_COMPLETED",
        )
        children.append(web)
        web.wait_ready(120)
        phase = "own_plan_fixture"
        plan_response = ctx.a[0].post(
            "/api/tower-plans",
            headers=signed("POST", "/api/tower-plans", ctx.a),
            json=body(ctx),
        )
        require(plan_response.status_code == 201)
        plan = plan_response.json()
        collection = "/api/tower-plans/" + plan["id"] + "/shares"
        with (
            httpx.Client(base_url="http://127.0.0.1:3000", timeout=15) as owner,
            httpx.Client(base_url="http://127.0.0.1:3000", timeout=15) as visitor,
        ):
            session = ctx.a[0].cookies.get("uj_session")
            require(bool(session))
            owner.cookies.set("uj_session", session, domain="127.0.0.1", path="/api")
            markers.append(session.encode())
            phase = "bff_create"
            created_response = owner.post(collection, headers=ctx.a[1], json=PUBLISH)
            safe_headers(created_response)
            require(created_response.status_code == 201)
            created = created_response.json()
            token = created["token"]
            public_api = "/api/shared-tower-plans/" + token
            public_web = "/shared-tower-plans/" + token
            markers.extend(
                [
                    token.encode(),
                    public_api.encode(),
                    public_web.encode(),
                    hashlib.sha256(token.encode()).hexdigest().encode(),
                ]
            )
            phase = "bff_public_frozen"
            first = visitor.get(public_api)
            safe_headers(first)
            require(first.status_code == 200)
            require(first.json()["kind"] == "shared_tower_plan")
            require(NOTE.encode() not in first.content)
            require(visitor.get(public_api).content == first.content)
            phase = "web_public"
            page = visitor.get(public_web)
            safe_headers(page)
            require(page.status_code == 200)
            require(NOTE.encode() not in page.content)
            phase = "raw_aliases"
            encoded_first = "%" + format(ord(token[0]), "02X") + token[1:]
            for target in (
                "/shared-tower-plans/" + encoded_first,
                "/api/shared-tower-plans/" + encoded_first,
                "/%73hared-tower-plans/" + token,
                "/x/../shared-tower-plans/" + token,
                public_web + "?alias=1",
            ):
                markers.append(target.encode())
                raw_get(target)
            phase = "bff_validation"
            invalid_create = owner.post(collection, headers=ctx.a[1], json={})
            safe_headers(invalid_create)
            require(invalid_create.status_code == 422)
            invalid = visitor.get("/api/shared-tower-plans/invalid")
            safe_headers(invalid)
            require(invalid.status_code == 404)
            phase = "backend_error_before_after_through_next"
            for error_token in error_tokens:
                error_api = "/api/shared-tower-plans/" + error_token
                error_web = "/shared-tower-plans/" + error_token
                markers.extend([error_api.encode(), error_web.encode()])
                failed_api = visitor.get(error_api)
                safe_headers(failed_api)
                require(failed_api.status_code == 503)
                require(NOTE.encode() not in failed_api.content)
                failed_web = visitor.get(error_web)
                safe_headers(failed_web)
                require(failed_web.status_code == 200)
                require(b"Plan p\xc3\xbablico no disponible" in failed_web.content)
                require(NOTE.encode() not in failed_web.content)
                require(error_token.encode() not in failed_api.content)
            phase = "plan_delete"
            deleted_plan = owner.request(
                "DELETE",
                "/api/tower-plans/" + plan["id"],
                headers=ctx.a[1],
                json={"expected_plan_revision": plan["revision"]},
            )
            require(deleted_plan.status_code == 204)
            phase = "deleted_plan_private_read"
            require(owner.get("/api/tower-plans/" + plan["id"]).status_code == 404)
            phase = "deleted_plan_share_list"
            listed = owner.get(collection)
            safe_headers(listed)
            require(listed.status_code == 200)
            require(
                any(
                    item["id"] == created["id"]
                    and item["effective_state"] == "disabled_plan_deleted"
                    for item in listed.json()["items"]
                )
            )
            phase = "deleted_plan_public_disabled"
            after_delete = visitor.get(public_api)
            safe_headers(after_delete)
            require(after_delete.status_code == 404)
            require(after_delete.content == invalid.content)
            phase = "bff_revoke"
            revoked = owner.request(
                "DELETE",
                collection + "/" + created["id"],
                headers=ctx.a[1],
                json={"expected_plan_revision": created["plan_revision"]},
            )
            safe_headers(revoked)
            require(revoked.status_code == 204)
            unavailable = visitor.get(public_api)
            safe_headers(unavailable)
            require(unavailable.status_code == 404)
            require(unavailable.content == invalid.content)
            phase = "web_revoked"
            missing_page = visitor.get(public_web)
            safe_headers(missing_page)
            require(missing_page.status_code == 404)
            report["completed"] = True
    except (Exception, pytest.fail.Exception):
        report["failure_phase"] = phase
    finally:
        close_children(children)
        report["processes"] = [child.result(markers) for child in children]
    passed = (
        report["completed"]
        and len(children) == 2
        and all(
            item["startup_verified"]
            and item["graceful"]
            and item["capture_eof"]
            and item["exit0"]
            and not item["overflow"]
            and not item["marker_hits"]
            and not item["close_failed"]
            for item in report["processes"]
        )
    )
    # No captured output, request URL, response, marker or credential in diagnostics.
    print(json.dumps(report))
    if not passed:
        pytest.fail(json.dumps(report), pytrace=False)
