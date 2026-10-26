"""Real TEST-PG/session gates; requires explicit router wiring by main's owner."""

import json
from pathlib import Path
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from test_basic_stock_pg import groups
from test_cu02_cu10_postgres import ADMIN, revision
from test_cu02_cu10_postgres import admin_actors as admin_actors
from test_pcs_postgres import ORIGIN, create
from test_pcs_postgres import actors as actors
from test_plans_postgres import plan_actors as plan_actors
from test_plans_postgres import save
from test_shares_postgres import publish as share_plan

from upgradejusto.administration.tables import active
from upgradejusto.administration.validation import materialize
from upgradejusto.api.tower_compatibility import service
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService
from upgradejusto.catalog_import.proposal import build_proposal
from upgradejusto.compatibility.basic_manufacturer import SUPPLEMENTAL_SOURCES
from upgradejusto.compatibility.tower_application import (
    TowerCompatibilityService,
    TowerEvaluationRepository,
)
from upgradejusto.main import app
from upgradejusto.pcs.tower_tables import configurations, lines
from upgradejusto.persistence.schema import pcs
from upgradejusto.retail.tables import resources


def all_revision_rows(actor, draft, collection):
    """Fixture lookup is exhaustive, never a first100 existence check."""
    result = []
    total = None
    while total is None or len(result) < total:
        response = actor[0].get(
            f"{ADMIN}/{draft}/{collection}",
            params={"limit": 100, "offset": len(result)},
        )
        assert response.status_code == 200, response.text
        page = response.json()
        if total is None:
            total = page["total"]
        assert page["total"] == total, "Fixture revision changed during pagination"
        assert page["items"] or len(result) == total
        result.extend(page["items"])
    assert len(result) == total
    assert len({row["id"] for row in result}) == total
    return result


def resource_snapshot(conn, version, identities=None):
    statement = sa.select(resources).where(resources.c.dataset_version == version)
    if identities is not None:
        statement = statement.where(resources.c.component_id.in_(identities))
    # Compare content independent of the publication identity or row order.
    return sorted(
        json.dumps(
            {key: value for key, value in row.items() if key != "dataset_version"},
            sort_keys=True,
            default=str,
        )
        for row in conn.execute(statement).mappings()
    )


@pytest.fixture
def stock_published(admin_actors, pg_engine):
    """Own full-catalog revision; preserves current691 and its resource evidence."""
    a, b = admin_actors
    original_repository = PostgresCatalogRepository(pg_engine)
    original = original_repository.dataset_version
    original_ids = {part.id for part in original_repository.all()}
    with pg_engine.connect() as conn:
        original_resources = resource_snapshot(conn, original)
    draft = revision(a, original)
    component_rows = {
        row["id"]: row["data"] for row in all_revision_rows(a, draft, "components")
    }
    assert set(component_rows) == original_ids
    path = Path(__file__).resolve().parents[1] / "data/hardware-import/raw-sample.json"
    proposal = build_proposal(
        json.loads(path.read_text(encoding="utf-8")), component_rows
    )
    source_rows = all_revision_rows(a, draft, "sources")
    existing = {
        (row["data"]["source_id"], row["data"]["url"]): row for row in source_rows
    }
    assert len(existing) == len(source_rows), "Base revision has duplicate source refs"
    for source in (*proposal.sources, *SUPPLEMENTAL_SOURCES):
        key = (source["source_id"], source["url"])
        previous = existing.get(key)
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
        existing[key] = response.json()
    for identity, data in proposal.components.items():
        response = a[0].patch(
            f"{ADMIN}/{draft}/components/{identity}",
            headers=a[1],
            json={"data": data},
        )
        assert response.status_code == 200, response.text
    entries = [
        {"collection": collection, **row}
        for collection in ("components", "sources", "prices", "cpu_support")
        for row in all_revision_rows(a, draft, collection)
    ]
    # Same production validator, not weakened or bypassed for test publication.
    checked = materialize(entries)
    assert {part["id"] for part in checked} == original_ids
    response = a[0].post(
        f"{ADMIN}/{draft}/publish",
        headers=a[1],
        json={"expected_active_version": original},
    )
    assert response.status_code == 200, response.text
    try:
        assert {
            part.id for part in PostgresCatalogRepository(pg_engine).all()
        } == original_ids
        unchanged = original_ids - proposal.components.keys()
        with pg_engine.connect() as conn:
            assert resource_snapshot(conn, original) == original_resources
            assert resource_snapshot(conn, draft, unchanged) == resource_snapshot(
                conn, original, unchanged
            )
        yield a, b, draft
    finally:
        # Restore the exact original full publication, never the14-part seed.
        with pg_engine.begin() as conn:
            assert conn.scalar(sa.select(active.c.version)) == draft
            conn.execute(
                active.update().where(active.c.singleton == 1).values(version=original)
            )
            assert resource_snapshot(conn, original) == original_resources


def create_tower(actor, selected=None):
    selected = selected or groups(True)
    selected_categories = {line["category"] for line in selected}
    data = {
        "schema_version": 2,
        "name": "Own TEST tower integration",
        "category_status": {
            category: "present" if category in selected_categories else "unknown"
            for category in (
                "cpu",
                "motherboard",
                "ram",
                "gpu",
                "psu",
                "case",
                "storage",
                "cooler",
                "fan",
            )
        },
        "lines": selected,
        "context": {"bios_version": "P2.30", "notes": "PRIVATE SYNTHETIC ACCOUNT"},
    }
    response = actor[0].post("/api/towers", headers=actor[1], json=data)
    assert response.status_code == 201, response.text
    return response.json()


def root(tower):
    return f"/api/towers/{tower['id']}"


def snapshot(engine, tower):
    identity = UUID(tower["id"])
    with engine.connect() as conn:
        return tuple(
            tuple(
                dict(row)
                for row in conn.execute(
                    sa.select(table)
                    .where(key == identity)
                    .order_by(*table.primary_key.columns)
                ).mappings()
            )
            for table, key in (
                (pcs, pcs.c.id),
                (configurations, configurations.c.pc_id),
                (lines, lines.c.pc_id),
            )
        )


def test_tower_http_unknown_negative_and_simulation_never_write(
    stock_published, pg_engine
):
    a, _, _ = stock_published
    tower = create_tower(a)
    before = snapshot(pg_engine, tower)
    response = a[0].post(
        root(tower) + "/evaluate", headers=a[1], json={"expected_pc_revision": 1}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["verdict"] == "requiere_verificacion"
    assert body["scope"]["id"] == "cu05-tower-stock-1"
    assert body["coverage"]["required"] == [f"T{i:02}" for i in range(1, 13)]
    assert body["evaluated_configuration"] == tower
    assert response.headers["cache-control"] == "no-store"
    assert "owner_id" not in body["evaluated_configuration"]
    ram_id = next(
        line["line_id"] for line in tower["lines"] if line["category"] == "ram"
    )
    data = {
        "expected_pc_revision": 1,
        "actions": [
            {
                "action": "replace_category",
                "category": "ram",
                "candidates": [{"component_id": "P04", "quantity": 4}],
            },
            {
                "action": "replace_category",
                "category": "gpu",
                "candidates": [{"component_id": "P16", "quantity": 1}],
            },
            {
                "action": "replace_category",
                "category": "motherboard",
                "candidates": [{"component_id": "P03", "quantity": 1}],
            },
        ],
    }
    response = a[0].post(root(tower) + "/simulate", headers=a[1], json=data)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["verdict"] == "incompatible"
    assert "T04" in body["coverage"]["failed"]
    assert body["missing_fields"] and not body["coverage"]["complete"]
    simulated = body["evaluated_configuration"]
    assert simulated["context"]["bios_version"] is None
    ram = [line for line in simulated["lines"] if line["category"] == "ram"]
    assert len(ram) == 1 and ram[0]["component_id"] == "P04" and ram[0]["quantity"] == 4
    assert ram[0]["line_id"] != ram_id
    assert snapshot(pg_engine, tower) == before
    assert a[0].get(root(tower)).json() == tower


def test_tower_http_owner_csrf_auth_revision_and_reject_evidence(stock_published):
    a, b, _ = stock_published
    tower = create_tower(a)
    for suffix, data in (
        ("evaluate", {"expected_pc_revision": 1}),
        (
            "simulate",
            {
                "expected_pc_revision": 1,
                "actions": [
                    {
                        "action": "replace_category",
                        "category": "ram",
                        "candidates": [{"component_id": "P05", "quantity": 2}],
                    }
                ],
            },
        ),
    ):
        path = root(tower) + "/" + suffix
        assert b[0].post(path, headers=b[1], json=data).status_code == 404
        assert (
            a[0]
            .post(path, headers=a[1], json={**data, "expected_pc_revision": 99})
            .status_code
            == 409
        )
        assert a[0].post(path, json=data).status_code == 403
        assert (
            a[0].post(path, headers={**a[1], "Origin": "null"}, json=data).status_code
            == 403
        )
        assert (
            a[0].post(path + "?disable=T12", headers=a[1], json=data).status_code == 403
        )
        for extra in (
            {"owner_id": str(b[2])},
            {"evidence": {}},
            {"coverage": {"complete": True}},
        ):
            assert (
                a[0].post(path, headers=a[1], json={**data, **extra}).status_code == 422
            )
        with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50000)) as anonymous:
            assert anonymous.post(path, json=data).status_code == 401


def test_tower_pinned_catalog_conflict_and_pg_failure(stock_published, pg_engine):
    a, _, _ = stock_published
    tower = create_tower(a)
    catalog = CatalogService(PostgresCatalogRepository(pg_engine))
    app.dependency_overrides[service] = lambda: TowerCompatibilityService(
        TowerEvaluationRepository(pg_engine, "stale-synthetic-version"), catalog
    )
    try:
        response = a[0].post(
            root(tower) + "/evaluate", headers=a[1], json={"expected_pc_revision": 1}
        )
        assert response.status_code == 409
    finally:
        app.dependency_overrides.pop(service, None)
    missing = pg_engine.execution_options(
        schema_translate_map={None: "missing_tower_test_" + uuid4().hex}
    )
    app.dependency_overrides[service] = lambda: TowerCompatibilityService(
        TowerEvaluationRepository(missing, catalog.repository.dataset_version), catalog
    )
    try:
        response = a[0].post(
            root(tower) + "/evaluate", headers=a[1], json={"expected_pc_revision": 1}
        )
        assert response.status_code == 503
        assert response.json() == {"detail": "Service unavailable"}
    finally:
        app.dependency_overrides.pop(service, None)


def test_tower_actions_do_not_reinterpret_legacy_plan_share_bytes(stock_published):
    a, _, _ = stock_published
    legacy = create(
        a,
        components=groups(),
        context={"bios_version": "P2.30", "notes": "PRIVATE TEST"},
    )
    plan = save(a, legacy)
    _, token = share_plan(a, plan)
    paths = (f"/api/plans/{plan['id']}", f"/api/shared-plans/{token}")
    before = [a[0].get(path).content for path in paths]
    tower = a[0].get(f"/api/towers/{legacy['id']}").json()
    response = a[0].post(
        root(tower) + "/evaluate", headers=a[1], json={"expected_pc_revision": 1}
    )
    assert response.status_code == 200, response.text
    assert response.json()["scope"]["id"] == "cu05-tower-stock-1"
    assert [a[0].get(path).content for path in paths] == before
    assert a[0].get(f"/api/pcs/{legacy['id']}").json() == legacy


def test_tower_all_ids_beyond50_multiple_drives_with_missing_evidence(
    admin_actors, pg_engine
):
    a, _ = admin_actors
    original = PostgresCatalogRepository(pg_engine).dataset_version
    draft = revision(a, original)
    prefix = "SYNTHETIC38API-" + uuid4().hex
    source = dict(
        source_id=prefix,
        url="https://example.test/synthetic-storage",
        consulted_on="2026-10-26",
        locator="SYNTHETIC TEST only; no hardware evidence",
    )
    response = a[0].post(
        f"{ADMIN}/{draft}/sources", headers=a[1], json={"data": source}
    )
    assert response.status_code == 201, response.text
    identities = []
    for index in range(51):
        response = a[0].post(
            f"{ADMIN}/{draft}/components",
            headers=a[1],
            json={
                "data": {
                    "category": "storage",
                    "name": f"{prefix}-{index:03}",
                    "attributes": {},
                    "sources": [{"id": prefix, "url": source["url"]}],
                }
            },
        )
        assert response.status_code == 201, response.text
        identities.append(response.json()["id"])
    response = a[0].post(
        f"{ADMIN}/{draft}/publish",
        headers=a[1],
        json={"expected_active_version": original},
    )
    assert response.status_code == 200, response.text
    page = a[0].get(
        "/api/catalog/components",
        params={"category": "storage", "q": prefix, "page": 2, "page_size": 50},
    )
    assert page.status_code == 200 and len(page.json()["items"]) == 1
    after50 = page.json()["items"][0]["id"]
    other = next(identity for identity in identities if identity != after50)
    tower = create_tower(
        a,
        [
            dict(category="storage", component_id=other, quantity=1),
            dict(category="storage", component_id=after50, quantity=2),
        ],
    )
    response = a[0].post(
        root(tower) + "/evaluate", headers=a[1], json={"expected_pc_revision": 1}
    )
    assert response.status_code == 200, response.text
    assert response.json()["verdict"] == "requiere_verificacion"
    assert len(response.json()["evaluated_configuration"]["lines"]) == 2
    assert response.json()["missing_fields"]
    assert a[0].get(root(tower)).json() == tower
