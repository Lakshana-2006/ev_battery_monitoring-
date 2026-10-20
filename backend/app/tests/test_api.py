"""
Integration Tests for FastAPI Endpoints
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

from app.database.init_db import init_db

@pytest.fixture(autouse=True, scope="module")
def setup_api_db():
    init_db()
    yield

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "EV Battery" in data["app"]


def test_list_devices_endpoint():
    response = client.get("/api/devices")
    assert response.status_code == 200
    devices = response.json()
    assert isinstance(devices, list)
    assert len(devices) >= 1
    assert devices[0]["device_id"] == "ev-battery-001"


def test_telemetry_history_endpoint():
    response = client.get("/api/telemetry/history?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


def test_alerts_endpoint():
    response = client.get("/api/alerts")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "active_count" in data


def test_model_status_endpoint():
    response = client.get("/api/model/status")
    assert response.status_code == 200
    data = response.json()
    assert data["algorithm"] == "IsolationForest"
    # Status should strictly not claim false validation
    assert data["status"] in ["NOT TRAINED", "DEMO ONLY", "VALIDATED"]
