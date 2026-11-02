"""Optional real TEST child-process gate; bounded RAM capture, no log forwarding."""

import hashlib
import json
import os
import runpy
import secrets
import socket
import subprocess
import sys
from pathlib import Path
from threading import Event, Thread
from time import monotonic
from uuid import uuid4

import httpx
import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from test_pcs_postgres import actors as actors
from test_tower38_share_mounted import NOTE, PUBLISH, body, checked, signed
from test_tower38_share_mounted import share_context as share_context

from upgradejusto.api.auth import COOKIE
from upgradejusto.shares.tower_tables import budgets


@pytest.mark.parametrize(
    "mode,before,after",
    [
        ("production", "A" * 43, "B" * 43),
        ("test", "short", "B" * 43),
        ("test", "A" * 43, "short"),
        ("test", "A" * 43, "A" * 43),
        ("test", "é" * 43, "B" * 43),
        ("test", "A" * 42 + "!", "B" * 43),
    ],
)
def test_error_probe_refuses_non_test_or_invalid_markers_before_import(
    monkeypatch, mode, before, after
):
    import builtins

    original_import = builtins.__import__
    attempted = []

    def guarded_import(name, *args, **kwargs):
        if name.startswith(("upgradejusto", "fastapi", "starlette")):
            attempted.append(True)
            raise RuntimeError("Unexpected composition import in refusal test")
        return original_import(name, *args, **kwargs)

    monkeypatch.setenv("UJ_ENV", mode)
    monkeypatch.setenv("DATABASE_URL", "synthetic-match-no-connection")
    monkeypatch.setenv("TEST_DATABASE_URL", "synthetic-match-no-connection")
    monkeypatch.setenv("UJ_TEST_SHARE_ERROR_PROBE", "1")
    monkeypatch.setenv("UJ_TEST_SHARE_ERROR_BEFORE_TOKEN", before)
    monkeypatch.setenv("UJ_TEST_SHARE_ERROR_AFTER_TOKEN", after)
    monkeypatch.setattr(builtins, "__import__", guarded_import)
    path = Path(__file__).with_name("tower_share_runtime_probe.py")
    with pytest.raises(RuntimeError, match="Share .*probe"):
        runpy.run_path(str(path), run_name="synthetic_share_error_probe_refusal")
    if attempted:
        pytest.fail("TEST probe refusal imported composition", pytrace=False)


@pytest.mark.parametrize("mode,matched", [("production", True), ("test", False)])
def test_error_worker_refuses_environment_before_resources(monkeypatch, mode, matched):
    import builtins

    original_import = builtins.__import__
    attempted = []

    def guarded_import(name, *args, **kwargs):
        if name.startswith(("uvicorn", "upgradejusto", "tower_share_runtime_probe")):
            attempted.append(True)
            raise RuntimeError("Unexpected worker composition import")
        return original_import(name, *args, **kwargs)

    monkeypatch.setenv("UJ_ENV", mode)
    monkeypatch.setenv("DATABASE_URL", "synthetic-match-no-connection")
    monkeypatch.setenv(
        "TEST_DATABASE_URL",
        "synthetic-match-no-connection" if matched else "synthetic-other-no-connection",
    )
    monkeypatch.setattr(builtins, "__import__", guarded_import)
    path = Path(__file__).with_name("tower_share_process_worker.py")
    namespace = runpy.run_path(str(path), run_name="synthetic_worker_guard")
    with pytest.raises(RuntimeError, match="Share worker requires the matched TEST"):
        namespace["main"]()
    if attempted:
        pytest.fail("Worker refusal imported resources", pytrace=False)


def copy_test_session(source, target):
    """Bridge cookie libraries by one public string value, scoped to TEST localhost.

    api.auth sets only uj_session at /api; CSRF is the actor's real header token,
    not a second cookie. Never pass the foreign cookie container into httpx.update.
    """
    if (
        target.base_url.scheme != "http"
        or target.base_url.host != "127.0.0.1"
        or target.follow_redirects
    ):
        raise ValueError("Session bridge requires fixed TEST localhost, no redirects")
    raw = source.cookies.get(COOKIE)
    if not isinstance(raw, str) or not raw or any(c in raw for c in ";\r\n"):
        raise ValueError("TEST actor session unavailable")
    target.cookies.set(COOKIE, raw, domain="127.0.0.1", path="/api")


def test_cookie_bridge_actual_testclient_container_to_httpx_scoped_jar():
    # Dummy ASGI only: no auth override, server, PG, credential or product debug route.
    async def synthetic_app(scope, receive, send):
        await send(
            {
                "type": "http.response.start",
                "status": 200,
                "headers": [
                    (
                        b"set-cookie",
                        b"uj_session=synthetic-unit-session; Path=/api; HttpOnly; SameSite=lax",
                    ),
                    (b"set-cookie", b"unrelated=synthetic-ignored; Path=/"),
                ],
            }
        )
        await send({"type": "http.response.body", "body": b""})

    source = TestClient(synthetic_app, base_url="http://127.0.0.1:3000")
    source.get("/api/session-fixture")
    with httpx.Client(
        base_url="http://127.0.0.1:54321", follow_redirects=False
    ) as target:
        # Reproduce the actual cross-library API call with synthetic values only.
        try:
            target.cookies.update(source.cookies)
        except AttributeError:
            reproduced = True
        except Exception:
            pytest.fail(
                "Cookie-container reproduction failed (details withheld)", pytrace=False
            )
        else:
            reproduced = False
        if not reproduced:
            pytest.fail(
                "Cookie-container mismatch not reproduced; escalate", pytrace=False
            )
        target.cookies.clear()
        copy_test_session(source, target)
        scoped = target.build_request("GET", "/api/tower-plans")
        if scoped.headers.get("cookie") != "uj_session=synthetic-unit-session":
            pytest.fail("Cookie bridge value/allowlist gate failed", pytrace=False)
        for url in (
            "http://127.0.0.1:54321/health",
            "http://example.invalid/api/tower-plans",
        ):
            if "cookie" in target.build_request("GET", url).headers:
                pytest.fail("Cookie bridge scope gate failed", pytrace=False)
        jar = tuple(target.cookies.jar)
        if len(jar) != 1 or jar[0].domain != "127.0.0.1" or jar[0].path != "/api":
            pytest.fail("Cookie bridge jar scope gate failed", pytrace=False)
    for base_url, redirects in (
        ("http://example.invalid", False),
        ("http://127.0.0.1:54321", True),
    ):
        with httpx.Client(base_url=base_url, follow_redirects=redirects) as target:
            with pytest.raises(ValueError, match="Session bridge requires fixed TEST"):
                copy_test_session(source, target)
    source.close()


def test_test_process_share_creation_public_errors_and_bounded_log_capture(
    share_context, pg_engine
):
    ctx = share_context
    # OS-selected TEST port; never inspect, reuse or stop an existing server.
    with socket.socket() as reservation:
        try:
            reservation.bind(("127.0.0.1", 0))
            port = reservation.getsockname()[1]
        except OSError:
            pytest.fail("Ephemeral TEST probe port unavailable", pytrace=False)
    base_url = f"http://127.0.0.1:{port}"
    command = [
        sys.executable,
        "-m",
        "uvicorn",
        "tower_share_runtime_probe:app",
        "--app-dir",
        "tests",
        "--host",
        "127.0.0.1",
        "--port",
        str(port),
        "--loop",
        "asyncio",
        "--http",
        "h11",
        "--no-access-log",
    ]
    captured = bytearray()
    overflow = [False]
    startup = Event()
    bound_message = f"Uvicorn running on {base_url} (".encode()
    needles = [NOTE.encode()]
    process = subprocess.Popen(
        command,
        cwd=Path(__file__).resolve().parents[1],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    def drain():
        try:
            while chunk := process.stdout.read1(4096):
                remaining = 1048576 - len(captured)
                captured.extend(chunk[:remaining])
                if len(chunk) > remaining:
                    overflow[0] = True
                    # Keep draining without retaining more output or blocking child.
                if (
                    not overflow[0]
                    and b"Application startup complete." in captured
                    and bound_message in captured
                ):
                    # Own child's post-bind announcement, not a foreign health200.
                    startup.set()
        except (OSError, ValueError):
            overflow[0] = True

    reader = Thread(target=drain, daemon=True)
    reader.start()

    def require_own_child(request):
        if not startup.is_set() or process.poll() is not None or overflow[0]:
            pytest.fail("Own TEST child is not ready (output withheld)", pytrace=False)

    phase = "clientstart"
    try:
        with httpx.Client(
            base_url=base_url,
            timeout=5,
            follow_redirects=False,
            event_hooks={"request": [require_own_child]},
        ) as client:
            deadline = monotonic() + 10
            while monotonic() < deadline and process.poll() is None:
                if startup.wait(timeout=min(0.05, max(0, deadline - monotonic()))):
                    break
            remaining = deadline - monotonic()
            if not startup.is_set() or process.poll() is not None or remaining <= 0:
                pytest.fail(
                    "TEST child startup failed (output withheld)", pytrace=False
                )
            ready = (
                client.get("/health", timeout=min(0.25, remaining)).status_code == 200
            )
            if not ready or process.poll() is not None or monotonic() >= deadline:
                pytest.fail(
                    "Own TEST child health gate failed (output withheld)", pytrace=False
                )
            phase = "cookiecopy"
            copy_test_session(ctx.a[0], client)
            needles.append(client.cookies.get(COOKIE).encode())
            phase = "plancreate"
            root = "/api/tower-plans"
            plan_response = client.post(
                root, headers=signed("POST", root, ctx.a), json=body(ctx)
            )
            if plan_response.status_code != 201:
                pytest.fail("TEST child plan setup failed", pytrace=False)
            collection = root + "/" + plan_response.json()["id"] + "/shares"
            phase = "sharecreate"
            created = checked(
                client.post(
                    collection,
                    headers=signed("POST", collection, ctx.a),
                    json=PUBLISH,
                ),
                201,
            ).json()
            token = created["token"]
            public = "/api/shared-tower-plans/" + token
            invalid = "/api/shared-tower-plans/invalid_probe_" + uuid4().hex + "_bad"
            needles.extend(
                [
                    token.encode(),
                    hashlib.sha256(token.encode()).hexdigest().encode(),
                    public.encode(),
                    invalid.encode(),
                    invalid.rsplit("/", 1)[1].encode(),
                    ctx.a[1]["X-CSRF-Token"].encode(),
                ]
            )
            session = client.cookies.get(COOKIE)
            if session:
                needles.append(session.encode())
            phase = "publicread"
            checked(client.get(public, headers=signed("GET", public, ctx.a)), 200)
            phase = "publicerrors"
            invalid_response = checked(
                client.get(invalid, headers=signed("GET", invalid, ctx.a)), 404
            )
            checked(client.get(public, headers=signed("POST", public, ctx.a)), 403)
            checked(
                client.post(collection, headers=ctx.a[1], content=b"x" * 262145),
                413,
            )
            checked(client.post(collection, headers=ctx.a[1], json={}), 422)
            revoke = collection + "/" + created["id"]
            phase = "revoke"
            checked(
                client.request(
                    "DELETE",
                    revoke,
                    headers=signed("DELETE", revoke, ctx.a),
                    json={"expected_plan_revision": 1},
                ),
                204,
            )
            revoked = checked(
                client.get(public, headers=signed("GET", public, ctx.a)), 404
            )
            if revoked.content != invalid_response.content:
                pytest.fail("TEST child public404 mismatch", pytrace=False)
            phase = "budget"
            rate_key = hashlib.sha256(
                ("tower-share-read-1:" + ctx.rate_ip).encode()
            ).hexdigest()
            needles.append(rate_key.encode())
            with pg_engine.begin() as conn:
                conn.execute(
                    budgets.insert().values(
                        key_digest=rate_key,
                        started_at=sa.func.clock_timestamp(),
                        count=60,
                    )
                )
            rate_actor = (*ctx.a[:3], ctx.rate_ip)
            checked(client.get(public, headers=signed("GET", public, rate_actor)), 429)
            phase = "finish"
            if process.poll() is not None:
                pytest.fail("TEST child exited unexpectedly", pytrace=False)
    except (Exception, pytest.fail.Exception) as error:
        if isinstance(error, AttributeError):
            kind = "attribute"
        elif isinstance(error, TypeError):
            kind = "type"
        elif isinstance(error, ValueError):
            kind = "value"
        elif isinstance(error, httpx.HTTPError):
            kind = "http"
        elif isinstance(error, pytest.fail.Exception):
            kind = "gate"
        else:
            kind = "other"
        pytest.fail(
            f"TEST process HTTP gate failed [phase={phase}; class={kind}] (details withheld)",
            pytrace=False,
        )
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
        reader.join(timeout=5)
        process.stdout.close()
    if reader.is_alive() or overflow[0]:
        pytest.fail("TEST process capture incomplete or over budget", pytrace=False)
    if any(needle and needle in captured for needle in needles):
        pytest.fail(
            "TEST process log privacy gate failed (content withheld)", pytrace=False
        )


def test_test_process_unexpected500_and_started_error_log_redaction(share_context):
    # Synthetic failures in real Uvicorn/main pipeline. No issued bearer, fake
    # owner, PG outage, business GET or public rate-budget proof is implied.
    ctx = share_context
    before = secrets.token_urlsafe(32)
    after = secrets.token_urlsafe(32)
    if before == after:
        pytest.fail("Synthetic error selectors must differ", pytrace=False)
    with socket.socket() as reservation:
        try:
            reservation.bind(("127.0.0.1", 0))
            port = reservation.getsockname()[1]
        except OSError:
            pytest.fail("Ephemeral TEST error probe port unavailable", pytrace=False)
    base_url = f"http://127.0.0.1:{port}"
    before_path = "/api/shared-tower-plans/" + before
    after_path = "/api/shared-tower-plans/" + after
    environment = os.environ.copy()
    environment.update(
        {
            "UJ_TEST_SHARE_ERROR_PROBE": "1",
            "UJ_TEST_SHARE_ERROR_BEFORE_TOKEN": before,
            "UJ_TEST_SHARE_ERROR_AFTER_TOKEN": after,
        }
    )
    command = [sys.executable, "tests/tower_share_process_worker.py", str(port)]
    needles = {
        "before_token": before.encode(),
        "after_token": after.encode(),
        "before_url": before_path.encode(),
        "after_url": after_path.encode(),
        "before_digest": hashlib.sha256(before.encode()).hexdigest().encode(),
        "after_digest": hashlib.sha256(after.encode()).hexdigest().encode(),
        "note": NOTE.encode(),
        "csrf": ctx.a[1]["X-CSRF-Token"].encode(),
    }
    captured = bytearray()
    overflow = [False]
    eof_observed = [False]
    startup = Event()
    bound_message = f"Uvicorn running on {base_url} (".encode()
    try:
        process = subprocess.Popen(
            command,
            cwd=Path(__file__).resolve().parents[1],
            env=environment,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
    except Exception:
        pytest.fail(
            "TEST error child creation failed (details withheld)", pytrace=False
        )

    def drain():
        try:
            while chunk := process.stdout.read1(4096):
                remaining = 1048576 - len(captured)
                captured.extend(chunk[:remaining])
                if len(chunk) > remaining:
                    overflow[0] = True
                if (
                    not overflow[0]
                    and b"Application startup complete." in captured
                    and bound_message in captured
                ):
                    startup.set()
            eof_observed[0] = True
        except (OSError, ValueError):
            overflow[0] = True

    reader = Thread(target=drain, daemon=True)
    reader.start()

    def require_own_child(request):
        if not startup.is_set() or process.poll() is not None or overflow[0]:
            pytest.fail("Own TEST error child is not ready", pytrace=False)

    phase = "process_startup"
    failure_phase = None
    failure_class = None
    before_start_passed = False
    response_started_observed = False
    interrupted = False
    received = bytearray()
    http_error_class = None
    cleanup_failed = False
    forced_cleanup = False
    stop_sent = False
    try:
        with httpx.Client(
            base_url=base_url,
            timeout=5,
            follow_redirects=False,
            event_hooks={"request": [require_own_child]},
        ) as client:
            deadline = monotonic() + 10
            while monotonic() < deadline and process.poll() is None:
                if startup.wait(timeout=min(0.05, max(0, deadline - monotonic()))):
                    break
            remaining = deadline - monotonic()
            if not startup.is_set() or process.poll() is not None or remaining <= 0:
                pytest.fail("Own TEST error child startup failed", pytrace=False)
            ready = (
                client.get("/health", timeout=min(0.25, remaining)).status_code == 200
            )
            if not ready or process.poll() is not None or monotonic() >= deadline:
                pytest.fail("Own TEST error child health failed", pytrace=False)
            phase = "process_before_start_http"
            response = checked(
                client.get(before_path, headers=signed("GET", before_path, ctx.a)), 500
            )
            if response.content != b'{"detail":"Internal server error"}':
                pytest.fail("Unexpected500 body was not sanitized", pytrace=False)
            before_start_passed = True
            phase = "process_after_start_http"
            try:
                with client.stream(
                    "GET", after_path, headers=signed("GET", after_path, ctx.a)
                ) as stream:
                    response_started_observed = stream.status_code == 200
                    checked(stream, 200)
                    for chunk in stream.iter_bytes():
                        if len(received) + len(chunk) > 4096:
                            pytest.fail(
                                "TEST error stream exceeded bound", pytrace=False
                            )
                        received.extend(chunk)
            except httpx.RemoteProtocolError:
                interrupted = True
                http_error_class = "RemoteProtocolError"
            except httpx.ReadError:
                http_error_class = "ReadError"
                raise
            except httpx.HTTPError:
                http_error_class = "OtherHTTPError"
                raise
            # BaseHTTP may complete HTTP before raising app_exc to Uvicorn.
            # Interruption is diagnostic, not a substitute for graceful task/log drain.
            if received != b"data: synthetic-start\n\n":
                pytest.fail("TEST error stream chunk gate failed", pytrace=False)
            if process.poll() is not None:
                pytest.fail("Own TEST error child exited unexpectedly", pytrace=False)
    except (Exception, pytest.fail.Exception) as error:
        # Defer failure: privacy must be inspected even if the HTTP fixture fails.
        failure_phase = phase
        failure_class = "http" if isinstance(error, httpx.HTTPError) else "gate"
        if isinstance(error, httpx.HTTPError) and http_error_class is None:
            http_error_class = (
                "RemoteProtocolError"
                if isinstance(error, httpx.RemoteProtocolError)
                else "ReadError"
                if isinstance(error, httpx.ReadError)
                else "OtherHTTPError"
            )
    finally:
        try:
            process.stdin.write(b"STOP\n")
            process.stdin.flush()
            stop_sent = True
            process.stdin.close()
        except Exception:
            cleanup_failed = True
        try:
            # Cooperatively close listeners/connections and await worker tasks.
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                forced_cleanup = True
                process.kill()
                process.wait(timeout=5)
        except Exception:
            cleanup_failed = True
        try:
            reader.join(timeout=5)
            if not reader.is_alive():
                process.stdout.close()
        except Exception:
            cleanup_failed = True
    # Intentionally a privacy gate, NOT xfail/expected-leak characterization.
    # Retain every captured byte up to the bound, including sensitive error output.
    marker_hits = {
        category: bool(needle and needle in captured)
        for category, needle in needles.items()
    }
    capture_complete = eof_observed[0] and not (
        reader.is_alive() or overflow[0] or cleanup_failed
    )
    synthetic_error_reached = captured.count(b"TEST_SHARE_STREAM_ERROR_REACHED") == 1
    shutdown_timed_out = b"timeout graceful shutdown exceeded" in captured
    graceful_completed = (
        captured.count(b"WORKER_GRACEFUL_COMPLETED") == 1
        and process.returncode == 0
        and stop_sent
        and not forced_cleanup
        and not shutdown_timed_out
        and capture_complete
    )
    if any(marker_hits.values()):
        outcome = "process_after_start_logs_sensitive_metadata"
    elif not capture_complete:
        outcome = "process_capture_incomplete"
    elif not synthetic_error_reached or not graceful_completed:
        outcome = "process_graceful_completion_unproven"
    elif failure_phase is not None:
        outcome = failure_phase
    else:
        outcome = None
    if outcome is not None:
        # Closed-schema metadata only. Never include error text, values, bodies,
        # request objects, captured output or marker substrings in diagnostics.
        metadata = {
            "phase": outcome,
            "http_failure_phase": failure_phase,
            "failure_class": failure_class,
            "before_start_passed": before_start_passed,
            "response_started_observed": response_started_observed,
            "interrupted": interrupted,
            "received_len": len(received),
            "expected_chunk_match": received == b"data: synthetic-start\n\n",
            "http_error_class": http_error_class,
            "capture_complete": capture_complete,
            "synthetic_error_reached": synthetic_error_reached,
            "graceful_completed": graceful_completed,
            "forced_cleanup": forced_cleanup,
            "stop_sent": stop_sent,
            "worker_exit0": process.returncode == 0,
            "capture_eof": eof_observed[0],
            "shutdown_timed_out": shutdown_timed_out,
            "marker_hits": marker_hits,
        }
        pytest.fail(json.dumps(metadata, sort_keys=True), pytrace=False)
