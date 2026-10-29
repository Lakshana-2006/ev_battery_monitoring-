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
    """Returns metadata for the currently loaded anomaly detection model."""
    model = anomaly_detector.model
    feature_names = list(anomaly_detector.feature_names)

    hyperparams = {}
    if model is not None and hasattr(model, "get_params"):
        params = model.get_params()
        hyperparams = {
            "n_estimators": params.get("n_estimators"),
            "contamination": params.get("contamination"),
            "random_state": params.get("random_state"),
        }

    return ModelStatusResponse(
        model_name="NASA_BatteryAging_IsolationForest",
        model_version=anomaly_detector.model_version,
        algorithm="IsolationForest",
        status=anomaly_detector.model_status,
        feature_names=feature_names,
        training_samples=40228,
        hyperparameters=hyperparams,
        training_date=None,
        is_active=model is not None,
        description=(
            "Experimental Isolation Forest trained on NASA battery aging data. "
            "Anomaly screening only; predictions do not establish battery safety."
        ),
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
