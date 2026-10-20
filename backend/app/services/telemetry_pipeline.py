"""
Telemetry Processing Pipeline
Central orchestrator: Validates, estimates SOC/SOH, checks safety rules,
invokes AI anomaly detector, persists to DB, and broadcasts via WebSockets.
"""
import asyncio
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.telemetry import BatteryTelemetry
from app.models.prediction import BatteryPrediction
from app.schemas.telemetry import TelemetryInput, TelemetryResponse
from app.services.safety_rules import evaluate_telemetry_safety
from app.services.soc_estimator import soc_service
from app.services.soh_estimator import soh_service
from app.services.device_tracker import device_tracker
from app.services.websocket_manager import ws_manager
from app.ai.anomaly_detector import anomaly_detector


def process_telemetry_pipeline(telemetry: TelemetryInput) -> dict:
    """
    Synchronous processing core, safely callable from MQTT threads,
    REST endpoints, or simulation background loop.
    """
    db: Session = SessionLocal()
    try:
        # Step 1: Normalize timestamp
        ts = telemetry.timestamp or datetime.now(timezone.utc)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        # Step 2: Evaluate physical safety rules & alerts
        safety_eval = evaluate_telemetry_safety(telemetry, db)

        # Step 3: Compute or estimate State of Charge (Coulomb counting)
        # If telemetry provided a valid hardware-level SOC, retain it, otherwise estimate
        calculated_soc = telemetry.soc_pct
        if calculated_soc is None and safety_eval.is_valid:
            calculated_soc = soc_service.update(
                current_a=telemetry.current_a,
                voltage_v=telemetry.voltage_v,
                timestamp=ts
            )

        # Step 4: SOH estimation (strictly None / uncalibrated as mandated)
        calculated_soh = soh_service.estimate_soh()

        # Step 5: Calculate instantaneous electrical power
        power_w = None
        if telemetry.voltage_v is not None and telemetry.current_a is not None:
            power_w = round(telemetry.voltage_v * telemetry.current_a, 2)

        # Step 6: Persist Telemetry Record to Database
        telemetry_record = BatteryTelemetry(
            device_id=telemetry.device_id,
            timestamp=ts,
            sequence=telemetry.sequence,
            voltage_v=telemetry.voltage_v,
            current_a=telemetry.current_a,
            temperature_c=telemetry.temperature_c,
            soc_pct=calculated_soc,
            soh_pct=calculated_soh,
            power_w=power_w,
            source=telemetry.source.lower(),
            sensor_status=telemetry.sensor_status or "OK",
            is_valid=safety_eval.is_valid,
            validation_error=safety_eval.validation_error
        )
        db.add(telemetry_record)
        db.commit()
        db.refresh(telemetry_record)

        # Step 7: AI Anomaly Detection Inference
        pred_result = anomaly_detector.predict(
            voltage_v=telemetry.voltage_v,
            current_a=telemetry.current_a,
            temperature_c=telemetry.temperature_c,
            power_w=power_w,
            allow_demo_fallback=(telemetry.source.lower() == "simulation")
        )

        pred_record = BatteryPrediction(
            device_id=telemetry.device_id,
            timestamp=ts,
            telemetry_id=telemetry_record.id,
            anomaly_score=pred_result.get("anomaly_score"),
            is_anomaly=pred_result.get("is_anomaly", False),
            model_name=pred_result.get("model_name"),
            model_version=pred_result.get("model_version"),
            model_status=pred_result.get("model_status"),
            risk_level=pred_result.get("risk_level", "LOW"),
            explanation=pred_result.get("explanation")
        )
        db.add(pred_record)
        db.commit()

        # Step 8: Update Device Connectivity & Watchdog
        device_tracker.record_activity(
            device_id=telemetry.device_id,
            source=telemetry.source,
            db=db,
            timestamp=ts
        )

        # Step 9: Broadcast real-time packet via WebSockets to connected browsers
        ws_payload = {
            "type": "TELEMETRY",
            "data": {
                "id": telemetry_record.id,
                "device_id": telemetry.device_id,
                "timestamp": ts.isoformat(),
                "sequence": telemetry.sequence,
                "voltage_v": telemetry.voltage_v,
                "current_a": telemetry.current_a,
                "temperature_c": telemetry.temperature_c,
                "soc_pct": calculated_soc,
                "soh_pct": calculated_soh,
                "power_w": power_w,
                "source": telemetry.source.lower(),
                "sensor_status": telemetry.sensor_status or "OK",
                "is_valid": safety_eval.is_valid,
                "validation_error": safety_eval.validation_error,
                "device_status": device_tracker.get_device_status(telemetry.device_id, db),
                "ai_prediction": pred_result,
                "new_alerts": safety_eval.new_alerts
            }
        }

        # Safe async dispatch to websocket manager
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(ws_manager.broadcast_json(ws_payload), loop)
            else:
                loop.run_until_complete(ws_manager.broadcast_json(ws_payload))
        except RuntimeError:
            # Fallback if called outside event loop context
            try:
                new_loop = asyncio.new_event_loop()
                new_loop.run_until_complete(ws_manager.broadcast_json(ws_payload))
                new_loop.close()
            except Exception:
                pass

        return {
            "telemetry_id": telemetry_record.id,
            "is_valid": safety_eval.is_valid,
            "calculated_soc": calculated_soc,
            "ai_prediction": pred_result
        }

    finally:
        db.close()
