"""Create a NEW project-test account locally; explicit separate bootstrap, no PII output.

Run only after the helper loads DEV or dedicated TEST. Credentials stay beneath
the project's already ACL-restricted PostgreSQL directory; never overwrite them.
"""

import argparse
import json
import os
import secrets
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--create-project-test-account", action="store_true", required=True
    )
    parser.parse_args()
    from fastapi.testclient import TestClient
    from upgradejusto.main import app
    from upgradejusto.persistence.database import validate_database_url

    url = validate_database_url(os.environ.get("DATABASE_URL", ""))
    expected = {
        "upgradejusto_dev": "upgradejusto_dev_app",
        "upgradejusto_test": "upgradejusto_test_app",
    }
    if (
        url.host != "127.0.0.1"
        or url.port != 55433
        or url.query
        or url.database not in expected
        or url.username != expected[url.database]
        or os.environ.get("UJ_ENV") not in {"dev", "test"}
    ):
        raise ValueError("Refuse non-project local target")
    destination = ROOT / ".local/postgresql" / f"admin-demo-{url.database}.json"
    if destination.exists():
        raise ValueError(
            "Demo credentials already exist; never replace or choose another account automatically"
        )
    credentials = {
        "email": f"cu10-demo-{uuid4().hex}@example.test",
        "password": secrets.token_urlsafe(24),
    }
    # Registration setup must not trigger global recovery of unrelated pending turns.
    os.environ.pop("UJ_ASSISTANT_EXCLUSIVE_STARTUP", None)
    source = f"127.61.{secrets.randbelow(253) + 1}.{secrets.randbelow(253) + 1}"
    with TestClient(
        app, base_url=os.environ["UJ_ORIGIN"], client=(source, 50000)
    ) as client:
        csrf = client.get("/api/auth/csrf")
        csrf.raise_for_status()
        registered = client.post(
            "/api/auth/register",
            json=credentials,
            headers={
                "Origin": os.environ["UJ_ORIGIN"],
                "X-CSRF-Token": csrf.json()["csrf_token"],
            },
        )
        if registered.status_code != 201:
            raise RuntimeError("New project-test registration failed")
    with destination.open("x", encoding="utf-8") as file:
        json.dump(credentials, file)
    result = subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/bootstrap-admin.py"),
            "--email",
            credentials["email"],
            "--confirm-project-test-account",
        ],
        capture_output=True,
        timeout=20,
    )
    if result.returncode:
        raise RuntimeError(
            "Account created; bootstrap failed, inspect only local credentials and rerun explicitly"
        )
    print(
        "New project-test admin prepared; credentials remain in protected local project directory"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(
            f"Admin demo preparation failed ({type(error).__name__}); no private values displayed"
        )
        raise SystemExit(1) from None
