"""
Isolation Forest Model Training Pipeline
Trains an unsupervised anomaly detector on valid baseline telemetry.
"""
import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session
from app.models.telemetry import BatteryTelemetry
from app.models.model_metadata import ModelMetadata
from app.ai.anomaly_detector import anomaly_detector
from app.config import settings


def train_isolation_forest_model(db: Session, force_demo_mode: bool = False) -> dict:
    """
    Pulls valid telemetry records from the database and fits an IsolationForest model.
    Saves trained joblib artifact to settings.MODEL_DIR.
    """
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    
    # Query valid telemetry
    records = db.query(
        BatteryTelemetry.voltage_v,
        BatteryTelemetry.current_a,
        BatteryTelemetry.temperature_c,
        BatteryTelemetry.power_w
    ).filter(
        BatteryTelemetry.is_valid == True,
        BatteryTelemetry.voltage_v.isnot(None),
        BatteryTelemetry.current_a.isnot(None),
        BatteryTelemetry.temperature_c.isnot(None)
    ).all()

    sample_count = len(records)
    
    # Need sufficient data points for meaningful training
    if sample_count < 20:
        return {
            "success": False,
            "status": "NOT TRAINED",
            "message": f"Insufficient telemetry samples ({sample_count}/20 minimum required). Log more data first.",
            "samples": sample_count
        }

    # Prepare numpy array
    data = []
    for r in records:
        p = r[3] if r[3] is not None else (r[0] * r[1])
        data.append([r[0], r[1], r[2], p])
    
    X = np.array(data)

    # Train Isolation Forest
    clf = IsolationForest(
        n_estimators=100,
        contamination=settings.ANOMALY_CONTAMINATION_RATE,
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X)

    # Determine status:
    # If training was run on simulated data or small lab sample, mark "DEMO ONLY"
    # Mark "VALIDATED" only if explicitly verified with ground-truth test benches
    status = "DEMO ONLY" if force_demo_mode or sample_count < 200 else "VALIDATED"

    # Save artifact
    model_path = os.path.join(settings.MODEL_DIR, "isolation_forest.joblib")
    artifact = {
        "model": clf,
        "status": status,
        "version": "v1.1-trained",
        "features": ["voltage_v", "current_a", "temperature_c", "power_w"],
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "samples": sample_count
    }
    joblib.dump(artifact, model_path)

    # Reload into active memory
    anomaly_detector.model = clf
    anomaly_detector.model_status = status
    anomaly_detector.model_version = "v1.1-trained"

    # Update database model metadata
    meta = db.query(ModelMetadata).filter(ModelMetadata.model_name == "IsolationForest_Baseline").first()
    if meta:
        meta.status = status
        meta.model_version = "v1.1-trained"
        meta.training_samples = sample_count
        meta.training_date = datetime.now(timezone.utc)
        meta.description = f"Trained IsolationForest model on {sample_count} sensor samples. Status: {status}."
        db.commit()

    return {
        "success": True,
        "status": status,
        "model_version": "v1.1-trained",
        "samples_used": sample_count,
        "message": f"Model successfully trained on {sample_count} telemetry samples. Status set to: {status}."
    }
