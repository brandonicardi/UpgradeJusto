"""Focused real-PG/API stock gate; own accounts and CU10 atomic publication only."""

import json
from pathlib import Path

import pytest
from test_cu02_cu10_postgres import ADMIN, collection, revision
from test_cu02_cu10_postgres import admin_actors as admin_actors
from test_pcs_postgres import actors as actors
from test_pcs_postgres import create
from test_plans_postgres import plan_actors as plan_actors
from test_plans_postgres import save
from test_shares_postgres import publish as share_plan

from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog_import.proposal import build_proposal
from upgradejusto.compatibility.basic_manufacturer import SUPPLEMENTAL_SOURCES


def publish_revision(actor, draft, expected):
    response = actor[0].post(
        f"{ADMIN}/{draft}/publish",
        headers=actor[1],
        json={"expected_active_version": expected},
    )
    assert response.status_code == 200, response.text


@pytest.fixture
def stock_published(admin_actors, pg_engine):
    # admin_actors restores the original pointer and removes only its own role;
    # plan_actors/actors clean their own plans, shares, PCs, sessions and accounts.
    a, b = admin_actors
    active = PostgresCatalogRepository(pg_engine).dataset_version
    draft = revision(a, active)
    component_rows = {
        row["id"]: row["data"] for row in collection(a, draft, "components")
    }
    path = Path(__file__).resolve().parents[1] / "data/hardware-import/raw-sample.json"
    proposal = build_proposal(
        json.loads(path.read_text(encoding="utf-8")), component_rows
    )
    existing = {
        (row["data"]["source_id"], row["data"]["url"]): row
        for row in collection(a, draft, "sources")
    }
    for source in (*proposal.sources, *SUPPLEMENTAL_SOURCES):
        previous = existing.get((source["source_id"], source["url"]))
        if previous is None:
            response = a[0].post(
                f"{ADMIN}/{draft}/sources", headers=a[1], json={"data": source}
            )
            assert response.status_code == 201, response.text
        else:
            response = a[0].patch(
                f"{ADMIN}/{draft}/sources/{previous['id']}",
                headers=a[1],
                json={"data": source},
            )
            assert response.status_code == 200, response.text
    for identity, data in proposal.components.items():
        response = a[0].patch(
            f"{ADMIN}/{draft}/components/{identity}", headers=a[1], json={"data": data}
        )
        assert response.status_code == 200, response.text
    publish_revision(a, draft, active)
    assert PostgresCatalogRepository(pg_engine).dataset_version == draft
    return a, b, draft


def groups(second=False, negative=False):
    identities = (
        ("P02", "P03", "P05", "P16" if negative else "P06", "P08", "P10")
        if second
        else ("P01", "P03", "P04", "P06", "P07", "P09")
    )
    return [
        {
            "category": category,
            "component_id": identity,
            "quantity": 2 if category == "ram" else 1,
        }
        for category, identity in zip(
            ("cpu", "motherboard", "ram", "gpu", "psu", "case"), identities, strict=True
        )
    ]


def evaluate(actor, pc, **extra):
    response = actor[0].post(
        f"/api/pcs/{pc['id']}/compatibility/evaluate",
        headers=actor[1],
        json={"expected_pc_revision": pc["revision"], **extra},
    )
    assert response.status_code == 200, response.text
    return response.json()


def replacement(category, identity, quantity=1):
    return {
        "category": category,
        "candidates": [{"component_id": identity, "quantity": quantity}],
    }


def preview(actor, pc, replacements, budget):
    response = actor[0].post(
        f"/api/pcs/{pc['id']}/recommendations/preview",
        headers=actor[1],
        json={
            "expected_pc_revision": pc["revision"],
            "objective": "general",
            "budget_ars": budget,
            "alternatives": [{"key": "upgrade", "replacements": replacements}],
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["items"][0]


def test_stock_scope_api_recommendations_and_pinned_snapshots_real_pg(
    stock_published, pg_engine
):
    a, b, version = stock_published
    pcs = [
        create(
            a,
            components=groups(second),
            context={"bios_version": "P2.30", "notes": "PRIVATE-STOCK-TEST"},
        )
        for second in (False, True)
    ]
    for pc in pcs:
        result = evaluate(a, pc)
        assert result["verdict"] == "compatible" and result["coverage"]["complete"]
        assert result["coverage"]["required"] == [f"B{i:02}" for i in range(1, 8)]
        assert result["scope"]["id"] == "cu05-basic-stock-1"
        assert (
            result["scope"]["assumptions"]
            and result["scope"]["excludes"]
            and result["warnings"]
        )
        assert {check["id"] for check in result["additional_checks"]} >= {
            "B08",
            "B09",
            "cpu_stock_cooling",
        }
    unknown_pc = create(
        a, components=groups(True), context={"bios_version": None, "notes": None}
    )
    unknown = evaluate(a, unknown_pc)
    assert unknown["verdict"] == "requiere_verificacion"
    assert "cpu_support.installed_bios" in unknown["missing_fields"]
    negative_pc = create(
        a, components=groups(True, True), context={"bios_version": None, "notes": None}
    )
    negative = evaluate(a, negative_pc)
    assert (
        negative["verdict"] == "incompatible"
        and "B04" in negative["coverage"]["failed"]
    )
    assert "cpu_support.installed_bios" in negative["missing_fields"]
    ram = [replacement("ram", "P05", 2)]
    item = preview(a, pcs[0], ram, "1000000")
    assert item["status"] == "recommended" and item["cost"]["total_ars"] == "766417.98"
    assert item["benefit"]["status"] == "supported"
    low = preview(a, pcs[0], ram, "700000")
    assert low["status"] == "rejected" and low["cost"]["within_budget"] is False
    combo = preview(
        a, pcs[0], [replacement("psu", "P08"), replacement("gpu", "P15")], "2000000"
    )
    assert combo["status"] == "recommended" and combo["cost"]["total_ars"] == "1882130"
    assert combo["benefit"]["status"] == "supported"
    assert (
        preview(a, pcs[0], [replacement("gpu", "P15")], "2000000")["status"]
        == "rejected"
    )
    root = f"/api/pcs/{pcs[0]['id']}/compatibility/evaluate"
    for extra in (
        {"scope": {"id": "disabled"}},
        {"checks": []},
        {"owner_id": str(b[2])},
    ):
        assert (
            a[0]
            .post(root, headers=a[1], json={"expected_pc_revision": 1, **extra})
            .status_code
            == 422
        )
    assert (
        b[0].post(root, headers=b[1], json={"expected_pc_revision": 1}).status_code
        == 404
    )
    assert b[0].get(ADMIN).status_code == 403
    plan = save(a, pcs[0], objective="general", budget_ars="1000000")
    assert plan["status"] == "ready"
    publication, token = share_plan(a, plan)
    plan_path, public_path = f"/api/plans/{plan['id']}", f"/api/shared-plans/{token}"
    plan_before, public_before = a[0].get(plan_path), a[0].get(public_path)
    assert plan_before.status_code == public_before.status_code == 200
    shared = public_before.json()["stages"][0]["evaluation"]
    assert shared["scope"] == plan["stages"][0]["evaluation"]["scope"]
    assert shared["warnings"] and {
        check["id"] for check in shared["additional_checks"]
    } >= {"B08", "B09"}
    assert "PRIVATE-STOCK-TEST" not in public_before.text
    assert b[0].get(plan_path).status_code == 404
    assert (
        b[0].delete(f"{plan_path}/shares/{publication['id']}", headers=b[1]).status_code
        == 404
    )
    # Remove ONLY a policy source in a NEW revision. Never mutate the old dataset,
    # stored plan, publication or share. An old share remains pinned to its version.
    draft = revision(a, version)
    source = next(
        row
        for row in collection(a, draft, "sources")
        if row["data"]["source_id"] == "BASIC-AMD-5900X-REF-1"
    )
    for row in collection(a, draft, "components"):
        data = row["data"]
        retained = [
            ref for ref in data["sources"] if ref["id"] != "BASIC-AMD-5900X-REF-1"
        ]
        if len(retained) != len(data["sources"]):
            response = a[0].patch(
                f"{ADMIN}/{draft}/components/{row['id']}",
                headers=a[1],
                json={"data": {**data, "sources": retained}},
            )
            assert response.status_code == 200, response.text
    response = a[0].delete(f"{ADMIN}/{draft}/sources/{source['id']}", headers=a[1])
    assert response.status_code == 204
    publish_revision(a, draft, version)
    assert PostgresCatalogRepository(pg_engine).dataset_version == draft
    missing_policy = evaluate(a, pcs[0])
    assert missing_policy["verdict"] == "requiere_verificacion"
    assert "gpu.psu_reference_cpu_tdp_class_w" in missing_policy["missing_fields"]
    assert a[0].get(plan_path).content == plan_before.content
    assert a[0].get(public_path).content == public_before.content
    for pc in (*pcs, unknown_pc, negative_pc):
        assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc


@pytest.mark.parametrize("identity,label", [("P01", "cpu"), ("P03", "motherboard")])
def test_published_socket_conflict_blocks_new_evaluation_preserves_old_bytes(
    stock_published, identity, label
):
    a, _, version = stock_published
    pc = create(
        a, components=groups(), context={"bios_version": "P2.30", "notes": None}
    )
    assert evaluate(a, pc)["verdict"] == "compatible"
    plan = save(a, pc, objective="general", budget_ars="1000000")
    _, token = share_plan(a, plan)
    plan_path, public_path = f"/api/plans/{plan['id']}", f"/api/shared-plans/{token}"
    old_plan, old_share = a[0].get(plan_path), a[0].get(public_path)
    assert old_plan.status_code == old_share.status_code == 200
    draft = revision(a, version)
    row = next(
        item for item in collection(a, draft, "components") if item["id"] == identity
    )
    data = row["data"]
    metadata = json.loads(data["attributes"]["basic_stock_v1"])
    source_id = metadata["fields"]["socket"][0]
    metadata["data"]["socket"] = None
    metadata["conflicts"]["socket"] = [
        {"value": "AM4", "source": source_id},
        {"value": "AM5", "source": source_id},
    ]
    attributes = {
        **data["attributes"],
        "basic_stock_v1": json.dumps(metadata, separators=(",", ":")),
    }
    changed = a[0].patch(
        f"{ADMIN}/{draft}/components/{identity}",
        headers=a[1],
        json={"data": {**data, "attributes": attributes}},
    )
    assert changed.status_code == 200, changed.text
    publish_revision(a, draft, version)
    result = evaluate(a, pc)
    assert result["data_revision"].startswith(draft + "|")
    assert result["verdict"] == "requiere_verificacion"
    missing = f"cpu_support.{label}_socket_source_conflict"
    assert missing in result["missing_fields"]
    assert result["rule_results"][0]["state"] == "unknown"
    failed = a[0].post(
        f"/api/pcs/{pc['id']}/compatibility/simulate",
        headers=a[1],
        json={
            "expected_pc_revision": 1,
            **replacement("motherboard", "P03"),
            "candidate_context": {"bios_version": "P1.20"},
        },
    )
    assert failed.status_code == 200, failed.text
    assert failed.json()["verdict"] == "incompatible"
    assert failed.json()["rule_results"][0]["state"] == "fail"
    assert missing in failed.json()["missing_fields"]
    assert a[0].get(plan_path).content == old_plan.content
    assert a[0].get(public_path).content == old_share.content
    assert a[0].get(f"/api/pcs/{pc['id']}").json() == pc
