"""HTTP sobre el dataset real curado, sin mocks ni BD simulada."""

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from upgradejusto.catalog.repository import CuratedCatalogRepository
from upgradejusto.main import app

BASE = "/api/catalog/components"
IDS = [f"P{i:02}" for i in (*range(1, 11), *range(15, 19))]


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


def test_defaults_and_contract(client):
    response = client.get(BASE)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    body = response.json()
    assert set(body) == {"dataset_version", "items", "total", "page", "page_size"}
    assert body["dataset_version"] == "sprint31b-a-v1"
    assert (body["total"], body["page"], body["page_size"]) == (14, 1, 12)
    assert [item["id"] for item in body["items"]] == IDS[:12]
    for item in body["items"]:
        assert set(item) == {
            "id",
            "category",
            "name",
            "attributes",
            "sources",
            "prices",
            "image",
        }
        assert item["image"] is None
        assert all(v is None or isinstance(v, str) for v in item["attributes"].values())
        assert item["sources"]
        for source in item["sources"]:
            assert set(source) == {"id", "url"}
            assert source["id"].startswith("F")
            assert source["url"].startswith("https://")


@pytest.mark.parametrize("size", [1, 3, 12, 50])
def test_paginated_traversal_and_detail(client, size):
    found = []
    for page in range(1, (14 + size - 1) // size + 1):
        response = client.get(BASE, params={"page": page, "page_size": size})
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 14
        assert (body["page"], body["page_size"]) == (page, size)
        for item in body["items"]:
            detail = client.get(f"{BASE}/{item['id']}")
            assert detail.status_code == 200
            assert detail.json() == item
            found.append(item["id"])
    assert found == IDS


@pytest.mark.parametrize(
    ("category", "expected"),
    [
        ("cpu", ["P01", "P02"]),
        ("motherboard", ["P03", "P17", "P18"]),
        ("ram", ["P04", "P05"]),
        ("gpu", ["P06", "P15", "P16"]),
        ("psu", ["P07", "P08"]),
        ("case", ["P09", "P10"]),
    ],
)
def test_six_categories(client, category, expected):
    response = client.get(BASE, params={"category": category})
    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == expected


def test_and_search_before_pagination(client):
    response = client.get(
        BASE, params={"category": "gpu", "q": "  aSuS  ", "page_size": 2, "page": 2}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert [item["id"] for item in body["items"]] == ["P16"]
    body = client.get(BASE, params={"category": "cpu", "q": "ASUS"}).json()
    assert (body["items"], body["total"]) == ([], 0)
    body = client.get(BASE, params={"q": "5700x"}).json()
    assert [item["id"] for item in body["items"]] == ["P02"]


@pytest.mark.parametrize("q", ["", "   ", "\t"])
def test_empty_search(client, q):
    assert client.get(BASE, params={"q": q}).json() == client.get(BASE).json()


def test_empty_results_and_page_bounds(client):
    body = client.get(BASE, params={"q": "no-such-component"}).json()
    assert (body["items"], body["total"]) == ([], 0)
    response = client.get(BASE, params={"page": 10000, "page_size": 50})
    assert response.status_code == 200
    body = response.json()
    assert (body["items"], body["total"], body["page"], body["page_size"]) == (
        [],
        14,
        10000,
        50,
    )
    assert client.get(BASE, params={"q": "x" * 100}).status_code == 200


@pytest.mark.parametrize(
    ("parameter", "value"),
    [
        ("category", "cooler"),
        ("category", "GPU"),
        ("category", ""),
        ("page", "0"),
        ("page", "10001"),
        ("page", "1.5"),
        ("page", "no"),
        ("page_size", "0"),
        ("page_size", "51"),
        ("page_size", "1.5"),
        ("q", "x" * 101),
    ],
)
def test_invalid_parameters(client, parameter, value):
    response = client.get(BASE, params={parameter: value})
    assert response.status_code == 422
    assert any(
        e["loc"] == ["query", parameter] and e["msg"] for e in response.json()["detail"]
    )


@pytest.mark.parametrize("id", ["P99", "P11", "P12", "P13", "P14", "p01"])
def test_not_found(client, id):
    response = client.get(f"{BASE}/{id}")
    assert response.status_code == 404
    assert response.json() == {"detail": "Component not found"}


def test_unknowns_not_inferred(client):
    p16 = client.get(f"{BASE}/P16").json()
    assert p16["attributes"]["vram"] is None
    assert p16["prices"] == []
    assert client.get(f"{BASE}/P10").json()["attributes"]["gpu_height_limit"] is None
    assert client.get(f"{BASE}/P03").json()["attributes"]["installed_bios"] is None
    p08 = client.get(f"{BASE}/P08").json()
    assert p08["attributes"]["spare_pcie_cable_count"] is None
    assert "Conflicto F10/F11" in p08["attributes"]["evidence_note"]
    assert {s["id"] for s in p08["sources"]} == {"F10", "F11"}


def test_historical_prices(client):
    items = client.get(BASE, params={"page_size": 50}).json()["items"]
    prices = {item["id"]: item["prices"] for item in items if item["prices"]}
    assert {id: [p["amount"] for p in values] for id, values in prices.items()} == {
        "P02": ["446120", "484913"],
        "P05": ["383208.99"],
        "P08": ["175898"],
        "P15": ["1706232", "1894299"],
    }
    for values in prices.values():
        for price in values:
            assert set(price) == {"amount", "currency", "date", "source"}
            assert isinstance(price["amount"], str) and Decimal(price["amount"]) > 0
            assert price["currency"] == "ARS"
            assert price["date"] == "2026-10-20"
            assert "Histórico" in price["source"] and "https://" in price["source"]
    assert "por módulo individual, no kit" in prices["P05"][0]["source"]
    assert "envío desconocido" in prices["P05"][0]["source"]
    assert "condición no explicitada" in prices["P08"][0]["source"]
    assert "condición a confirmar" in prices["P02"][0]["source"]


def test_readonly_and_no_shared_mutation(client):
    assert client.post(BASE, json={"name": "invented"}).status_code == 405
    assert client.delete(f"{BASE}/P01").status_code == 405
    repository = CuratedCatalogRepository()
    component = repository.get("P01")
    component.attributes["socket"] = "changed"
    assert repository.get("P01").attributes["socket"] == "AM4"
    assert client.get(f"{BASE}/P01").json()["attributes"]["socket"] == "AM4"
    assert client.get("/health").json() == {"status": "ok"}
