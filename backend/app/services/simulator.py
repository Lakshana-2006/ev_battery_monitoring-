"""
Telemetry Simulator Service
Provides interactive hardware simulation scenarios with strict 'simulation' tagging.
"""
import asyncio
import threading
import time
import math
import random
from datetime import datetime, timezone
from typing import Optional, Dict
from app.config import settings
from app.schemas.telemetry import TelemetryInput


class TelemetrySimulator:
    def __init__(self):
        self.is_running: bool = False
        self.scenario: str = "NORMAL"  # NORMAL, TEMPERATURE_WARNING, ABNORMAL_CURRENT, SENSOR_FAULT, STALE_TELEMETRY, DISCONNECTED
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self.sequence: int = 1
        self.tick: int = 0
        self.pause_transmissions: bool = False

    def start(self, scenario: str = "NORMAL"):
        if self.is_running:
            self.scenario = scenario
            return
        
        self.scenario = scenario
        self.is_running = True
        self._stop_event.clear()
        self.pause_transmissions = False
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        print(f"[SIMULATOR] Started in background with scenario '{self.scenario}'")

    def stop(self):
        if not self.is_running:
            return
        self.is_running = False
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        print("[SIMULATOR] Stopped background simulation.")

    def set_scenario(self, scenario: str):
        self.scenario = scenario.upper()
        if self.scenario == "STALE_TELEMETRY":
            self.pause_transmissions = True
        elif self.scenario == "DISCONNECTED":
            self.pause_transmissions = True
        else:
            self.pause_transmissions = False
        print(f"[SIMULATOR] Switched scenario to '{self.scenario}'")

    def _generate_telemetry(self) -> Optional[TelemetryInput]:
        if self.pause_transmissions:
            return None

        self.tick += 1
        self.sequence += 1
        now = datetime.now(timezone.utc)
        series_cells = settings.SERIES_CELLS
        nominal_cell_v = 3.90

        # Scenario: NORMAL Healthy Operation
        if self.scenario == "NORMAL":
            noise_v = random.uniform(-0.03, 0.03)
            cell_v = nominal_cell_v + noise_v
            voltage = round(cell_v * series_cells, 2)
            # Normal discharge load between 2.0A and 4.5A (negative)
            current = round(-3.0 - 1.2 * math.sin(self.tick / 6.0) + random.uniform(-0.2, 0.2), 2)
            # Safe temperature ~28°C to 33°C
            temperature = round(29.0 + 3.0 * math.sin(self.tick / 15.0) + random.uniform(-0.3, 0.3), 1)
            sensor_status = "OK"

        # Scenario: TEMPERATURE_WARNING / CRITICAL OVERTEMP
        elif self.scenario == "TEMPERATURE_WARNING":
            voltage = round((nominal_cell_v - 0.05) * series_cells, 2)
            current = round(-6.5 + random.uniform(-0.5, 0.5), 2)
            # Temperature climbs past warning (45°C) up to 57°C (critical)
            temperature = round(44.0 + min(14.0, self.tick * 0.8) + random.uniform(-0.3, 0.3), 1)
            sensor_status = "THERMAL_ELEVATED"

        # Scenario: ABNORMAL_CURRENT / HIGH DISCHARGE SPIKE
        elif self.scenario == "ABNORMAL_CURRENT":
            voltage = round((nominal_cell_v - 0.35) * series_cells, 2)  # voltage sag
            # Overcurrent discharge exceeding 15A limit (e.g. 18A - 22A)
            current = round(-18.5 - random.uniform(0.5, 3.5), 2)
            temperature = round(38.0 + random.uniform(-0.5, 0.5), 1)
            sensor_status = "OVERCURRENT_EVENT"

        # Scenario: SENSOR_FAULT / CORRUPTED MEASUREMENT
        elif self.scenario == "SENSOR_FAULT":
            voltage = round(99.9, 2)  # Physically implausible out-of-range voltage
            current = 0.0
            temperature = -99.0
            sensor_status = "ADC_COMM_ERROR"

        else:
            voltage = round(nominal_cell_v * series_cells, 2)
            current = -2.5
            temperature = 30.0
            sensor_status = "OK"

        return TelemetryInput(
            device_id=settings.DEFAULT_DEVICE_ID,
            timestamp=now,
            sequence=self.sequence,
            voltage_v=voltage,
            current_a=current,
            temperature_c=temperature,
            soc_pct=None,    # Let backend coulomb counting compute it
            soh_pct=None,    # SOH strictly None
            source="simulation",
            sensor_status=sensor_status
        )

    def _run_loop(self):
        """Simulates periodic sensor publication every 1.5 seconds."""
        # Late import to prevent circular dependencies
        from app.services.telemetry_pipeline import process_telemetry_pipeline

        while not self._stop_event.is_set():
            telemetry = self._generate_telemetry()
            if telemetry is not None:
                try:
                    process_telemetry_pipeline(telemetry)
                except Exception as e:
                    print(f"[SIMULATOR] Error processing simulation frame: {e}")
            
            # Sleep 1.5 seconds between packets
            time.sleep(1.5)


simulator = TelemetrySimulator()
