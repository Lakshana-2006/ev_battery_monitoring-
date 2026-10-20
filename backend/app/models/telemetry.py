"""
Battery Telemetry Model
Stores incoming and validated sensor readings.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Index
from app.models.base import Base


class BatteryTelemetry(Base):
    __tablename__ = "battery_telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    sequence = Column(Integer, nullable=True)
    
    # Core Sensor Measurements
    voltage_v = Column(Float, nullable=True)
    current_a = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    
    # State Estimations (null when uncalibrated/unavailable)
    soc_pct = Column(Float, nullable=True)
    soh_pct = Column(Float, nullable=True)
    
    # Derived Physical Metrics
    power_w = Column(Float, nullable=True)
    
    # Data Origin & Integrity
    source = Column(String(32), default="hardware", index=True)  # "hardware" or "simulation"
    sensor_status = Column(String(64), default="OK")             # "OK", "VOLTAGE_FAULT", etc.
    is_valid = Column(Boolean, default=True)
    validation_error = Column(String(256), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_telemetry_device_timestamp", "device_id", "timestamp"),
        Index("idx_telemetry_source_timestamp", "source", "timestamp"),
    )
