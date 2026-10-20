"""
Main FastAPI Application Entrypoint
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.init_db import init_db
from app.mqtt.client import mqtt_service
from app.services.simulator import simulator
from app.services.websocket_manager import ws_manager
from app.api import api_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ev_battery_app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("Initializing database tables and baseline records...")
    init_db()

    logger.info("Starting MQTT client service...")
    mqtt_service.start()

    logger.info(f"{settings.APP_NAME} started successfully!")
    yield

    # Shutdown sequence
    logger.info("Shutting down simulation and MQTT services...")
    simulator.stop()
    mqtt_service.stop()
    logger.info("Shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Edge AI-based Predictive Battery Safety and Health Monitoring System for Electric Vehicles using IoT",
    lifespan=lifespan
)

# CORS Middleware for React frontend Vite dev server & production builds
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/api/health")
def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "mqtt_connected": mqtt_service.is_connected,
        "simulator_active": simulator.is_running,
        "chemistry": settings.BATTERY_CHEMISTRY,
        "series_cells": settings.SERIES_CELLS,
        "capacity_ah": settings.BATTERY_CAPACITY_AH
    }


@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time live telemetry, safety alerts,
    and device connectivity notifications.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection open; receive optional control messages or pings from dashboard
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"[WS] WebSocket error: {e}")
        ws_manager.disconnect(websocket)
