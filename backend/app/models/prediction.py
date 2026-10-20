"""
Battery Predictions Model
Stores AI model anomaly detection inferences and risk ratings.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Index
from app.models.base import Base


class BatteryPrediction(Base):
    __tablename__ = "battery_predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    telemetry_id = Column(Integer, nullable=True)
    
    anomaly_score = Column(Float, nullable=True)     # Score from ML model (e.g. Isolation Forest decision function)
    is_anomaly = Column(Boolean, default=False)      # True if classified as anomalous
    model_name = Column(String(64), default="IsolationForest_Baseline")
    model_version = Column(String(32), default="v1.0")
    model_status = Column(String(32), default="DEMO ONLY")  # NOT TRAINED, DEMO ONLY, VALIDATED
    risk_level = Column(String(32), default="LOW")          # LOW, MEDIUM, HIGH
    explanation = Column(String(512), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_prediction_device_timestamp", "device_id", "timestamp"),
    )
