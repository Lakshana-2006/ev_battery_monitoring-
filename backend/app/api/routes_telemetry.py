"""
Telemetry REST API Endpoints
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.session import get_db
from app.models.telemetry import BatteryTelemetry
from app.schemas.telemetry import TelemetryInput, TelemetryResponse, TelemetryPaginatedResponse
from app.services.telemetry_pipeline import process_telemetry_pipeline

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def ingest_telemetry(payload: TelemetryInput):
    """
    Direct REST ingestion endpoint for ESP8266 HTTP fallback or test gateways.
    Saves to DB, checks safety rules, executes AI anomaly check, and broadcasts.
    """
    try:
        result = process_telemetry_pipeline(payload)
        return {
            "status": "success",
            "message": "Telemetry processed successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process telemetry: {str(e)}")


@router.get("/history", response_model=TelemetryPaginatedResponse)
def get_telemetry_history(
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    source: Optional[str] = Query(None, description="Filter by source: 'hardware' or 'simulation'"),
    limit: int = Query(100, ge=1, le=1000, description="Page size limit"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db)
):
    """
    Fetches paginated historical telemetry with filtering by device and data source.
    """
    query = db.query(BatteryTelemetry)
    
    if device_id:
        query = query.filter(BatteryTelemetry.device_id == device_id)
    if source:
        query = query.filter(BatteryTelemetry.source == source.lower())

    total = query.count()
    items = query.order_by(desc(BatteryTelemetry.timestamp)).offset(offset).limit(limit).all()

    return TelemetryPaginatedResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=items
    )
