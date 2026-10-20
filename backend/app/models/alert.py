"""
Alert Model
Stores rule-based threshold violations, hardware faults, and communication alerts.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from app.models.base import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(64), nullable=False, index=True)
    alert_type = Column(String(64), nullable=False, index=True)  # OVERVOLTAGE, OVERTEMP, etc.
    severity = Column(String(32), nullable=False, default="WARNING")  # INFO, WARNING, CRITICAL
    message = Column(String(512), nullable=False)
    value = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    status = Column(String(32), default="ACTIVE", index=True)  # ACTIVE, ACKNOWLEDGED, RESOLVED
    
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        Index("idx_alert_device_status", "device_id", "status"),
        Index("idx_alert_duplicate_check", "device_id", "alert_type", "status"),
    )
