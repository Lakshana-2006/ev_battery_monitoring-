"""
Pydantic Schemas for Telemetry Ingestion and Responses
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict


class TelemetryInput(BaseModel):
    """
    Schema for raw telemetry received via MQTT or REST API from ESP8266 or simulator.
    Supports null values for uncalibrated/unavailable sensors as mandated.
    """
    device_id: str = Field(..., description="Unique identifier of the battery monitoring node")
    timestamp: Optional[datetime] = Field(default=None, description="ISO-8601 UTC timestamp")
    sequence: Optional[int] = Field(default=None, description="Monotonically increasing packet sequence counter")
    
    # Core Sensor Measurements (Nullable if a sensor fails or is disconnected)
    voltage_v: Optional[float] = Field(default=None, description="Total battery pack voltage in Volts")
    current_a: Optional[float] = Field(default=None, description="Battery current in Amperes (+ = charging, - = discharging)")
    temperature_c: Optional[float] = Field(default=None, description="Battery cell/pack temperature in degrees Celsius")
    
    # Estimations (Null unless calibrated)
    soc_pct: Optional[float] = Field(default=None, description="State of Charge percentage (0-100%)")
    soh_pct: Optional[float] = Field(default=None, description="State of Health percentage (null if not calibrated)")
    
    source: str = Field(default="hardware", description="Origin of reading: 'hardware' or 'simulation'")
    sensor_status: Optional[str] = Field(default="OK", description="Hardware sensor status flags")

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        low = v.lower()
        if low not in ["hardware", "simulation"]:
            return "hardware"
        return low


class TelemetryResponse(BaseModel):
    """Schema for returning telemetry records to API clients and WebSockets."""
    id: Optional[int] = None
    device_id: str
    timestamp: datetime
    sequence: Optional[int] = None
    voltage_v: Optional[float] = None
    current_a: Optional[float] = None
    temperature_c: Optional[float] = None
    soc_pct: Optional[float] = None
    soh_pct: Optional[float] = None
    power_w: Optional[float] = None
    source: str
    sensor_status: str
    is_valid: bool
    validation_error: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TelemetryPaginatedResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[TelemetryResponse]
