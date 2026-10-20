"""
Database Initialization and Seed Data
Creates tables and seeds default device records and baseline model metadata.
"""
from datetime import datetime, timezone, timedelta
import math
import random
from sqlalchemy.orm import Session
from app.database.session import engine, SessionLocal
from app.models.base import Base
from app.models.device import Device
from app.models.model_metadata import ModelMetadata
from app.models.telemetry import BatteryTelemetry
from app.models.alert import Alert
from app.config import settings


def init_db():
    """Create all tables and seed essential records."""
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # 1. Ensure default device exists
        device = db.query(Device).filter(Device.device_id == settings.DEFAULT_DEVICE_ID).first()
        if not device:
            device = Device(
                device_id=settings.DEFAULT_DEVICE_ID,
                name="EV Battery Pack 001 (NodeMCU Node)",
                chemistry=settings.BATTERY_CHEMISTRY,
                series_cells=settings.SERIES_CELLS,
                capacity_ah=settings.BATTERY_CAPACITY_AH,
                status="DISCONNECTED",
                data_source="HARDWARE",
                last_seen=None,
                firmware_version="v1.0.0-esp8266"
            )
            db.add(device)
            db.commit()
            print(f"[DB] Initialized default device '{settings.DEFAULT_DEVICE_ID}'")

        # 2. Ensure baseline model metadata exists
        model_meta = db.query(ModelMetadata).filter(ModelMetadata.model_name == "IsolationForest_Baseline").first()
        if not model_meta:
            model_meta = ModelMetadata(
                model_name="IsolationForest_Baseline",
                model_version="v1.0.0",
                algorithm="IsolationForest",
                status="NOT TRAINED",  # Starts strictly as NOT TRAINED as mandated
                feature_names="voltage_v,current_a,temperature_c,power_w",
                training_samples=0,
                hyperparameters='{"n_estimators": 100, "contamination": 0.05, "random_state": 42}',
                training_date=None,
                is_active=True,
                description="Unsupervised Isolation Forest baseline anomaly detector for EV battery sensor telemetry."
            )
            db.add(model_meta)
            db.commit()
            print("[DB] Initialized model metadata for 'IsolationForest_Baseline'")

        # 3. If database has no telemetry, seed realistic 30-minute demonstration baseline
        telemetry_count = db.query(BatteryTelemetry).count()
        if telemetry_count == 0:
            print("[DB] Seeding realistic demonstration baseline data...")
            now = datetime.now(timezone.utc)
            cell_count = settings.SERIES_CELLS
            
            # Li-ion nominal 3.7V/cell * series_cells (e.g. 3S = 11.1V, ~12.2V to 11.4V discharge)
            base_cell_v = 4.10
            base_soc = 88.0
            
            for i in range(60, 0, -1):
                t = now - timedelta(seconds=i * 20)
                # Discharge ramp: slow decrease in voltage and SOC
                fraction = (60 - i) / 60.0
                cell_v = base_cell_v - (fraction * 0.25) + (random.uniform(-0.02, 0.02))
                pack_v = round(cell_v * cell_count, 2)
                # Load current between 2.0A and 6.5A discharge (negative sign convention)
                current = round(-3.5 - 1.5 * math.sin(i / 5.0) + random.uniform(-0.3, 0.3), 2)
                # Cell temperature warming gently under load
                temp = round(28.0 + (fraction * 5.5) + random.uniform(-0.4, 0.4), 1)
                soc = round(base_soc - (fraction * 4.5), 1)
                power = round(pack_v * current, 1)

                record = BatteryTelemetry(
                    device_id=settings.DEFAULT_DEVICE_ID,
                    timestamp=t,
                    sequence=60 - i + 1,
                    voltage_v=pack_v,
                    current_a=current,
                    temperature_c=temp,
                    soc_pct=soc,
                    soh_pct=None,  # SOH unavailable until validated test data exists!
                    power_w=power,
                    source="simulation",
                    sensor_status="OK",
                    is_valid=True
                )
                db.add(record)
            
            # Also seed an informational startup alert
            startup_alert = Alert(
                device_id=settings.DEFAULT_DEVICE_ID,
                alert_type="SYSTEM_BOOT",
                severity="INFO",
                message="EV Battery Safety & Health Monitoring Backend System Initialized.",
                value=None,
                threshold=None,
                status="RESOLVED",
                created_at=now - timedelta(minutes=20),
                resolved_at=now - timedelta(minutes=20)
            )
            db.add(startup_alert)
            db.commit()
            print("[DB] Demonstration baseline seeded successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    init_db()
