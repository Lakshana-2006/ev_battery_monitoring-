"""
Alerts REST API Endpoints
"""
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.session import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertResponse, AlertUpdate, AlertPaginatedResponse

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=AlertPaginatedResponse)
def list_alerts(
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, ACKNOWLEDGED, RESOLVED"),
    severity: Optional[str] = Query(None, description="Filter by severity: INFO, WARNING, CRITICAL"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Lists battery safety alerts with severity counters and status filtering."""
    query = db.query(Alert)
    
    if status:
        query = query.filter(Alert.status == status.upper())
    if severity:
        query = query.filter(Alert.severity == severity.upper())

    total = query.count()
    items = query.order_by(desc(Alert.created_at)).offset(offset).limit(limit).all()

    # Aggregate metric counters
    active_count = db.query(Alert).filter(Alert.status == "ACTIVE").count()
    warning_count = db.query(Alert).filter(Alert.status == "ACTIVE", Alert.severity == "WARNING").count()
    critical_count = db.query(Alert).filter(Alert.status == "ACTIVE", Alert.severity == "CRITICAL").count()

    return AlertPaginatedResponse(
        total=total,
        active_count=active_count,
        warning_count=warning_count,
        critical_count=critical_count,
        items=items
    )


@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(alert_id: int, payload: AlertUpdate, db: Session = Depends(get_db)):
    """Updates the status of an alert (ACKNOWLEDGED or RESOLVED)."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    target_status = payload.status.upper()
    now = datetime.now(timezone.utc)

    if target_status == "ACKNOWLEDGED":
        alert.status = "ACKNOWLEDGED"
        alert.acknowledged_at = now
    elif target_status == "RESOLVED":
        alert.status = "RESOLVED"
        alert.resolved_at = now
    else:
        raise HTTPException(status_code=400, detail="Status must be 'ACKNOWLEDGED' or 'RESOLVED'")

    db.commit()
    db.refresh(alert)
    return alert
