"""
Unit Tests for Battery Safety Rules Engine
"""
from datetime import datetime, timezone
import pytest
from app.database.session import SessionLocal, engine
from app.models.base import Base
from app.models.alert import Alert
from app.schemas.telemetry import TelemetryInput
from app.services.safety_rules import evaluate_telemetry_safety
from app.config import settings


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Clean alerts
    db.query(Alert).delete()
    db.commit()
    yield db
    db.close()


def test_normal_telemetry_safety(setup_db):
    db = setup_db
    # 3S pack normal voltage 12.0V (4.0V/cell), 3.0A discharge, 28°C
    telemetry = TelemetryInput(
        device_id=settings.DEFAULT_DEVICE_ID,
        timestamp=datetime.now(timezone.utc),
        voltage_v=12.0,
        current_a=-3.0,
        temperature_c=28.0,
        source="hardware"
    )
    result = evaluate_telemetry_safety(telemetry, db)
    assert result.is_valid is True
    assert len(result.new_alerts) == 0


def test_overvoltage_critical_alert(setup_db):
    db = setup_db
    # 3S pack with 13.0V (exceeds critical 4.28 * 3 = 12.84V)
    telemetry = TelemetryInput(
        device_id=settings.DEFAULT_DEVICE_ID,
        timestamp=datetime.now(timezone.utc),
        voltage_v=13.0,
        current_a=1.0,
        temperature_c=30.0,
        source="hardware"
    )
    result = evaluate_telemetry_safety(telemetry, db)
    assert result.is_valid is True
    assert len(result.new_alerts) == 1
    assert result.new_alerts[0]["alert_type"] == "OVERVOLTAGE"
    assert result.new_alerts[0]["severity"] == "CRITICAL"


def test_overtemperature_critical_alert(setup_db):
    db = setup_db
    telemetry = TelemetryInput(
        device_id=settings.DEFAULT_DEVICE_ID,
        timestamp=datetime.now(timezone.utc),
        voltage_v=11.5,
        current_a=-5.0,
        temperature_c=58.0,  # Exceeds 55.0°C critical
        source="hardware"
    )
    result = evaluate_telemetry_safety(telemetry, db)
    assert any(a["alert_type"] == "OVERTEMP" and a["severity"] == "CRITICAL" for a in result.new_alerts)


def test_sensor_out_of_range_invalidates(setup_db):
    db = setup_db
    telemetry = TelemetryInput(
        device_id=settings.DEFAULT_DEVICE_ID,
        timestamp=datetime.now(timezone.utc),
        voltage_v=99.9,  # Unrealistic voltage
        current_a=0.0,
        temperature_c=25.0,
        source="hardware"
    )
    result = evaluate_telemetry_safety(telemetry, db)
    assert result.is_valid is False
    assert "implausible" in result.validation_error.lower()
