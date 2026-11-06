"""Real PG focal: CU10 roles, atomic publication, immutable old snapshot, no-op.

Requires CORE basic_stock_v1 admission. The surrounding transaction is rolled back;
never restores the old active pointer by publishing/updating an old revision.
"""

import json
import uuid
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace

import pytest
import sqlalchemy as sa

from upgradejusto.administration.repository import AdministrationRepository
from upgradejusto.administration.service import AdministrationService
from upgradejusto.administration.tables import revisions, roles, rows
from upgradejusto.catalog_import.executor import ImportExecutor, active_snapshot
from upgradejusto.catalog_import.proposal import build_proposal
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import components, users


@pytest.mark.parametrize("legacy_cores", [None, "8", "edited unknown cores"])
def test_real_pg_import_publication_isolation_and_idempotence(pg_engine, legacy_cores):
    assert pg_engine.dialect.name == "postgresql"
    with pg_engine.connect() as conn:
        transaction = conn.begin()

        class TransactionEngine:
            @contextmanager
            def begin(self):
                with conn.begin_nested():
                    yield conn

        try:
            owner = uuid.uuid4()
            conn.execute(
                users.insert().values(
                    id=owner,
                    email=f"import-{owner}@example.invalid",
                    password_hash="synthetic-not-login",
                )
            )
            conn.execute(roles.insert().values(user_id=owner, role="admin"))
            service = AdministrationService(
                AdministrationRepository(TransactionEngine())
            )
            with pytest.raises(PCError) as denied:
                active_snapshot(service, uuid.uuid4())
            assert denied.value.status == 403
            version, current, _ = active_snapshot(service, owner)
            if legacy_cores is not None:
                # An explicit CU10 curation change, not merely an in-memory input:
                # the conflict must survive a real active snapshot publication.
                draft = service.create(owner, SimpleNamespace(base_version=version))[
                    "id"
                ]
                edited = dict(
                    current["P01"],
                    attributes={**current["P01"]["attributes"], "cores": legacy_cores},
                )
                service.write(owner, draft, "components", data=edited, row_id="P01")
                service.publish(
                    owner, draft, SimpleNamespace(expected_active_version=version)
                )
                version, current, _ = active_snapshot(service, owner)
            old_rows = (
                conn.execute(
                    sa.select(components).where(components.c.dataset_version == version)
                )
                .mappings()
                .all()
            )
            path = (
                Path(__file__).resolve().parents[1]
                / "data/hardware-import/raw-sample.json"
            )
            sample = json.loads(path.read_text(encoding="utf-8"))
            proposal = build_proposal(sample, current)
            assert proposal.components
            result = ImportExecutor(service).publish(owner, version, proposal)
            # The test database is persistent: when the sample is already imported in
            # the active revision, publishing is a no-op (the legacy_cores variants
            # always force a real publication, covering the isolation of old rows).
            if legacy_cores is not None or result.get("status") != "unchanged":
                assert result["dataset_version"] != version
            else:
                assert result["dataset_version"] == version
            assert (
                conn.execute(
                    sa.select(components).where(components.c.dataset_version == version)
                )
                .mappings()
                .all()
                == old_rows
            )
            count = conn.scalar(sa.select(sa.func.count()).select_from(revisions))
            row_count = conn.scalar(sa.select(sa.func.count()).select_from(rows))
            new_version, updated, _ = active_snapshot(service, owner)
            again = build_proposal(sample, updated)
            assert again.as_dict() == proposal.as_dict()
            if legacy_cores is not None:
                metadata = json.loads(updated["P01"]["attributes"]["basic_stock_v1"])
                expected_legacy = 8 if legacy_cores == "8" else legacy_cores
                assert metadata["data"]["cores"] is None
                assert {
                    v["source"]
                    for v in metadata["conflicts"]["cores"]
                    if v["value"] == expected_legacy
                } == {"F01"}
                changed_sources = json.loads(json.dumps(updated))
                imported = next(
                    r
                    for r in changed_sources["P01"]["sources"]
                    if r["id"].startswith("hw-")
                )
                imported["url"] += "/changed"
                with pytest.raises(
                    ValueError, match="Imported source identity changed"
                ):
                    build_proposal(sample, changed_sources)
            assert (
                ImportExecutor(service).publish(owner, new_version, again)["status"]
                == "unchanged"
            )
            assert (
                conn.scalar(sa.select(sa.func.count()).select_from(revisions)) == count
            )
            assert (
                conn.scalar(sa.select(sa.func.count()).select_from(rows)) == row_count
            )
            if (
                new_version != version
            ):  # a stale base only exists after a real publication
                with pytest.raises(ValueError, match="Active revision changed"):
                    ImportExecutor(service).publish(owner, version, proposal)
        finally:
            transaction.rollback()
