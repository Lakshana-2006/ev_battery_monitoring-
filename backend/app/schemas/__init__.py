"""
Pydantic Schemas Package
"""
from app.schemas.telemetry import TelemetryInput, TelemetryResponse, TelemetryPaginatedResponse
from app.schemas.device import DeviceResponse, DeviceUpdate
from app.schemas.alert import AlertResponse, AlertUpdate, AlertPaginatedResponse
from app.schemas.prediction import PredictionResponse, ModelStatusResponse

__all__ = [
    "TelemetryInput",
    "TelemetryResponse",
    "TelemetryPaginatedResponse",
    "DeviceResponse",
    "DeviceUpdate",
    "AlertResponse",
    "AlertUpdate",
    "AlertPaginatedResponse",
    "PredictionResponse",
    "ModelStatusResponse",
]
