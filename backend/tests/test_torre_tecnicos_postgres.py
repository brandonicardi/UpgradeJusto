"""Real TEST PG publication tests; all observations/prices explicitly synthetic."""

import json
from copy import deepcopy
from uuid import uuid4

import pytest
import sqlalchemy as sa
from test_minorista_modelos import synthetic_batch
from test_minorista_postgres import BoundEngine
from test_torre_tecnicos_modelos import technical_fixture

from upgradejusto.administration.repository import AdministrationRepository
from upgradejusto.administration.tables import active, roles, rows
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import components, users
from upgradejusto.retail.models import VendorBatch
from upgradejusto.retail.service import RetailService
from upgradejusto.retail.tables import resources


@pytest.fixture
def synthetic_publication(pg_engine):
    with pg_engine.connect() as conn:
        transaction = conn.begin()
        try:
            engine = BoundEngine(conn)
            admin = uuid4()
            conn.execute(users.insert().values(id=admin))
            conn.execute(roles.insert().values(user_id=admin, role="admin"))
            initial = conn.scalar(sa.select(active.c.version))
            batch = synthetic_batch(1)
            batch["source_version"] = "synthetic-technical-" + uuid4().hex
            record = batch["records"][0]
            record["image"] = {
                "url": "https://imagenes.compragamer.com/productos/compragamer_Imganen_general_SYNTHETIC-mini.jpg",
                "alt": "SYNTHETIC ONLY",
                "source_url": record["source_url"],
                "retrieved_at": batch["observed_at"],
                "rights_note": "Synthetic fixture",
                "exact_variant": True,
                "status": "verified",
                "photo_bytes_verified": False,
            }
            result = RetailService(engine).publish(
                admin, VendorBatch.model_validate(batch), initial
            )
            yield conn, engine, admin, result["dataset_version"], batch
        finally:
            transaction.rollback()


def add_technical_draft(engine, admin, version, component):
    administration = AdministrationRepository(engine)
    draft = administration.create(admin, version)["id"]
    payload, _, ref = technical_fixture("cpu", component.id, component.name)
    administration.write(admin, draft, "sources", ref)
    sources = [s.model_dump(mode="json") for s in component.sources]
    sources.append({"id": ref["source_id"], "url": ref["url"]})
    administration.write(
        admin,
        draft,
        "components",
        {
            "attributes": {
                **component.attributes,
                "tower_stock_v1": json.dumps(payload),
            },
            "sources": sources,
        },
        row_id=component.id,
    )
    return administration, draft, payload, ref


def resource_row(conn, version):
    return dict(
        conn.execute(
            sa.select(resources).where(
                resources.c.dataset_version == version,
                resources.c.component_id == "cg-900000",
            )
        )
        .mappings()
        .one()
    )


def test_technical_superset_preserves_quotes_history_and_retail_refresh(
    synthetic_publication,
):
    conn, engine, admin, version, batch = synthetic_publication
    old = resource_row(conn, version)
    component = PostgresCatalogRepository(engine).get("cg-900000")
    administration, draft, payload, _ = add_technical_draft(
        engine, admin, version, component
    )
    administration.publish(admin, draft, version)
    assert resource_row(conn, draft) == {**old, "dataset_version": draft}
    assert resource_row(conn, version) == old
    published = PostgresCatalogRepository(engine).get(component.id)
    assert published.image == component.image
    assert published.attributes["tower_stock_v1"] == json.dumps(payload)
    refreshed = deepcopy(batch)
    refreshed["source_version"] += "-refresh"
    refreshed["records"][0]["offers"][0]["amount"] = "234.56"
    result = RetailService(engine).publish(
        admin, VendorBatch.model_validate(refreshed), draft
    )
    assert result["quarantine"] == []
    latest = PostgresCatalogRepository(engine).get(component.id)
    assert latest.attributes == published.attributes
    assert latest.sources == published.sources
    assert latest.offers[0].amount == "234.56"
    assert resource_row(conn, draft) == {**old, "dataset_version": draft}


@pytest.mark.parametrize(
    "failure",
    [
        "source_id",
        "url",
        "consulted_on",
        "locator",
        "component_source",
        "identity",
        "mpn",
    ],
)
def test_publish_strict_bindings_atomic_pointer(synthetic_publication, failure):
    conn, engine, admin, version, _ = synthetic_publication
    component = PostgresCatalogRepository(engine).get("cg-900000")
    administration, draft, payload, _ = add_technical_draft(
        engine, admin, version, component
    )
    if failure == "identity":
        payload["identity"]["component_id"] = "another-synthetic-id"
    elif failure == "mpn":
        payload["identity"]["manufacturer_part_number"] = "SYNTHETIC-WRONG-MPN"
    elif failure == "component_source":
        administration.write(
            admin,
            draft,
            "components",
            {"sources": [s.model_dump(mode="json") for s in component.sources]},
            row_id=component.id,
        )
    else:
        for observation in [
            *payload["identity"]["source_refs"],
            *(r for refs in payload["fields"].values() for r in refs),
        ]:
            observation[failure] = {
                "source_id": "unknown-source",
                "url": "https://example.com/other",
                "consulted_on": "2026-10-25",
                "locator": "another synthetic section",
            }[failure]
    administration.write(
        admin,
        draft,
        "components",
        {"attributes": {"tower_stock_v1": json.dumps(payload)}},
        row_id=component.id,
    )
    with pytest.raises(PCError) as error:
        administration.publish(admin, draft, version)
    assert error.value.status == 422
    assert conn.scalar(sa.select(active.c.version)) == version
    assert not conn.scalar(
        sa.select(components.c.id).where(components.c.dataset_version == draft)
    )
    assert resource_row(conn, version)["offers"][0]["amount"] == "123.45"


def test_removing_original_source_drops_resources_and_revoked_role(
    synthetic_publication,
):
    conn, engine, admin, version, _ = synthetic_publication
    component = PostgresCatalogRepository(engine).get("cg-900000")
    administration, draft, _, ref = add_technical_draft(
        engine, admin, version, component
    )
    administration.write(
        admin,
        draft,
        "components",
        {"sources": [{"id": ref["source_id"], "url": ref["url"]}]},
        row_id=component.id,
    )
    original = resource_row(conn, version)
    administration.publish(admin, draft, version)
    current = PostgresCatalogRepository(engine).get(component.id)
    assert current.image is None and current.offers == ()
    assert resource_row(conn, version) == original
    next_draft = administration.create(admin, draft)["id"]
    conn.execute(roles.delete().where(roles.c.user_id == admin))
    with pytest.raises(PCError) as denied:
        administration.publish(admin, next_draft, draft)
    assert denied.value.status == 403
    assert conn.scalar(sa.select(active.c.version)) == draft
    assert (
        conn.scalar(
            sa.select(rows.c.data).where(
                rows.c.revision_id == draft,
                rows.c.id == component.id,
                rows.c.collection == "components",
            )
        )["attributes"]["tower_stock_v1"]
        == current.attributes["tower_stock_v1"]
    )
