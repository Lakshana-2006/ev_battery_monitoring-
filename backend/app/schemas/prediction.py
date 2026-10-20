"""
Pydantic Schemas for AI Anomaly Predictions and Model Status
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PredictionResponse(BaseModel):
    id: Optional[int] = None
    device_id: str
    timestamp: Optional[datetime] = None
    telemetry_id: Optional[int] = None
    anomaly_score: Optional[float] = None
    is_anomaly: bool
    model_name: str
    model_version: str
    model_status: str       # NOT TRAINED, DEMO ONLY, VALIDATED
    risk_level: str         # LOW, MEDIUM, HIGH
    explanation: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ModelStatusResponse(BaseModel):
    model_name: str
    model_version: str
    algorithm: str
    status: str
    feature_names: List[str]
    training_samples: int
    hyperparameters: dict
    training_date: Optional[datetime] = None
    is_active: bool
    description: Optional[str] = None
