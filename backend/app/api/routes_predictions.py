"""
Predictions REST API Endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.session import get_db
from app.models.prediction import BatteryPrediction
from app.schemas.prediction import PredictionResponse
from app.config import settings

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.get("/latest", response_model=Optional[PredictionResponse])
def get_latest_prediction(
    device_id: str = Query(settings.DEFAULT_DEVICE_ID),
    db: Session = Depends(get_db)
):
    """Returns the most recent AI anomaly prediction logged for the device."""
    pred = (
        db.query(BatteryPrediction)
        .filter(BatteryPrediction.device_id == device_id)
        .order_by(desc(BatteryPrediction.timestamp))
        .first()
    )
    if not pred:
        return PredictionResponse(
            device_id=device_id,
            timestamp=None,
            anomaly_score=None,
            is_anomaly=False,
            model_name="IsolationForest_Baseline",
            model_version="v1.0.0",
            model_status="NOT TRAINED",
            risk_level="LOW",
            explanation="No predictions recorded yet. Start simulation or publish hardware telemetry."
        )
    return pred


@router.get("/history", response_model=List[PredictionResponse])
def get_prediction_history(
    device_id: str = Query(settings.DEFAULT_DEVICE_ID),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Returns a list of recent model inference outputs."""
    return (
        db.query(BatteryPrediction)
        .filter(BatteryPrediction.device_id == device_id)
        .order_by(desc(BatteryPrediction.timestamp))
        .limit(limit)
        .all()
    )
