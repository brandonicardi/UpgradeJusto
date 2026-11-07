"""Project-local official Ollama runtime. No service registration or model swaps."""

import argparse
import json
import os
import socket
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
VERSION = "0.40.11"
MODEL = "qwen3:4b"
BASE = "http://127.0.0.1:11434"
RUNTIME = ROOT / ".local/ollama" / VERSION
MODELS = ROOT / ".local/ollama/models"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise RuntimeError("Local Ollama redirects are forbidden")


def request(path, body=None, timeout=5):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with opener.open(req, timeout=timeout) as response:
        data = response.read(1048577)
        if len(data) > 1048576:
            raise RuntimeError("Local Ollama metadata exceeded bound")
        return json.loads(data)


def start():
    executable = RUNTIME / "ollama.exe"
    if not executable.is_file():
        raise RuntimeError("Verified portable Ollama runtime is required")
    with socket.socket() as check:
        check.bind(("127.0.0.1", 11434))
    home = ROOT / ".local/ollama/home"
    directory = ROOT / ".local/ollama/processes" / uuid4().hex
    directory.mkdir(parents=True, exist_ok=False)
    home.mkdir(parents=True, exist_ok=True)
    MODELS.mkdir(parents=True, exist_ok=True)
    allowed = {"PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "PATHEXT"}
    environment = {key: value for key, value in os.environ.items() if key in allowed}
    environment.update(
        USERPROFILE=str(home),
        HOME=str(home),
        LOCALAPPDATA=str(home / "AppData/Local"),
        APPDATA=str(home / "AppData/Roaming"),
        OLLAMA_HOST="127.0.0.1:11434",
        OLLAMA_MODELS=str(MODELS),
        OLLAMA_NO_CLOUD="1",
        OLLAMA_NUM_PARALLEL="1",
        OLLAMA_MAX_LOADED_MODELS="1",
    )
    with (directory / "server.out.log").open("wb") as out, (
        directory / "server.err.log"
    ).open("wb") as err:
        process = subprocess.Popen(
            [str(executable), "serve"],
            cwd=RUNTIME,
            env=environment,
            stdin=subprocess.DEVNULL,
            stdout=out,
            stderr=err,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
    try:
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError("Owned Ollama process exited during startup")
            try:
                value = request("/api/version", timeout=1)
                if value.get("version") != VERSION:
                    raise RuntimeError("Unexpected local Ollama version")
                manifest = directory / "owned-process.json"
                manifest.write_text(
                    json.dumps(
                        {
                            "kind": "upgradejusto-ollama92-owned",
                            "pid": process.pid,
                            "executable": str(executable),
                            "version": VERSION,
                            "base_url": BASE,
                            "models_directory": str(MODELS),
                            "model": MODEL,
                        },
                        indent=2,
                    ),
                    encoding="utf-8",
                )
                print(json.dumps({"ready": True, "version": VERSION, "pid": process.pid, "manifest": str(manifest)}))
                return
            except (OSError, urllib.error.URLError):
                time.sleep(0.2)
        raise RuntimeError("Local Ollama startup deadline exceeded")
    except BaseException:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
        raise


def pull():
    if request("/api/version").get("version") != VERSION:
        raise RuntimeError("Expected pinned owned Ollama version")
    result = request("/api/pull", {"model": MODEL, "stream": False}, timeout=600)
    if result.get("status") != "success":
        raise RuntimeError("Bounded model pull did not complete")
    show()


def show():
    tags = request("/api/tags")
    selected = [row for row in tags.get("models", []) if row.get("name") == MODEL]
    if len(selected) != 1:
        raise RuntimeError("Expected single selected local model")
    row = selected[0]
    info = request("/api/show", {"model": MODEL})
    capabilities = info.get("capabilities", [])
    if "tools" not in capabilities:
        raise RuntimeError("Selected model does not advertise tools capability")
    print(json.dumps({"model": MODEL, "digest": row.get("digest"), "bytes": row.get("size"), "capabilities": capabilities, "details": row.get("details")}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("start", "pull", "show"))
    action = parser.parse_args().action
    try:
        {"start": start, "pull": pull, "show": show}[action]()
    except Exception:
        print(json.dumps({"action": action, "error": "local_ollama_operation_failed"}))
        raise SystemExit(1) from None
