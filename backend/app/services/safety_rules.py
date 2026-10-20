"""
Battery Safety Rules Engine
Evaluates telemetry against engineering limits and manages persistent alerts.
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.alert import Alert
from app.schemas.telemetry import TelemetryInput
from app.config import settings


class SafetyEvaluationResult:
    def __init__(self, is_valid: bool = True, error: Optional[str] = None):
        self.is_valid = is_valid
        self.validation_error = error
        self.new_alerts: List[dict] = []
        self.resolved_alert_types: List[str] = []


def evaluate_telemetry_safety(telemetry: TelemetryInput, db: Session) -> SafetyEvaluationResult:
    """
    Validates physical plausibility and evaluates safety thresholds.
    Prevents duplicate active alerts for continuous persistent states.
    """
    result = SafetyEvaluationResult()
    now = datetime.now(timezone.utc)
    series_cells = settings.SERIES_CELLS
    
    # Pack safety thresholds based on cell count
    pack_overvoltage_crit = settings.CELL_OVERVOLTAGE_CRITICAL_V * series_cells
    pack_overvoltage_warn = settings.CELL_OVERVOLTAGE_WARNING_V * series_cells
    pack_undervoltage_warn = settings.CELL_UNDERVOLTAGE_WARNING_V * series_cells
    pack_undervoltage_crit = settings.CELL_UNDERVOLTAGE_CRITICAL_V * series_cells

    # Check 1: Hardware sensor status flag
    if telemetry.sensor_status and telemetry.sensor_status not in ["OK", "NORMAL"]:
        _handle_alert(
            db, telemetry.device_id, "SENSOR_FAULT", "WARNING",
            f"Sensor fault reported by firmware: {telemetry.sensor_status}",
            value=None, threshold=None, now=now, result=result
        )

    # Check 2: Voltage Plausibility & Thresholds
    if telemetry.voltage_v is not None:
        v = telemetry.voltage_v
        if v < 0 or v > (6.0 * series_cells):
            result.is_valid = False
            result.validation_error = f"Voltage reading {v}V is physically implausible."
            _handle_alert(
                db, telemetry.device_id, "SENSOR_FAULT", "CRITICAL",
                f"Voltage reading {v}V is out of physical sensor range.",
                value=v, threshold=0.0, now=now, result=result
            )
        elif v >= pack_overvoltage_crit:
            _handle_alert(
                db, telemetry.device_id, "OVERVOLTAGE", "CRITICAL",
                f"Critical Overvoltage: Pack voltage {v:.2f}V exceeds critical threshold ({pack_overvoltage_crit:.2f}V)!",
                value=v, threshold=pack_overvoltage_crit, now=now, result=result
            )
        elif v >= pack_overvoltage_warn:
            _handle_alert(
                db, telemetry.device_id, "OVERVOLTAGE", "WARNING",
                f"High Voltage Warning: Pack voltage {v:.2f}V exceeds warning limit ({pack_overvoltage_warn:.2f}V).",
                value=v, threshold=pack_overvoltage_warn, now=now, result=result
            )
        elif v <= pack_undervoltage_crit:
            _handle_alert(
                db, telemetry.device_id, "UNDERVOLTAGE", "CRITICAL",
                f"Critical Undervoltage: Pack voltage {v:.2f}V below deep-discharge limit ({pack_undervoltage_crit:.2f}V)!",
                value=v, threshold=pack_undervoltage_crit, now=now, result=result
            )
        elif v <= pack_undervoltage_warn:
            _handle_alert(
                db, telemetry.device_id, "UNDERVOLTAGE", "WARNING",
                f"Low Voltage Warning: Pack voltage {v:.2f}V below warning limit ({pack_undervoltage_warn:.2f}V).",
                value=v, threshold=pack_undervoltage_warn, now=now, result=result
            )
        else:
            _resolve_alert_if_active(db, telemetry.device_id, "OVERVOLTAGE", now, result)
            _resolve_alert_if_active(db, telemetry.device_id, "UNDERVOLTAGE", now, result)

    # Check 3: Current Plausibility & Thresholds (Convention: + is charge, - is discharge)
    if telemetry.current_a is not None:
        curr = telemetry.current_a
        if abs(curr) > 100.0:
            result.is_valid = False
            result.validation_error = f"Current reading {curr}A exceeds sensor measurement ceiling."
        elif curr > settings.OVERCURRENT_CHARGE_LIMIT_A:
            _handle_alert(
                db, telemetry.device_id, "OVERCURRENT_CHARGE", "CRITICAL",
                f"Overcurrent Charging: Current {curr:.2f}A exceeds charge ceiling ({settings.OVERCURRENT_CHARGE_LIMIT_A}A)!",
                value=curr, threshold=settings.OVERCURRENT_CHARGE_LIMIT_A, now=now, result=result
            )
        elif curr < -settings.OVERCURRENT_DISCHARGE_LIMIT_A:
            _handle_alert(
                db, telemetry.device_id, "OVERCURRENT_DISCHARGE", "CRITICAL",
                f"Overcurrent Discharge: Current {abs(curr):.2f}A exceeds discharge ceiling ({settings.OVERCURRENT_DISCHARGE_LIMIT_A}A)!",
                value=curr, threshold=-settings.OVERCURRENT_DISCHARGE_LIMIT_A, now=now, result=result
            )
        else:
            _resolve_alert_if_active(db, telemetry.device_id, "OVERCURRENT_CHARGE", now, result)
            _resolve_alert_if_active(db, telemetry.device_id, "OVERCURRENT_DISCHARGE", now, result)

    # Check 4: Temperature Plausibility & Thresholds
    if telemetry.temperature_c is not None:
        t = telemetry.temperature_c
        if t < -40.0 or t > 120.0:
            result.is_valid = False
            result.validation_error = f"Temperature reading {t}°C is physically implausible."
            _handle_alert(
                db, telemetry.device_id, "SENSOR_FAULT", "CRITICAL",
                f"Temperature reading {t}°C is out of sensor bounds.",
                value=t, threshold=None, now=now, result=result
            )
        elif t >= settings.TEMP_OVERHEAT_CRITICAL_C:
            _handle_alert(
                db, telemetry.device_id, "OVERTEMP", "CRITICAL",
                f"Thermal Emergency: Battery temperature {t:.1f}°C breached critical limit ({settings.TEMP_OVERHEAT_CRITICAL_C}°C)!",
                value=t, threshold=settings.TEMP_OVERHEAT_CRITICAL_C, now=now, result=result
            )
        elif t >= settings.TEMP_OVERHEAT_WARNING_C:
            _handle_alert(
                db, telemetry.device_id, "OVERTEMP", "WARNING",
                f"Elevated Temperature Warning: Battery temperature {t:.1f}°C exceeds ({settings.TEMP_OVERHEAT_WARNING_C}°C).",
                value=t, threshold=settings.TEMP_OVERHEAT_WARNING_C, now=now, result=result
            )
        elif t <= settings.TEMP_UNDERCOOL_CRITICAL_C:
            _handle_alert(
                db, telemetry.device_id, "UNDERTEMP", "CRITICAL",
                f"Freezing Temperature Alert: Battery at {t:.1f}°C. Charging prohibited below freezing!",
                value=t, threshold=settings.TEMP_UNDERCOOL_CRITICAL_C, now=now, result=result
            )
        elif t <= settings.TEMP_UNDERCOOL_WARNING_C:
            _handle_alert(
                db, telemetry.device_id, "UNDERTEMP", "WARNING",
                f"Cold Temperature Notice: Battery at {t:.1f}°C.",
                value=t, threshold=settings.TEMP_UNDERCOOL_WARNING_C, now=now, result=result
            )
        else:
            _resolve_alert_if_active(db, telemetry.device_id, "OVERTEMP", now, result)
            _resolve_alert_if_active(db, telemetry.device_id, "UNDERTEMP", now, result)

    return result


def _handle_alert(db: Session, device_id: str, alert_type: str, severity: str,
                  message: str, value: Optional[float], threshold: Optional[float],
                  now: datetime, result: SafetyEvaluationResult):
    """
    Checks if an alert of this type is already ACTIVE.
    If so, updates message/value without spamming duplicates.
    If not, creates a new alert record.
    """
    active_alert = db.query(Alert).filter(
        Alert.device_id == device_id,
        Alert.alert_type == alert_type,
        Alert.status == "ACTIVE"
    ).first()

    if active_alert:
        # Update existing active alert
        active_alert.value = value
        active_alert.message = message
        active_alert.severity = severity
    else:
        new_alert = Alert(
            device_id=device_id,
            alert_type=alert_type,
            severity=severity,
            message=message,
            value=value,
            threshold=threshold,
            status="ACTIVE",
            created_at=now
        )
        db.add(new_alert)
        result.new_alerts.append({
            "device_id": device_id,
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "value": value
        })


def _resolve_alert_if_active(db: Session, device_id: str, alert_type: str,
                             now: datetime, result: SafetyEvaluationResult):
    """Auto-resolves an alert when condition returns within normal limits."""
    active_alert = db.query(Alert).filter(
        Alert.device_id == device_id,
        Alert.alert_type == alert_type,
        Alert.status == "ACTIVE"
    ).first()

    if active_alert:
        active_alert.status = "RESOLVED"
        active_alert.resolved_at = now
        result.resolved_alert_types.append(alert_type)
