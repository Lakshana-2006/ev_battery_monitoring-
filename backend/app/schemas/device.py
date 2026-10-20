"""
Pydantic Schemas for Device Management
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    chemistry: Optional[str] = None
    series_cells: Optional[int] = None
    capacity_ah: Optional[float] = None


class DeviceResponse(BaseModel):
    device_id: str
    name: str
    chemistry: str
    series_cells: int
    capacity_ah: float
    status: str          # ONLINE, STALE, DISCONNECTED
    data_source: str     # HARDWARE, SIMULATION
    last_seen: Optional[datetime] = None
    firmware_version: Optional[str] = None
    ip_address: Optional[str] = None
    wifi_rssi: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
