"""
Application Configuration Module
Reads configuration from environment variables (.env) with sensible engineering defaults.
"""
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "EV Battery Safety & Health Monitoring"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api"

    # Database Configuration (PostgreSQL supported, default SQLite for zero-config run)
    DATABASE_URL: str = Field(
        default="sqlite:///./ev_battery.db",
        description="Database connection URL. E.g. postgresql://postgres:postgres@localhost:5432/ev_battery"
    )

    # MQTT Broker Configuration
    MQTT_BROKER_HOST: str = Field(default="localhost", description="Mosquitto broker IP or hostname")
    MQTT_BROKER_PORT: int = Field(default=1883, description="MQTT broker port (typically 1883 or 8883 for TLS)")
    MQTT_CLIENT_ID: str = "ev-battery-backend-server"
    MQTT_USERNAME: Optional[str] = None
    MQTT_PASSWORD: Optional[str] = None
    MQTT_KEEPALIVE: int = 60
    MQTT_TELEMETRY_TOPIC: str = "ev-battery/+/telemetry"
    MQTT_STATUS_TOPIC: str = "ev-battery/+/status"
    MQTT_ALERTS_TOPIC: str = "ev-battery/ev-battery-001/alerts"

    # Default Target Device ID
    DEFAULT_DEVICE_ID: str = "ev-battery-001"

    # Connectivity / Health Watchdog
    STALE_DATA_THRESHOLD_SECONDS: int = 6       # Mark data as STALE if no packets within 6s
    DISCONNECTED_THRESHOLD_SECONDS: int = 15    # Mark device as DISCONNECTED if no packets within 15s

    # Battery Physical Characteristics & Chemistry
    # Chemistries supported: 'LI_ION' (3.7V nominal, 3.0V cutoff, 4.2V full), 'LIFEPO4' (3.2V nominal, 2.5V cutoff, 3.65V full)
    # Battery Physical Characteristics & Chemistry
# Single 3.7V nominal lithium-ion cell, rated 2400mAh
BATTERY_CHEMISTRY: str = "LI_ION"
SERIES_CELLS: int = 1
BATTERY_CAPACITY_AH: float = 2.4
COULOMB_CHARGE_EFFICIENCY: float = 0.98
INITIAL_SOC_PERCENT: float = 85.0
    # Safety Thresholds (Per Pack based on series cells)
    # Voltage Limits:
    CELL_OVERVOLTAGE_WARNING_V: float = 4.20
    CELL_OVERVOLTAGE_CRITICAL_V: float = 4.28
    CELL_UNDERVOLTAGE_WARNING_V: float = 3.10
    CELL_UNDERVOLTAGE_CRITICAL_V: float = 2.85

    # Current Limits:
    OVERCURRENT_CHARGE_LIMIT_A: float = 5.0     # Max charging current (+ve convention)
    OVERCURRENT_DISCHARGE_LIMIT_A: float = 15.0 # Max discharge current (-ve convention magnitude)

    # Temperature Limits (°C):
    TEMP_OVERHEAT_WARNING_C: float = 45.0
    TEMP_OVERHEAT_CRITICAL_C: float = 55.0
    TEMP_UNDERCOOL_WARNING_C: float = 5.0
    TEMP_UNDERCOOL_CRITICAL_C: float = 0.0

    # AI Model Configuration
    MODEL_DIR: str = "app/ai/models"
    ANOMALY_CONTAMINATION_RATE: float = 0.05

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")


settings = Settings()
