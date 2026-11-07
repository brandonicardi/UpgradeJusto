"""Real PG ownership/publication/revision reads; no DEV, no provider calls."""

from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from test_pcs_postgres import ORIGIN, create
from test_pcs_postgres import actors as actors

from upgradejusto.api.tower_recommendations import router, service
from upgradejusto.catalog.models import Component
from upgradejusto.catalog.postgres import (
    PostgresCatalogRepository,
    PublishedCatalogSnapshot,
)
from upgradejusto.main import app
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import components, datasets
from upgradejusto.recommendations.tower_models import TowerPreviewRequest
from upgradejusto.recommendations.tower_references import reference
from upgradejusto.recommendations.tower_repository import (
    TowerRecommendationCatalog,
    TowerRecommendationRepository,
    published_identities,
)
from upgradejusto.recommendations.tower_service import TowerRecommendationService
from upgradejusto.retail.tables import resources


def request():
    return TowerPreviewRequest(
        expected_pc_revision=1,
        objective="productivity",
        budget_ars="500000.00",
        price_condition="cash",
        mode="automatic",
        workload="blender-cpu",
        materials=[],
        alternatives=[],
    )


def test_pg_owner_revision_and_complete_pinned_publication_no_pc_write(
    actors, pg_engine
):
    a, b = actors
    saved = create(a)
    identity = UUID(saved["id"])
    published = PostgresCatalogRepository(pg_engine)
    repository = TowerRecommendationRepository(pg_engine, published.dataset_version)
    with pg_engine.connect() as conn:
        expected = set(
            conn.scalars(
                sa.select(components.c.id).where(
                    components.c.dataset_version == published.dataset_version
                )
            )
        )
    observed = repository.preview(
        a[2],
        identity,
        1,
        lambda tower, catalog, version: (set(catalog), version, tower.revision),
    )
    assert observed == (expected, published.dataset_version, 1)
    with pytest.raises(PCError) as foreign:
        repository.preview(
            b[2], identity, 999, lambda *args: pytest.fail("Foreign PC read")
        )
    assert foreign.value.status == 404
    with pytest.raises(PCError) as stale:
        repository.preview(
            a[2], identity, 2, lambda *args: pytest.fail("Stale revision read")
        )
    assert stale.value.status == 409
    result = TowerRecommendationService(repository).preview(a[2], identity, request())
    assert result.pc_revision == 1
    assert a[0].get(f"/api/pcs/{identity}").json() == saved


def test_pg_preview_http_existing_csrf_and_query_policy_without_main_wiring(
    actors, pg_engine
):
    a, b = actors
    saved = create(a)
    published = PostgresCatalogRepository(pg_engine)
    svc = TowerRecommendationService(
        TowerRecommendationRepository(pg_engine, published.dataset_version)
    )
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[service] = lambda: svc
    # Reuse production sanitized exception handlers, not a second auth implementation.
    from upgradejusto.main import app as production

    app.exception_handlers.update(production.exception_handlers)
    path = f"/api/towers/{saved['id']}/recommendations/preview"
    with TestClient(app, base_url=ORIGIN, client=(a[3], 50010)) as client:
        client.cookies.update(a[0].cookies)
        response = client.post(
            path, headers=a[1], json=request().model_dump(mode="json")
        )
        assert response.status_code == 200, response.text
        assert response.json()["pc_revision"] == 1
        assert (
            client.post(
                path + "?unexpected=1",
                headers=a[1],
                json=request().model_dump(mode="json"),
            ).status_code
            == 403
        )
        assert (
            client.post(
                path,
                headers={"Origin": ORIGIN},
                json=request().model_dump(mode="json"),
            ).status_code
            == 403
        )
        assert (
            client.post(
                path,
                headers={**a[1], "Origin": "https://evil.example.test"},
                json=request().model_dump(mode="json"),
            ).status_code
            == 403
        )
        client.cookies.clear()
        client.cookies.update(b[0].cookies)
        assert (
            client.post(
                path, headers=b[1], json=request().model_dump(mode="json")
            ).status_code
            == 404
        )


def test_mounted_tower_preview_owner_csrf_revision_and_closed_payload(
    actors, pg_engine, monkeypatch
):
    a, b = actors
    saved = create(a)
    published = PostgresCatalogRepository(pg_engine)
    svc = TowerRecommendationService(
        TowerRecommendationRepository(pg_engine, published.dataset_version)
    )
    # Only service construction is overridden, retaining the real PG repository,
    # session/owner/CSRF/IP checks, middleware and actual main router registration.
    monkeypatch.setitem(app.dependency_overrides, service, lambda: svc)
    path = f"/api/towers/{saved['id']}/recommendations/preview"
    tower_path = f"/api/towers/{saved['id']}"
    original = a[0].get(tower_path)
    assert original.status_code == 200
    body = {
        "expected_pc_revision": saved["revision"],
        "objective": "productivity",
        "budget_ars": "500000.00",
        "price_condition": "cash",
        "mode": "manual_comparison",
        "workload": "blender-cpu",
        "materials": [],
        "alternatives": [
            {
                "key": "unidentified-cpu",
                "actions": [
                    {
                        "action": "replace_category",
                        "category": "cpu",
                        "candidates": [
                            {
                                "declared_model": "Synthetic unidentified CPU",
                                "quantity": 1,
                            }
                        ],
                    }
                ],
            }
        ],
    }
    response = a[0].post(path, headers=a[1], json=body)
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    result = response.json()
    assert result["pc_id"] == saved["id"]
    assert result["pc_revision"] == saved["revision"]
    assert result["mode"] == "manual_comparison"
    assert len(result["items"]) == 1
    item = result["items"][0]
    assert item["evaluation"]["verdict"] == "requiere_verificacion"
    assert item["benefit"]["status"] == "unknown"
    assert item["cost"]["total_ars"] is None
    assert item["status"] == "requires_verification"
    assert item["missing_fields"]
    assert b[0].post(path, headers=b[1], json=body).status_code == 404
    assert a[0].post(path, headers={"Origin": ORIGIN}, json=body).status_code == 403
    assert a[0].post(path + "?unexpected=1", headers=a[1], json=body).status_code == 403
    assert (
        a[0]
        .post(
            path,
            headers=a[1],
            json={**body, "expected_pc_revision": saved["revision"] + 1},
        )
        .status_code
        == 409
    )
    for extra in ({"technical_evidence": {}}, {"skip_rules": True}):
        assert a[0].post(path, headers=a[1], json={**body, **extra}).status_code == 422
    # No signature bypass: incomplete gateway headers are rejected by real ingress.
    assert (
        a[0]
        .post(
            path,
            headers={**a[1], "x-uj-client-ip": "127.0.0.1"},
            json=body,
        )
        .status_code
        == 403
    )
    assert a[0].post(path, headers=a[1], content=b"x" * 262145).status_code == 413
    assert a[0].get(tower_path).json() == original.json()
    assert a[0].get(f"/api/pcs/{saved['id']}").json() == saved


def test_pg_identity_relation_over50_pinned_version_and_server_component_set(pg_engine):
    # Owned synthetic relational rows only. No active pointer or existing
    # publication is mutated; this is a lookup proof, not a publisher gate.
    prefix = "synthetic-recommend-" + uuid4().hex
    versions = [prefix + "-a", prefix + "-b"]
    selected = [prefix + f"-{i:03}" for i in range(70)]
    outside = prefix + "-not-selected"
    source = {"id": "synthetic-retail-source", "url": "https://example.test/item"}

    def identity(mpn):
        return {
            "store": "compragamer",
            "product_id": "synthetic-product",
            "variant_key": "synthetic-variant",
            "mpn": mpn,
            "gtin": None,
            "source_url": source["url"],
            "category": "cpu",
            "rights_note": "Synthetic owned relational fixture",
        }

    try:
        with pg_engine.begin() as conn:
            conn.execute(
                datasets.insert(), [{"version": version} for version in versions]
            )
            for version in versions:
                conn.execute(
                    components.insert(),
                    [
                        {
                            "dataset_version": version,
                            "id": key,
                            "category": "cpu",
                            "name": "Unmatched retail display text",
                            "attributes": {},
                            "sources": [source],
                            "prices": [],
                            "image": None,
                        }
                        for key in [*selected, outside]
                    ],
                )
                conn.execute(
                    resources.insert(),
                    [
                        {
                            "dataset_version": version,
                            "component_id": key,
                            "identity": identity(
                                "100-100000926WOF"
                                if version == versions[0]
                                else "100-100000927BOX"
                            ),
                            "offers": [],
                            "image_evidence": None,
                        }
                        for key in [*selected, outside]
                    ],
                )
        with pg_engine.connect() as conn:
            rows = (
                conn.execute(
                    sa.select(components).where(
                        components.c.dataset_version == versions[0],
                        components.c.id.in_(selected),
                    )
                )
                .mappings()
                .all()
            )
            parts = tuple(
                Component.model_validate(
                    {
                        key: value
                        for key, value in row.items()
                        if key != "dataset_version"
                    }
                )
                for row in rows
            )
            found = published_identities(conn, versions[0], parts)
            assert len(found) == 70 and set(found) == set(selected)
            assert outside not in found
            assert {row["mpn"] for row in found.values()} == {"100-100000926WOF"}
            snapshot = PublishedCatalogSnapshot(versions[0], parts, ())
            catalog = TowerRecommendationCatalog(snapshot, found)
            late = catalog[selected[-1]]
            assert (
                reference(late, catalog, "productivity", "blender-cpu")["score"]
                == "214.38925258002163"
            )
            assert (
                published_identities(conn, versions[1], parts)[late.id]["mpn"]
                == "100-100000927BOX"
            )
            assert published_identities(conn, versions[0], ()) == {}
    finally:
        with pg_engine.begin() as conn:
            conn.execute(
                resources.delete().where(resources.c.dataset_version.in_(versions))
            )
            conn.execute(
                components.delete().where(components.c.dataset_version.in_(versions))
            )
            conn.execute(datasets.delete().where(datasets.c.version.in_(versions)))
