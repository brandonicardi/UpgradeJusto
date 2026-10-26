"""Explicit local publication through CU10, using a server-authenticated test admin."""

import argparse
import hashlib
import json
import os
import sys
from dataclasses import replace
from pathlib import Path
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--publish-project-catalog", action="store_true", required=True)
    parser.parse_args()
    import sqlalchemy as sa
    from fastapi.testclient import TestClient

    from upgradejusto.administration.repository import AdministrationRepository
    from upgradejusto.administration.service import AdministrationService
    from upgradejusto.catalog_import.executor import ImportExecutor, active_snapshot
    from upgradejusto.catalog_import.proposal import build_proposal, digest
    from upgradejusto.compatibility.basic_manufacturer import SUPPLEMENTAL_SOURCES
    from upgradejusto.main import app
    from upgradejusto.persistence.runtime import runtime_engine
    from upgradejusto.persistence.schema import components

    engine = runtime_engine()
    expected = {
        "upgradejusto_dev": "upgradejusto_dev_app",
        "upgradejusto_test": "upgradejusto_test_app",
    }
    if (
        engine.url.host != "127.0.0.1"
        or engine.url.port != 55433
        or engine.url.database not in expected
        or engine.url.username != expected[engine.url.database]
        or engine.url.query
        or os.environ.get("UJ_ENV") not in {"dev", "test"}
    ):
        raise ValueError("Refuse non-project publication")
    credentials = json.loads(
        (
            ROOT / ".local/postgresql" / f"admin-demo-{engine.url.database}.json"
        ).read_text()
    )
    if not credentials["email"].endswith("@example.test"):
        raise ValueError("Refuse non-project-test identity")
    os.environ.pop("UJ_ASSISTANT_EXCLUSIVE_STARTUP", None)
    origin = os.environ["UJ_ORIGIN"]
    service = AdministrationService(AdministrationRepository(engine))
    sample_path = ROOT / "backend/data/hardware-import/raw-sample.json"
    raw = sample_path.read_bytes()
    checksum = hashlib.sha256(raw).hexdigest()
    sample = json.loads(raw)
    envelope_checksum = digest(sample)
    stage = "login"
    try:
        with TestClient(app, base_url=origin, client=("127.74.21.87", 50000)) as client:

            def post(path, body=None):
                csrf = client.get("/api/auth/csrf")
                if csrf.status_code != 200:
                    raise RuntimeError("CSRF unavailable")
                return client.post(
                    path,
                    json=body,
                    headers={
                        "Origin": origin,
                        "X-CSRF-Token": csrf.json()["csrf_token"],
                    },
                )

            if post("/api/auth/login", credentials).status_code != 200:
                raise RuntimeError("Test admin login rejected")
            identity = client.get("/api/auth/session")
            if (
                identity.status_code != 200
                or client.get("/api/admin/revisions").status_code != 200
            ):
                raise RuntimeError("Server admin role rejected")
            owner = UUID(identity.json()["id"])
            try:
                stage = "snapshot"
                version, current, _ = active_snapshot(service, owner)
                with engine.connect() as conn:
                    prior = [
                        dict(r)
                        for r in conn.execute(
                            sa.select(components).where(
                                components.c.dataset_version == version
                            )
                        ).mappings()
                    ]
                stage = "proposal"
                proposal = build_proposal(
                    sample, current, expected_sample_sha256=envelope_checksum
                )
                dataset_source_count = len(proposal.sources)
                proposal = replace(
                    proposal, sources=proposal.sources + tuple(SUPPLEMENTAL_SOURCES)
                )
                stage = "publish"
                result = ImportExecutor(service).publish(owner, version, proposal)
                stage = "repeat"
                new_version, updated, _ = active_snapshot(service, owner)
                again = build_proposal(
                    sample, updated, expected_sample_sha256=envelope_checksum
                )
                again = replace(
                    again, sources=again.sources + tuple(SUPPLEMENTAL_SOURCES)
                )
                repeated = ImportExecutor(service).publish(owner, new_version, again)
                if repeated["status"] != "unchanged":
                    raise RuntimeError("Repeated import changed active catalog")
                with engine.connect() as conn:
                    after = [
                        dict(r)
                        for r in conn.execute(
                            sa.select(components).where(
                                components.c.dataset_version == version
                            )
                        ).mappings()
                    ]
                if sorted(prior, key=lambda r: r["id"]) != sorted(
                    after, key=lambda r: r["id"]
                ):
                    raise RuntimeError("Prior catalog snapshot changed")
                report = {
                    "database": engine.url.database,
                    "previous_version": version,
                    "dataset_version": new_version,
                    "status": result["status"],
                    "repeat_status": repeated["status"],
                    "sample_sha256": checksum,
                    "import_digest": proposal.import_digest,
                    "proposed_components": len(proposal.components),
                    "source_records": len(proposal.sources),
                    "dataset_source_records": dataset_source_count,
                    "prior_snapshot_unchanged": True,
                    "targets": proposal.report["targets"],
                }
                folder = ROOT / ".local/evidence/cu05-cu06-scope-v1"
                folder.mkdir(parents=True, exist_ok=True)
                (folder / f"import-publication-{engine.url.database}.json").write_text(
                    json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
                )
                print(
                    json.dumps(
                        {
                            "database": engine.url.database,
                            "status": result["status"],
                            "repeat_status": repeated["status"],
                            "proposed_components": len(proposal.components),
                            "dataset_source_records": dataset_source_count,
                            "manufacturer_source_records": len(SUPPLEMENTAL_SOURCES),
                            "prior_snapshot_unchanged": True,
                        }
                    )
                )
            finally:
                preceding_stage = stage
                if post("/api/auth/logout").status_code != 204:
                    stage = "logout"
                    raise RuntimeError("Test admin session cleanup failed")
                stage = preceding_stage
    except Exception as error:
        print(
            f"Local publication blocked stage={stage} class={type(error).__name__}; no credentials displayed"
        )
        raise SystemExit(1) from None


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(
            f"Publication setup blocked class={type(error).__name__}; no private values displayed"
        )
        raise SystemExit(1) from None
