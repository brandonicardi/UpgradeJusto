"""Real publication path: manufacturer facts reach the engine with no mocks."""

import json
from datetime import timedelta
from uuid import uuid4

import pytest
import sqlalchemy as sa

from upgradejusto.administration.repository import AdministrationRepository
from upgradejusto.administration.service import AdministrationService
from upgradejusto.catalog.postgres import (
    PostgresCatalogRepository,
    published_catalog_snapshot,
)
from upgradejusto.catalog.service import CatalogService
from upgradejusto.catalog_import.executor import active_snapshot
from upgradejusto.catalog_import.manufacturer import build_manufacturer_proposal
from upgradejusto.compatibility.tower_essential import evaluate_tower_essential
from upgradejusto.compatibility.tower_evidence import resolve_tower_evidence
from upgradejusto.demo_seed import (
    DEFAULT_DATA_DIR,
    MANUFACTURER_FACTS,
    ensure_demo_admin,
    publish_batches,
    publish_manufacturer_facts,
    publish_technical,
)
from upgradejusto.pcs.tower_models import Tower
from upgradejusto.persistence.seed import seed_catalog
from upgradejusto.recommendations.tower_models import TowerPreviewRequest
from upgradejusto.recommendations.tower_repository import (
    TowerRecommendationCatalog,
    published_identities,
)
from upgradejusto.recommendations.tower_service import preview_snapshot
from upgradejusto.retail.tables import resources

BASE = {
    "cpu": "cg-13355",
    "motherboard": "cg-10468",
    "ram": "cg-21696",
    "gpu": "cg-17608",
    "psu": "cg-21572",
    "case": "cg-16949",
    "storage": "cg-16872",
}


@pytest.fixture(scope="module")
def published(pg_engine):
    seed_catalog(pg_engine)
    admin = ensure_demo_admin(pg_engine)
    publish_technical(pg_engine, admin)
    publish_batches(pg_engine, admin, DEFAULT_DATA_DIR)
    service = AdministrationService(AdministrationRepository(pg_engine))
    version, _, _ = active_snapshot(service, admin)
    before = retail(pg_engine, version)
    status = publish_manufacturer_facts(pg_engine, admin, DEFAULT_DATA_DIR)
    yield admin, service, before, status
    with pg_engine.begin() as conn:
        conn.execute(sa.text("delete from administration_roles"))


def retail(engine, version):
    with engine.connect() as conn:
        return {
            row.component_id: (row.identity, row.image_evidence, row.offers)
            for row in conn.execute(
                sa.select(resources).where(resources.c.dataset_version == version)
            )
        }


def tower(parts, bios):
    return Tower.model_validate(
        {
            "schema_version": 2,
            "name": "torre real",
            "id": uuid4(),
            "revision": 1,
            "origin_schema": 2,
            "lines": [
                {
                    "line_id": uuid4(),
                    "category": category,
                    "component_id": identity,
                    "quantity": 1,
                }
                for category, identity in parts.items()
            ],
            "category_status": {
                **dict.fromkeys(parts, "present"),
                "cooler": "unknown",
                "fan": "unknown",
            },
            "context": {"bios_version": bios, "notes": None},
        }
    )


def verdict(engine, parts=BASE, bios="P2.30"):
    pc = tower(parts, bios)
    catalog = CatalogService(PostgresCatalogRepository(engine))
    snapshot = catalog.resolution_snapshot()
    evidence = resolve_tower_evidence(pc, snapshot, catalog.repository.dataset_version)
    return evaluate_tower_essential(pc, evidence)


def test_publication_keeps_photo_and_offers(published, pg_engine):
    admin, service, before, status = published
    assert status == "published"
    version, _, _ = active_snapshot(service, admin)
    after = retail(pg_engine, version)
    assert after == before


def test_second_run_changes_nothing(published, pg_engine):
    admin, service, _, _ = published
    version, _, _ = active_snapshot(service, admin)
    assert publish_manufacturer_facts(pg_engine, admin, DEFAULT_DATA_DIR) == "unchanged"
    assert active_snapshot(service, admin)[0] == version


def test_a_rejected_document_publishes_nothing(published, pg_engine):
    admin, service, _, _ = published
    version, components, _ = active_snapshot(service, admin)
    document = json.loads((DEFAULT_DATA_DIR / MANUFACTURER_FACTS).read_text("utf-8"))
    mpns = {entry["component_id"]: entry["mpn"] for entry in document["components"]}
    mpns["cg-13355"] = "OTRO"
    with pytest.raises(ValueError):
        build_manufacturer_proposal(document, components, mpns)
    assert active_snapshot(service, admin)[0] == version


def test_facts_survive_a_new_retail_batch(published, pg_engine):
    admin, service, _, _ = published
    _, components, _ = active_snapshot(service, admin)
    assert components["cg-13355"]["attributes"]["tower_stock_v1"]
    publish_batches(pg_engine, admin, DEFAULT_DATA_DIR)
    assert verdict(pg_engine).verdict == "compatible"


def test_real_tower_with_declared_bios_fits(published, pg_engine):
    result = verdict(pg_engine)
    assert result.verdict == "compatible"
    assert result.coverage.complete


def proposals(engine, objective, budget):
    catalog = CatalogService(PostgresCatalogRepository(engine))
    version = catalog.repository.dataset_version
    with engine.connect() as conn:
        snapshot = published_catalog_snapshot(conn, version)
        data = TowerRecommendationCatalog(
            snapshot, published_identities(conn, version, snapshot.components)
        )
    request = TowerPreviewRequest.model_validate(
        {
            "expected_pc_revision": 1,
            "objective": objective,
            "budget_ars": budget,
            "price_condition": "cash",
            "mode": "automatic",
            "workload": None,
            "materials": [],
            "alternatives": [],
        }
    )
    # Pinned to the batch date so published offers do not expire under the test.
    now = max(o.observed_at for o in data["cg-17116"].offers)
    pc = tower({**BASE, "gpu": "P06"}, "P2.30")
    return preview_snapshot(pc, data, version, request, now + timedelta(minutes=1))


def chosen(item):
    return [
        (candidate["component_id"], candidate["quantity"])
        for action in item.model_dump(mode="json")["actions"]
        for candidate in action["candidates"]
    ]


def test_real_graphics_upgrade_is_recommended_with_its_reference(published, pg_engine):
    response = proposals(pg_engine, "gaming", "2000000.00")
    best = response.items[0]
    assert best.status == "recommended"
    assert chosen(best) == [("cg-17116", 1)]
    assert (best.benefit["before"], best.benefit["after"]) == ("48", "100")
    assert best.cost["total_ars"] is not None


def test_a_piece_that_already_fits_gets_no_needless_extras(published, pg_engine):
    response = proposals(pg_engine, "gaming", "2000000.00")
    assert all(("cg-17116", 1) not in chosen(i)[1:] for i in response.items)
    assert sum(chosen(i)[0] == ("cg-17116", 1) for i in response.items) == 1


def test_real_memory_upgrade_reads_published_capacity(published, pg_engine):
    response = proposals(pg_engine, "general", "500000.00")
    best = response.items[0]
    assert best.status == "recommended"
    assert chosen(best) == [("cg-21696", 2)]
    assert (best.benefit["before"], best.benefit["after"]) == ("16", "32")
    ddr5 = [i for i in response.items if chosen(i)[0][0] == "cg-16112"]
    assert ddr5 and all(i.status == "rejected" for i in ddr5)


def test_real_am5_ddr5_tower_with_declared_bios_fits(published, pg_engine):
    parts = {
        **BASE,
        "cpu": "cg-16099",
        "motherboard": "cg-16653",
        "ram": "cg-16112",
    }
    assert verdict(pg_engine, parts, "3.01").verdict == "compatible"
    assert verdict(pg_engine, parts, "2.10").verdict == "incompatible"


def test_real_graphics_card_above_the_power_supply_does_not_fit(published, pg_engine):
    result = verdict(pg_engine, {**BASE, "gpu": "cg-17111"})
    assert result.verdict == "incompatible"
    assert set(result.coverage.failed) == {"T05"}


def test_real_tower_without_bios_needs_verification(published, pg_engine):
    result = verdict(pg_engine, bios=None)
    assert result.verdict == "requiere_verificacion"
    assert result.missing_fields == ("cpu_support.installed_bios",)


def test_real_tower_with_a_documented_older_bios_does_not_fit(published, pg_engine):
    assert verdict(pg_engine, bios="P1.20").verdict == "incompatible"


@pytest.mark.parametrize(
    ("change", "failed"),
    [
        ({"ram": "cg-16112"}, {"T02"}),
        ({"cpu": "cg-16099"}, {"T01", "T02"}),
    ],
)
def test_real_ddr5_and_am5_pieces_do_not_fit_the_ddr4_board(
    published, pg_engine, change, failed
):
    result = verdict(pg_engine, {**BASE, **change})
    assert result.verdict == "incompatible"
    assert set(result.coverage.failed) == failed
