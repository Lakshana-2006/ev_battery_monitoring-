"""
Devices REST API Endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.session import get_db
from app.models.device import Device
from app.models.telemetry import BatteryTelemetry
from app.models.prediction import BatteryPrediction
from app.schemas.device import DeviceResponse, DeviceUpdate
from app.services.device_tracker import device_tracker
from app.services.soc_estimator import soc_service
from app.config import settings

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=List[DeviceResponse])
def list_devices(db: Session = Depends(get_db)):
    """Lists all registered EV battery monitoring devices."""
    devices = db.query(Device).all()
    # Update real-time connection state before responding
    for d in devices:
        status_info = device_tracker.get_device_status(d.device_id, db)
        d.status = status_info["connectivity"]
    return devices


@router.get("/{device_id}/latest")
def get_device_latest(device_id: str, db: Session = Depends(get_db)):
    """
    Returns the most recent snapshot for a device:
    - Latest telemetry (V, I, T, SOC, SOH)
    - Real-time connection badge (LIVE HARDWARE, DEMO SIMULATION, STALE DATA, DISCONNECTED)
    - Latest AI anomaly prediction
    """
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found.")

    latest_telemetry = (
        db.query(BatteryTelemetry)
        .filter(BatteryTelemetry.device_id == device_id)
        .order_by(desc(BatteryTelemetry.timestamp))
        .first()
    )

    latest_prediction = (
        db.query(BatteryPrediction)
        .filter(BatteryPrediction.device_id == device_id)
        .order_by(desc(BatteryPrediction.timestamp))
        .first()
    )

    status_info = device_tracker.get_device_status(device_id, db)

    return {
        "device": {
            "device_id": device.device_id,
            "name": device.name,
            "chemistry": device.chemistry,
            "series_cells": device.series_cells,
            "capacity_ah": device.capacity_ah,
            "status": status_info["connectivity"],
            "badge": status_info["badge"],
            "data_source": device.data_source,
            "last_seen": status_info["last_seen"],
            "elapsed_seconds": status_info.get("elapsed_seconds")
        },
        "latest_telemetry": {
            "id": latest_telemetry.id if latest_telemetry else None,
            "timestamp": latest_telemetry.timestamp.isoformat() if latest_telemetry else None,
            "sequence": latest_telemetry.sequence if latest_telemetry else None,
            "voltage_v": latest_telemetry.voltage_v if latest_telemetry else None,
            "current_a": latest_telemetry.current_a if latest_telemetry else None,
            "temperature_c": latest_telemetry.temperature_c if latest_telemetry else None,
            "soc_pct": latest_telemetry.soc_pct if latest_telemetry else None,
            "soh_pct": latest_telemetry.soh_pct if latest_telemetry else None,
            "power_w": latest_telemetry.power_w if latest_telemetry else None,
            "source": latest_telemetry.source if latest_telemetry else "UNKNOWN",
            "sensor_status": latest_telemetry.sensor_status if latest_telemetry else "UNKNOWN",
            "is_valid": latest_telemetry.is_valid if latest_telemetry else False
        } if latest_telemetry else None,
        "latest_prediction": {
            "is_anomaly": latest_prediction.is_anomaly if latest_prediction else False,
            "anomaly_score": latest_prediction.anomaly_score if latest_prediction else None,
            "model_name": latest_prediction.model_name if latest_prediction else "IsolationForest_Baseline",
            "model_status": latest_prediction.model_status if latest_prediction else "NOT TRAINED",
            "risk_level": latest_prediction.risk_level if latest_prediction else "LOW",
            "explanation": latest_prediction.explanation if latest_prediction else "No prediction logged yet."
        } if latest_prediction else None
    }


@router.patch("/{device_id}", response_model=DeviceResponse)
def update_device(device_id: str, payload: DeviceUpdate, db: Session = Depends(get_db)):
    """Allows updating device configurations (chemistry, cell series count, capacity)."""
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if payload.name is not None:
        device.name = payload.name
    if payload.chemistry is not None:
        device.chemistry = payload.chemistry
    if payload.series_cells is not None:
        device.series_cells = payload.series_cells
        settings.SERIES_CELLS = payload.series_cells
    if payload.capacity_ah is not None:
        device.capacity_ah = payload.capacity_ah
        settings.BATTERY_CAPACITY_AH = payload.capacity_ah
        soc_service.capacity_ah = payload.capacity_ah
        soc_service.capacity_as = payload.capacity_ah * 3600.0

    db.commit()
    db.refresh(device)
    return device


@router.post("/{device_id}/calibrate-soc")
def calibrate_device_soc(device_id: str, soc_percent: float = Query(..., ge=0.0, le=100.0)):
    """Manually resets the Coulomb Counting SOC baseline to a known level."""
    soc_service.reset_state(soc_percent)
    return {
        "status": "success",
        "message": f"Coulomb counting SOC recalibrated to {soc_percent:.1f}% for device {device_id}."
    }
