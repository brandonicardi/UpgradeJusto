"""38A real TEST-PG/API plus isolated synthetic pre38 migration proof."""

import importlib.util
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import UUID, uuid4

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from test_cu02_cu10_postgres import ADMIN, revision
from test_cu02_cu10_postgres import admin_actors as admin_actors
from test_pcs_postgres import actors as actors
from test_pcs_postgres import create
from test_plans_postgres import plan_actors as plan_actors
from test_plans_postgres import save
from test_shares_postgres import publish as share_plan
from test_towers38_models import declared, payload

from upgradejusto.catalog.dataset import COMPONENTS
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_models import TowerUpdate
from upgradejusto.pcs.tower_repository import TowerRepository
from upgradejusto.pcs.tower_tables import configurations
from upgradejusto.persistence.schema import components, datasets, pc_groups, pcs, users


def body(tower):
    return {
        key: tower[key]
        for key in ("schema_version", "name", "category_status", "lines", "context")
    } | {"revision": tower["revision"]}


def test_tower_crud_ownership_ids_revision_legacy_and_selection_beyond50(
    admin_actors, pg_engine
):
    a, b = admin_actors
    original = PostgresCatalogRepository(pg_engine).dataset_version
    draft = revision(a, original)
    source_id = "synthetic-tower38-" + uuid4().hex
    source_url = "https://example.test/tower38-unit-source"
    source = a[0].post(
        f"{ADMIN}/{draft}/sources",
        headers=a[1],
        json={
            "data": {
                "source_id": source_id,
                "url": source_url,
                "consulted_on": "2026-10-26",
                "locator": "SYNTHETIC TEST only: no real hardware, price or performance evidence",
            }
        },
    )
    assert source.status_code == 201, source.text
    added = []
    name_prefix = "SYNTHETIC test drive " + uuid4().hex[:8]
    for index in range(55):
        response = a[0].post(
            f"{ADMIN}/{draft}/components",
            headers=a[1],
            json={
                "data": {
                    "category": "storage",
                    "name": f"{name_prefix} {index:03}",
                    "attributes": {"capacity_gb": None},
                    "sources": [{"id": source_id, "url": source_url}],
                }
            },
        )
        assert response.status_code == 201, response.text
        added.append(response.json()["id"])
    published = a[0].post(
        f"{ADMIN}/{draft}/publish",
        headers=a[1],
        json={"expected_active_version": original},
    )
    assert published.status_code == 200, published.text
    page = a[0].get(
        "/api/catalog/components",
        params={"category": "storage", "q": name_prefix, "page": 2, "page_size": 50},
    )
    assert page.status_code == 200, page.text
    assert page.json()["items"]
    # An ID from beyond a first50 query is valid regardless of local UI pages.
    after50 = page.json()["items"][-1]["id"]
    assert after50 in added
    assert a[0].get(f"/api/catalog/components/{after50}").status_code == 200
    first_drive = next(identity for identity in added if identity != after50)
    data = payload()
    data["category_status"].update(
        cpu="present",
        motherboard="present",
        ram="present",
        storage="present",
        fan="present",
    )
    data["lines"] = [
        {"category": "cpu", "component_id": "P01", "quantity": 1},
        {"category": "motherboard", "component_id": "P03", "quantity": 1},
        {"category": "ram", "component_id": "P04", "quantity": 2},
        {"category": "storage", "component_id": first_drive, "quantity": 1},
        {"category": "storage", "component_id": after50, "quantity": 1},
        declared("fan", "Unknown fan label", 4),
    ]
    made = a[0].post("/api/towers", headers=a[1], json=data)
    assert made.status_code == 201, made.text
    tower = made.json()
    assert tower["origin_schema"] == 2 and tower["schema_version"] == 2
    assert len({line["line_id"] for line in tower["lines"]}) == 6
    assert all(UUID(line["line_id"]) for line in tower["lines"])
    assert [
        line["quantity"] for line in tower["lines"] if line["category"] == "ram"
    ] == [2]
    assert (
        next(line for line in tower["lines"] if line["category"] == "fan")[
            "declared_model"
        ]
        == "Unknown fan label"
    )
    root = f"/api/towers/{tower['id']}"
    assert a[0].get(root).json() == tower
    assert b[0].get(root).status_code == 404
    assert b[0].put(root, headers=b[1], json=body(tower)).status_code == 404
    assert b[0].delete(root, headers=b[1]).status_code == 404
    assert a[0].put(root, json=body(tower)).status_code == 403
    assert a[0].get("/api/towers?page=1&page=2").status_code == 403
    assert b[0].get("/api/towers").json()["total"] == 0
    assert (
        a[0]
        .post("/api/towers", headers=a[1], json={**data, "owner_id": str(b[2])})
        .status_code
        == 422
    )
    invalid_id = body(tower)
    invalid_id["lines"] = [{**line, "line_id": str(uuid4())} for line in tower["lines"]]
    assert a[0].put(root, headers=a[1], json=invalid_id).status_code == 422
    assert a[0].get(root).json() == tower
    foreign = b[0].post("/api/towers", headers=b[1], json=data)
    assert foreign.status_code == 201, foreign.text
    foreign_storage = next(
        line for line in foreign.json()["lines"] if line["category"] == "storage"
    )
    wrong_line = body(tower)
    wrong_line["lines"] = [dict(line) for line in tower["lines"]]
    next(line for line in wrong_line["lines"] if line["category"] == "storage")[
        "line_id"
    ] = foreign_storage["line_id"]
    assert a[0].put(root, headers=a[1], json=wrong_line).status_code == 422
    assert a[0].get(root).json() == tower
    for method, kwargs in (
        ("get", {}),
        (
            "put",
            {
                "headers": a[1],
                "json": {
                    "name": "Not truncating",
                    "revision": 1,
                    "components": [],
                    "context": {"bios_version": None, "notes": None},
                },
            },
        ),
        ("delete", {"headers": a[1]}),
    ):
        assert (
            getattr(a[0], method)(f"/api/pcs/{tower['id']}", **kwargs).status_code
            == 409
        )
    assert (
        a[0]
        .post(
            f"/api/pcs/{tower['id']}/compatibility/evaluate",
            headers=a[1],
            json={"expected_pc_revision": 1},
        )
        .status_code
        == 409
    )

    update = body(tower)
    update["name"] = "Explicit full replacement"
    update["context"]["bios_version"] = None
    update["lines"] = [
        line for line in update["lines"] if line["category"] != "ram"
    ] + [{"category": "ram", "component_id": "P05", "quantity": 2}]
    result = a[0].put(root, headers=a[1], json=update)
    assert result.status_code == 200, result.text
    newer = result.json()
    assert newer["revision"] == 2
    assert [
        line["component_id"] for line in newer["lines"] if line["category"] == "ram"
    ] == ["P05"]
    assert a[0].put(root, headers=a[1], json=update).status_code == 409
    model = TowerUpdate.model_validate(body(newer))
    repository = TowerRepository(pg_engine, draft)

    def concurrent_update(_):
        try:
            return repository.update(a[2], UUID(tower["id"]), model).revision
        except PCError as exc:
            return exc.status

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(concurrent_update, range(2))) == [3, 409]

    legacy = create(
        a,
        components=[
            {"category": "cpu", "component_id": "P01", "quantity": 1},
            {"category": "motherboard", "component_id": "P03", "quantity": 1},
            {"category": "ram", "component_id": "P04", "quantity": 2},
        ],
        context={"bios_version": "P2.30", "notes": "PRIVATE historical"},
    )
    plan = save(a, legacy)
    _, token = share_plan(a, plan)
    plan_path, share_path = f"/api/plans/{plan['id']}", f"/api/shared-plans/{token}"
    plan_bytes, share_bytes = a[0].get(plan_path).content, a[0].get(share_path).content
    legacy_id = UUID(legacy["id"])
    with pg_engine.connect() as conn:
        old_groups = [
            dict(row)
            for row in conn.execute(
                sa.select(pc_groups).where(pc_groups.c.pc_id == legacy_id)
            ).mappings()
        ]
        assert (
            conn.scalar(
                sa.select(configurations.c.pc_id).where(
                    configurations.c.pc_id == legacy_id
                )
            )
            is None
        )
    adapted = a[0].get(f"/api/towers/{legacy['id']}").json()
    assert (
        adapted["origin_schema"] == 1
        and adapted["category_status"]["storage"] == "unknown"
    )
    assert a[0].get(f"/api/towers/{legacy['id']}").json() == adapted
    assert a[0].get(f"/api/pcs/{legacy['id']}").json() == legacy
    convert = body(adapted)
    convert["context"]["bios_version"] = None
    for line in convert["lines"]:
        if line["category"] == "motherboard":
            line["component_id"] = "P18"
    upgraded = a[0].put(f"/api/towers/{legacy['id']}", headers=a[1], json=convert)
    assert upgraded.status_code == 200, upgraded.text
    assert upgraded.json()["context"]["bios_version"] is None
    assert upgraded.json()["origin_schema"] == 2
    assert a[0].get(f"/api/pcs/{legacy['id']}").status_code == 409
    with pg_engine.connect() as conn:
        assert old_groups == [
            dict(row)
            for row in conn.execute(
                sa.select(pc_groups).where(pc_groups.c.pc_id == legacy_id)
            ).mappings()
        ]
    assert a[0].get(plan_path).content == plan_bytes
    assert a[0].get(share_path).content == share_bytes
    assert a[0].delete(root, headers=a[1]).status_code == 204
    assert a[0].get(root).status_code == 404


def test_additive_migration_on_synthetic_pre38_schema_preserves_legacy(pg_engine):
    schema = "tower38_old_" + uuid4().hex
    path = Path(__file__).resolve().parents[1] / "alembic/versions/38_a_001_towers.py"
    spec = importlib.util.spec_from_file_location("isolated_tower38_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    with pg_engine.begin() as conn:
        conn.execute(sa.schema.CreateSchema(schema))
    try:
        with pg_engine.begin() as base_conn:
            conn = base_conn.execution_options(schema_translate_map={None: schema})
            # Unqualified Alembic ALTERs also resolve only inside this synthetic
            # namespace; bind a generated identifier as a value, never user SQL.
            conn.execute(sa.select(sa.func.set_config("search_path", schema, True)))
            old = sa.MetaData()
            for table in (users, datasets, components, pcs, pc_groups):
                table.to_metadata(old)
            copied = old.tables["catalog_components"]
            for constraint in list(copied.constraints):
                if constraint.name == "ck_catalog_category":
                    copied.constraints.remove(constraint)
            copied.append_constraint(
                sa.CheckConstraint(
                    "category IN ('cpu','motherboard','ram','gpu','psu','case')",
                    name="ck_catalog_category",
                )
            )
            old.create_all(conn)
            owner_id, pc_id = uuid4(), uuid4()
            conn.execute(
                users.insert().values(
                    id=owner_id,
                    email="synthetic38@example.test",
                    password_hash="synthetic-not-login-hash",
                )
            )
            conn.execute(datasets.insert().values(version="synthetic-pre38"))
            part = COMPONENTS[0].model_dump(mode="json")
            conn.execute(
                components.insert().values(dataset_version="synthetic-pre38", **part)
            )
            conn.execute(
                pcs.insert().values(
                    id=pc_id,
                    owner_id=owner_id,
                    name="Synthetic old37 PC",
                    revision=7,
                    bios_version="P2.30",
                    notes=None,
                )
            )
            conn.execute(
                pc_groups.insert().values(
                    pc_id=pc_id,
                    category="cpu",
                    dataset_version="synthetic-pre38",
                    component_id=part["id"],
                    quantity=1,
                )
            )
            before = dict(
                conn.execute(sa.select(pcs).where(pcs.c.id == pc_id)).mappings().one()
            )
            migration.op = Operations(MigrationContext.configure(conn))
            migration.upgrade()
            assert (
                dict(
                    conn.execute(sa.select(pcs).where(pcs.c.id == pc_id))
                    .mappings()
                    .one()
                )
                == before
            )
            assert (
                conn.scalar(
                    sa.select(pc_groups.c.component_id).where(
                        pc_groups.c.pc_id == pc_id
                    )
                )
                == part["id"]
            )
            assert (
                conn.scalar(sa.select(sa.func.count()).select_from(configurations)) == 0
            )
            migration.downgrade()
            assert (
                dict(
                    conn.execute(sa.select(pcs).where(pcs.c.id == pc_id))
                    .mappings()
                    .one()
                )
                == before
            )
    finally:
        with pg_engine.begin() as conn:
            conn.execute(sa.schema.DropSchema(schema, cascade=True))
