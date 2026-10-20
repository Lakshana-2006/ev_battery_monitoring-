"""
AI Model and SOH Status REST API Endpoints
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.model_metadata import ModelMetadata
from app.schemas.prediction import ModelStatusResponse
from app.ai.anomaly_detector import anomaly_detector
from app.ai.train_model import train_isolation_forest_model
from app.services.soh_estimator import soh_service

router = APIRouter(prefix="/model", tags=["AI Model"])


@router.get("/status", response_model=ModelStatusResponse)
def get_model_status(db: Session = Depends(get_db)):
    """Returns AI model state, training samples, algorithm, and validation status."""
    meta = db.query(ModelMetadata).filter(ModelMetadata.model_name == "IsolationForest_Baseline").first()
    
    status_val = anomaly_detector.model_status
    version_val = anomaly_detector.model_version
    samples_val = meta.training_samples if meta else 0
    training_date = meta.training_date if meta else None
    
    hyperparams = {}
    if meta and meta.hyperparameters:
        try:
            hyperparams = json.loads(meta.hyperparameters)
        except Exception:
            pass

    return ModelStatusResponse(
        model_name="IsolationForest_Baseline",
        model_version=version_val,
        algorithm="IsolationForest",
        status=status_val,
        feature_names=["voltage_v", "current_a", "temperature_c", "power_w"],
        training_samples=samples_val,
        hyperparameters=hyperparams,
        training_date=training_date,
        is_active=True,
        description=meta.description if meta else "Baseline anomaly detection model."
    )


@router.post("/train")
def train_model(
    force_demo_mode: bool = Query(False, description="Set status to DEMO ONLY even if samples are sufficient"),
    db: Session = Depends(get_db)
):
    """
    Fits an Isolation Forest anomaly detection model on stored historical telemetry.
    Updates the active model artifact and sets status accordingly.
    """
    result = train_isolation_forest_model(db, force_demo_mode=force_demo_mode)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.get("/soh-status")
def get_soh_status():
    """Returns the current SOH status and explanation of why SOH cannot be derived from voltage alone."""
    return soh_service.get_status()
