"""Prepared PG-only focal gate. Run through the existing guarded test wrapper."""

import pytest
from test_cu02_cu10_postgres import (
    ADMIN,
    canonical_bytes,
    collection,
    revision,
)
from test_cu02_cu10_postgres import (
    admin_actors as admin_actors,
)
from test_pcs_postgres import actors as actors
from test_pcs_postgres import create
from test_plans_postgres import GROUPS, save
from test_plans_postgres import plan_actors as plan_actors
from test_shares_postgres import publish

from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService
from upgradejusto.compatibility.application import resolve_configuration
from upgradejusto.compatibility.http_models import EvaluatedConfiguration


@pytest.mark.parametrize("edit", ["attributes", "source_metadata"])
def test_published_attributes_invalidate_capacity_without_rewriting_snapshots(
    admin_actors, pg_engine, edit
):
    a, b = admin_actors
    pc = create(
        a,
        components=[
            *GROUPS,
            {"category": "gpu", "component_id": "P06", "quantity": 1},
            {"category": "psu", "component_id": "P07", "quantity": 1},
            {"category": "case", "component_id": "P09", "quantity": 1},
        ],
        context={"bios_version": "P2.30", "notes": "PRIVATE"},
    )
    plan = save(a, pc, objective="general")
    assert plan["benefit"]["status"] == "supported"
    _, token = publish(a, plan)
    old_plan = canonical_bytes(a[0].get(f"/api/plans/{plan['id']}").json())
    old_share = canonical_bytes(a[0].get(f"/api/shared-plans/{token}").json())
    path = f"/api/pcs/{pc['id']}/recommendations/preview"
    payload = {
        "expected_pc_revision": 1,
        "objective": "general",
        "budget_ars": "766417.98",
        "alternatives": [
            {
                "key": "ram",
                "replacements": [
                    {
                        "category": "ram",
                        "candidates": [{"component_id": "P05", "quantity": 2}],
                    }
                ],
            }
        ],
    }
    response = a[0].post(path, headers=a[1], json=payload)
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["benefit"]["status"] == "supported"
    assert item["cost"]["total_ars"] == "766417.98"
    assert item["status"] == "requires_verification"
    assert item["evaluation"]["rules_version"] == "cu05-basic-stock-engine-1"
    assert b[0].post(path, headers=b[1], json=payload).status_code == 404
    base = PostgresCatalogRepository(pg_engine).dataset_version
    draft = revision(a, base)
    if edit == "attributes":
        ram = next(r for r in collection(a, draft, "components") if r["id"] == "P05")
        attrs = {**ram["data"]["attributes"], "capacity_per_module": None}
        assert (
            a[0]
            .patch(
                f"{ADMIN}/{draft}/components/P05",
                headers=a[1],
                json={"data": {"attributes": attrs}},
            )
            .status_code
            == 200
        )
    else:
        source = next(
            r
            for r in collection(a, draft, "sources")
            if r["data"]["source_id"] == "F05"
        )
        assert (
            a[0]
            .patch(
                f"{ADMIN}/{draft}/sources/{source['id']}",
                headers=a[1],
                json={
                    "data": {"locator": "SYNTHETIC changed source, no longer curated"}
                },
            )
            .status_code
            == 200
        )
    assert (
        a[0]
        .post(
            f"{ADMIN}/{draft}/publish",
            headers=a[1],
            json={"expected_active_version": base},
        )
        .status_code
        == 200
    )
    response = a[0].post(path, headers=a[1], json=payload)
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["benefit"]["status"] == "unknown"
    assert item["evaluation"]["data_revision"].startswith(draft + "|")
    assert any(p.endswith(".capacity_gb") for p in item["missing_fields"])
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc
    assert canonical_bytes(a[0].get(f"/api/plans/{plan['id']}").json()) == old_plan
    assert canonical_bytes(a[0].get(f"/api/shared-plans/{token}").json()) == old_share
    assert "PRIVATE" not in old_share.decode()
    # New share after invalidation uses the new pinned revision, not seed evidence
    # for edited RAM.
    new_plan = save(a, pc, objective="general")
    assert new_plan["benefit"]["status"] == "unknown"
    _, new_token = publish(a, new_plan)
    new_public = a[0].get(f"/api/shared-plans/{new_token}").json()
    assert new_public["benefit"] == {"status": "unknown", "evidence": []}
    stage = new_public["stages"][0]
    assert stage["evaluation"]["data_revision"].startswith(draft + "|")
    assert stage["evaluation"]["rules_version"] == "cu05-basic-stock-engine-1"
    assert "PRIVATE" not in canonical_bytes(new_public).decode()
    assert canonical_bytes(a[0].get(f"/api/plans/{plan['id']}").json()) == old_plan
    assert canonical_bytes(a[0].get(f"/api/shared-plans/{token}").json()) == old_share


@pytest.mark.parametrize("edit", ["attributes", "source_metadata"])
def test_resource_resolver_uses_published_board_envelope_and_keeps_pc_immutable(
    admin_actors, pg_engine, edit
):
    a, _ = admin_actors
    pc = create(
        a,
        components=GROUPS,
        context={
            "bios_version": "P2.30",
            "notes": "PCIE1 occupied, SATA empty is NOT structured context",
        },
    )
    configuration = EvaluatedConfiguration.model_validate(
        {
            "components": pc["components"],
            "context": pc["context"],
        }
    )
    repository = PostgresCatalogRepository(pg_engine)
    base = repository.dataset_version
    before = resolve_configuration(
        configuration, CatalogService(repository).resolution_snapshot(), 1, base
    )
    assert len(before.resources.pcie.slots) == 1
    assert len(before.resources.front.headers) == 5
    assert before.resources.storage.devices is None
    draft = revision(a, base)
    if edit == "attributes":
        board = next(r for r in collection(a, draft, "components") if r["id"] == "P03")
        change = {"attributes": {**board["data"]["attributes"], "form_factor": None}}
        path = f"{ADMIN}/{draft}/components/P03"
    else:
        source = next(
            r
            for r in collection(a, draft, "sources")
            if r["data"]["source_id"] == "F03"
        )
        change = {"locator": "SYNTHETIC edited board evidence"}
        path = f"{ADMIN}/{draft}/sources/{source['id']}"
    assert a[0].patch(path, headers=a[1], json={"data": change}).status_code == 200
    assert (
        a[0]
        .post(
            f"{ADMIN}/{draft}/publish",
            headers=a[1],
            json={"expected_active_version": base},
        )
        .status_code
        == 200
    )
    repository = PostgresCatalogRepository(pg_engine)
    after = resolve_configuration(
        configuration,
        CatalogService(repository).resolution_snapshot(),
        1,
        repository.dataset_version,
    )
    assert after.data_revision.startswith(draft + "|")
    assert after.resources.pcie.slots == ()
    assert after.resources.front.headers == ()
    assert after.resources.storage.ports == ()
    assert after.resources.power.assignments is None
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc
