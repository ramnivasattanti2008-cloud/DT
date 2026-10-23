"""
Integration Tests for FastAPI Endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_serc_endpoints(client):
    # Test checklist definitions
    chk_res = client.get("/api/serc/checklist")
    assert chk_res.status_code == 200
    assert len(chk_res.json()["criteria"]) == 10

    # Test 20 historical studies
    hist_res = client.get("/api/serc/historical-studies")
    assert hist_res.status_code == 200
    assert len(hist_res.json()["studies"]) == 20

    # Test inter-rater stats
    stats_res = client.get("/api/serc/inter-rater-stats")
    assert stats_res.status_code == 200
    assert stats_res.json()["cohens_kappa_unweighted"] == pytest.approx(0.8672)

    # Test live calculator
    calc_res = client.post(
        "/api/serc/calculate",
        json={
            "grades": {f"C{i}": "1.0" for i in range(1, 11)},
            "f1_score": 0.92,
            "fpr": 0.003,
            "omega": 2.0,
        },
    )
    assert calc_res.status_code == 200
    data = calc_res.json()
    assert data["rcs_percentage"] == 100.0
    assert data["quality_tier"] == "Tier A"
    assert data["cari_score"] is not None


def test_classifier_inference(client):
    # Test canonical sample classification
    res = client.post(
        "/api/classifiers/classify",
        json={
            "text": "Subject: quarterly forecast pipeline review | Body: please find attached the spreadsheet allocation for engineering deployment",
            "protocol": "Protocol B",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["predictions"]) == 4
    # Corporate ham should be classified as ham
    for pred in data["predictions"]:
        assert pred["predicted_label"] == "ham"
        assert pred["predicted_probability"] < 0.50
