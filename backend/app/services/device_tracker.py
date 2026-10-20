"""
Device Connection Tracker & Watchdog
Tracks heartbeat, Last Will and Testament, and computes LIVE / DEMO / STALE / DISCONNECTED states.
"""
from datetime import datetime, timezone
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.models.device import Device
from app.config import settings


class DeviceTracker:
    def __init__(self):
        # In-memory tracking cache for high-frequency watchdog
        self._last_seen_map: Dict[str, datetime] = {}
        self._last_source_map: Dict[str, str] = {}
        self._mqtt_connected: bool = False

    def set_mqtt_connected(self, state: bool):
        self._mqtt_connected = state

    def record_activity(self, device_id: str, source: str, db: Session, timestamp: Optional[datetime] = None):
        """Called whenever valid telemetry or status message arrives from a device."""
        now = timestamp or datetime.now(timezone.utc)
        self._last_seen_map[device_id] = now
        self._last_source_map[device_id] = source.upper()

        device = db.query(Device).filter(Device.device_id == device_id).first()
        if device:
            device.last_seen = now
            device.status = "ONLINE"
            device.data_source = "HARDWARE" if source.lower() == "hardware" else "SIMULATION"
            db.commit()

    def handle_lwt_disconnect(self, device_id: str, db: Session):
        """Called when MQTT broker delivers device Last Will and Testament 'offline' message."""
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if device:
            device.status = "DISCONNECTED"
            db.commit()

    def get_device_status(self, device_id: str, db: Session) -> Dict[str, str]:
        """
        Determines connection state:
        - LIVE HARDWARE (Hardware packet received within STALE_DATA_THRESHOLD_SECONDS)
        - DEMO SIMULATION (Simulation packet received within STALE_DATA_THRESHOLD_SECONDS)
        - STALE DATA (No packets within STALE_DATA_THRESHOLD_SECONDS but < DISCONNECTED_THRESHOLD_SECONDS)
        - DISCONNECTED (No packets within DISCONNECTED_THRESHOLD_SECONDS)
        """
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device or not device.last_seen:
            return {
                "connectivity": "DISCONNECTED",
                "badge": "DISCONNECTED",
                "source": "UNKNOWN",
                "last_seen": None
            }

        now = datetime.now(timezone.utc)
        # Ensure aware datetime for subtraction
        last_seen = device.last_seen
        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=timezone.utc)

        elapsed = (now - last_seen).total_seconds()
        is_hardware = (device.data_source == "HARDWARE")

        if elapsed > settings.DISCONNECTED_THRESHOLD_SECONDS:
            connectivity = "DISCONNECTED"
            badge = "DISCONNECTED"
            if device.status != "DISCONNECTED":
                device.status = "DISCONNECTED"
                db.commit()
        elif elapsed > settings.STALE_DATA_THRESHOLD_SECONDS:
            connectivity = "STALE"
            badge = "STALE DATA"
            if device.status != "STALE":
                device.status = "STALE"
                db.commit()
        else:
            connectivity = "ONLINE"
            badge = "LIVE HARDWARE" if is_hardware else "DEMO SIMULATION"
            if device.status != "ONLINE":
                device.status = "ONLINE"
                db.commit()

        return {
            "connectivity": connectivity,
            "badge": badge,
            "source": device.data_source,
            "last_seen": last_seen.isoformat(),
            "elapsed_seconds": round(elapsed, 1)
        }


device_tracker = DeviceTracker()
