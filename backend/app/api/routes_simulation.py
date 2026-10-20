"""
Simulation Controls REST API Endpoints
"""
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from app.services.simulator import simulator

router = APIRouter(prefix="/simulation", tags=["Simulation"])


class ScenarioRequest(BaseModel):
    scenario: str  # NORMAL, TEMPERATURE_WARNING, ABNORMAL_CURRENT, SENSOR_FAULT, STALE_TELEMETRY, DISCONNECTED


@router.get("/status")
def get_simulation_status():
    """Returns current active simulator state and scenario."""
    return {
        "is_running": simulator.is_running,
        "scenario": simulator.scenario,
        "sequence": simulator.sequence,
        "pause_transmissions": simulator.pause_transmissions
    }


@router.post("/start")
def start_simulation(scenario: str = Query("NORMAL")):
    """Starts background telemetry simulation with specified scenario."""
    valid_scenarios = [
        "NORMAL", "TEMPERATURE_WARNING", "ABNORMAL_CURRENT",
        "SENSOR_FAULT", "STALE_TELEMETRY", "DISCONNECTED"
    ]
    scen_upper = scenario.upper()
    if scen_upper not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{scenario}'. Valid options: {valid_scenarios}"
        )

    simulator.start(scenario=scen_upper)
    return {
        "status": "started",
        "scenario": simulator.scenario,
        "message": f"Simulation started under scenario '{simulator.scenario}'"
    }


@router.post("/stop")
def stop_simulation():
    """Stops the background telemetry simulation."""
    simulator.stop()
    return {
        "status": "stopped",
        "message": "Simulation stopped."
    }


@router.post("/scenario")
def set_scenario(payload: ScenarioRequest):
    """Dynamically switches the active simulation scenario."""
    valid_scenarios = [
        "NORMAL", "TEMPERATURE_WARNING", "ABNORMAL_CURRENT",
        "SENSOR_FAULT", "STALE_TELEMETRY", "DISCONNECTED"
    ]
    scen_upper = payload.scenario.upper()
    if scen_upper not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{payload.scenario}'. Valid options: {valid_scenarios}"
        )

    simulator.set_scenario(scen_upper)
    return {
        "status": "success",
        "scenario": simulator.scenario,
        "message": f"Switched simulation scenario to '{simulator.scenario}'"
    }
