"""
Model Metadata Model
Tracks AI model versions, validation status, and training metadata.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.models.base import Base


class ModelMetadata(Base):
    __tablename__ = "model_metadata"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(64), unique=True, nullable=False)
    model_version = Column(String(32), nullable=False, default="v1.0")
    algorithm = Column(String(64), default="IsolationForest")
    status = Column(String(32), default="NOT TRAINED")  # NOT TRAINED, DEMO ONLY, TRAINING / VALIDATION, VALIDATED
    feature_names = Column(String(256), default="voltage_v,current_a,temperature_c,power_w")
    training_samples = Column(Integer, default=0)
    hyperparameters = Column(String(512), default="{}")
    training_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    description = Column(String(512), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
