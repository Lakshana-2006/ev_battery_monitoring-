"""
Device Model
Tracks registered microcontrollers (e.g. ESP8266 NodeMCU) and battery packs.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime
from app.models.base import Base


class Device(Base):
    __tablename__ = "devices"

    device_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False, default="EV Battery Pack 001")
    chemistry = Column(String(32), default="LI_ION")
    series_cells = Column(Integer, default=3)
    capacity_ah = Column(Float, default=2.5)
    status = Column(String(32), default="DISCONNECTED")  # ONLINE, STALE, DISCONNECTED
    data_source = Column(String(32), default="HARDWARE")  # HARDWARE, SIMULATION
    last_seen = Column(DateTime, nullable=True)
    firmware_version = Column(String(32), default="v1.0.0-esp8266")
    ip_address = Column(String(64), nullable=True)
    wifi_rssi = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
