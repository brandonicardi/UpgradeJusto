from fastapi.testclient import TestClient

from upgradejusto.main import app


def test_health_reports_only_process_response() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["content-type"].split(";", 1)[0] == "application/json"
