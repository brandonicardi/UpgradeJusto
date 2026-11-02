"""TEST-only pre-mount log probe; never prints or persists captured server output."""

import hashlib
import http.client
import json
import os
import secrets
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 1024 * 1024


def status(url):
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            response.read(4096)
            return response.status
    except urllib.error.HTTPError as error:
        error.read(4096)
        return error.code


def probe(dev):
    # Values are disposable markers, NOT issued shares or stored credentials.
    marker = secrets.token_urlsafe(32)
    digest = hashlib.sha256(marker.encode("ascii")).hexdigest()
    processes, readers, captured = [], [], bytearray()
    lock = threading.Lock()
    truncated = False

    def collect(stream):
        nonlocal truncated
        try:
            while chunk := stream.read1(4096):
                with lock:
                    available = max(0, LIMIT - len(captured))
                    captured.extend(chunk[:available])
                    truncated = truncated or len(chunk) > available
        finally:
            stream.close()

    report = {"mode": "dev" if dev else "production", "ready": False}
    try:
        commands = [
            ([sys.executable, "-m", "uvicorn", "upgradejusto.main:app", "--host",
              "127.0.0.1", "--port", "8000", "--loop", "asyncio", "--http", "h11",
              "--no-proxy-headers", "--no-access-log"], ROOT / "backend"),
            (["node", str(ROOT / "frontend/server.mjs"), *(["--dev"] if dev else [])],
             ROOT / "frontend"),
        ]
        for command, cwd in commands:
            process = subprocess.Popen(
                command, cwd=cwd, env=os.environ.copy(), stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
            processes.append(process)
            reader = threading.Thread(target=collect, args=(process.stdout,), daemon=True)
            reader.start()
            readers.append(reader)
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            if any(process.poll() is not None for process in processes):
                raise RuntimeError("owned_server_exited")
            try:
                if status("http://127.0.0.1:8000/health") == 200 and status(
                    "http://127.0.0.1:3000/"
                ) == 200:
                    report["ready"] = True
                    break
            except (OSError, urllib.error.URLError, TimeoutError):
                pass
            time.sleep(0.2)
        if not report["ready"]:
            raise RuntimeError("startup_deadline")
        # Routes are intentionally not mounted: probe raw-path logging even on404.
        route = "/api/shared-tower-plans/" + marker
        report["backend_status"] = status("http://127.0.0.1:8000" + route)
        report["frontend_status"] = status("http://127.0.0.1:3000" + route)
        time.sleep(0.3)
    except (OSError, RuntimeError, http.client.HTTPException, subprocess.SubprocessError) as error:
        report["diagnostic_error"] = type(error).__name__
    finally:
        for process in reversed(processes):
            if process.poll() is None:
                subprocess.run(
                    ["taskkill.exe", "/PID", str(process.pid), "/T", "/F"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
                )
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                report["cleanup_failed"] = True
        for reader in readers:
            reader.join(timeout=5)
        report["capture_incomplete"] = any(reader.is_alive() for reader in readers)
        with lock:
            report.update(
                token_marker_logged=marker.encode("ascii") in captured,
                digest_marker_logged=digest.encode("ascii") in captured,
                output_truncated=truncated,
                output_bytes=len(captured),
            )
        # Never dump exceptions, commands, URLs, marker, digest or captured output.
        print(json.dumps(report))
    return report


def main():
    if (
        os.environ.get("UJ_ENV") != "test"
        or not os.environ.get("TEST_DATABASE_URL")
        or os.environ.get("DATABASE_URL") != os.environ["TEST_DATABASE_URL"]
    ):
        raise SystemExit("TEST environment required")
    if sys.argv[1:] not in (["--dev"], ["--production"]):
        raise SystemExit("Choose exactly --dev or --production")
    for port in (3000, 8000):
        with socket.socket() as listener:
            try:
                listener.bind(("127.0.0.1", port))
            except OSError:
                raise SystemExit("Required port occupied; no foreign process stopped")
    report = probe(sys.argv[1] == "--dev")
    passed = (
        report.get("ready") and report.get("backend_status") == 404
        and report.get("frontend_status") == 404
        and not any(report.get(key) for key in (
            "token_marker_logged", "digest_marker_logged", "output_truncated",
            "cleanup_failed", "diagnostic_error", "capture_incomplete",
        ))
    )
    raise SystemExit(0 if passed else 1)


if __name__ == "__main__":
    main()
