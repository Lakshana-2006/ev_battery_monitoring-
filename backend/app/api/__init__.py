"""
API Routers Package
"""
from fastapi import APIRouter
from app.api.routes_telemetry import router as telemetry_router
from app.api.routes_devices import router as devices_router
from app.api.routes_alerts import router as alerts_router
from app.api.routes_predictions import router as predictions_router
from app.api.routes_simulation import router as simulation_router
from app.api.routes_model import router as model_router

api_router = APIRouter()
api_router.include_router(telemetry_router)
api_router.include_router(devices_router)
api_router.include_router(alerts_router)
api_router.include_router(predictions_router)
api_router.include_router(simulation_router)
api_router.include_router(model_router)
