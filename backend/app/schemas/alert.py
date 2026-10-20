"""
Pydantic Schemas for Battery Alerts
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AlertUpdate(BaseModel):
    status: str = Field(..., description="Target status: 'ACKNOWLEDGED' or 'RESOLVED'")


class AlertResponse(BaseModel):
    id: int
    device_id: str
    alert_type: str
    severity: str        # INFO, WARNING, CRITICAL
    message: str
    value: Optional[float] = None
    threshold: Optional[float] = None
    status: str          # ACTIVE, ACKNOWLEDGED, RESOLVED
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertPaginatedResponse(BaseModel):
    total: int
    active_count: int
    warning_count: int
    critical_count: int
    items: List[AlertResponse]
