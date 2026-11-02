"""Cooperative TEST-only Uvicorn worker; stdin control and fixed status markers."""

import os
import re
import sys
from pathlib import Path
from threading import Event, Thread


def require_test_runtime():
    value = os.environ.get("DATABASE_URL")
    if (
        os.environ.get("UJ_ENV") != "test"
        or not value
        or value != os.environ.get("TEST_DATABASE_URL")
    ):
        raise RuntimeError("Share worker requires the matched TEST environment")


def main():
    # Refuse before importing Uvicorn/probe/main or opening listeners/resources.
    require_test_runtime()
    if (
        len(sys.argv) != 2
        or re.fullmatch(r"[1-9][0-9]{0,4}", sys.argv[1], re.ASCII) is None
        or int(sys.argv[1]) > 65535
    ):
        raise RuntimeError("Share worker requires one numeric TEST port")
    # Direct script launch keeps tests/ for the probe and adds only this backend.
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from uvicorn import Config, Server

    config = Config(
        "tower_share_runtime_probe:app",
        host="127.0.0.1",
        port=int(sys.argv[1]),
        loop="asyncio",
        http="h11",
        access_log=False,
        timeout_graceful_shutdown=4,
    )
    server = Server(config)
    stop_requested = Event()
    control_failed = Event()

    def control():
        try:
            command = sys.stdin.buffer.readline(16)
            if command not in (b"STOP\n", b""):
                control_failed.set()
        except Exception:
            control_failed.set()
        stop_requested.set()
        server.should_exit = True

    Thread(target=control, daemon=True).start()
    try:
        server.run()
    except (Exception, SystemExit):
        print("WORKER_FAILED", flush=True)
        return 1
    if not stop_requested.is_set() or control_failed.is_set() or server.force_exit:
        print("WORKER_FAILED", flush=True)
        return 1
    # Server.run returned after its shutdown/task wait/lifespan completion.
    # Parent also requires its startup proof, exit0, EOF and no shutdown-timeout log.
    print("WORKER_GRACEFUL_COMPLETED", flush=True)
    return 0


if __name__ == "__main__":
    try:
        result = main()
    except Exception:
        print("WORKER_FAILED", flush=True)
        result = 1
    raise SystemExit(result)
