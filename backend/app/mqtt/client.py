"""
MQTT Client Service
Manages connection to Mosquitto broker, subscription, reconnects, and message dispatch.
"""
import json
import logging
import time
from typing import Optional
import paho.mqtt.client as mqtt
from app.config import settings
from app.schemas.telemetry import TelemetryInput
from app.services.telemetry_pipeline import process_telemetry_pipeline
from app.services.device_tracker import device_tracker
from app.database.session import SessionLocal

logger = logging.getLogger("mqtt_client")


class MQTTManager:
    def __init__(self):
        self.client: Optional[mqtt.Client] = None
        self.is_connected: bool = False
        self._should_reconnect: bool = True

    def start(self):
        """Initializes and connects MQTT client in a background worker thread."""
        try:
            # Use CallbackAPIVersion.VERSION2 for paho-mqtt v2 compatibility
            try:
                self.client = mqtt.Client(
                    callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
                    client_id=settings.MQTT_CLIENT_ID
                )
            except AttributeError:
                # Fallback for paho-mqtt v1
                self.client = mqtt.Client(client_id=settings.MQTT_CLIENT_ID)

            # Setup credentials if specified
            if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
                self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

            # Assign event callbacks
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message

            logger.info(f"[MQTT] Connecting to broker at {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}...")
            self.client.connect_async(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, keepalive=settings.MQTT_KEEPALIVE)
            self.client.loop_start()
        except Exception as e:
            logger.warning(f"[MQTT] Failed to connect to broker ({settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}): {e}. Will retry in background.")

    def stop(self):
        if self.client:
            self._should_reconnect = False
            self.client.loop_stop()
            self.client.disconnect()
            logger.info("[MQTT] Disconnected from broker.")

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        rc_code = rc if isinstance(rc, int) else getattr(rc, "value", 0)
        if rc_code == 0:
            self.is_connected = True
            device_tracker.set_mqtt_connected(True)
            logger.info(f"[MQTT] Successfully connected to broker {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}")
            
            # Subscribe with QoS 1
            client.subscribe(settings.MQTT_TELEMETRY_TOPIC, qos=1)
            client.subscribe(settings.MQTT_STATUS_TOPIC, qos=1)
            logger.info(f"[MQTT] Subscribed to '{settings.MQTT_TELEMETRY_TOPIC}' and '{settings.MQTT_STATUS_TOPIC}'")
        else:
            self.is_connected = False
            device_tracker.set_mqtt_connected(False)
            logger.warning(f"[MQTT] Connection refused with code: {rc_code}")

    def _on_disconnect(self, client, userdata, flags_or_rc, rc=None, properties=None):
        self.is_connected = False
        device_tracker.set_mqtt_connected(False)
        logger.warning("[MQTT] Broker disconnected. Automatic reconnect will engage.")

    def _on_message(self, client, userdata, msg):
        """Processes incoming MQTT payloads."""
        topic = msg.topic
        payload_str = msg.payload.decode("utf-8", errors="ignore")
        
        try:
            payload_data = json.loads(payload_str)
        except json.JSONDecodeError:
            logger.error(f"[MQTT] Invalid JSON on topic {topic}: {payload_str}")
            return

        # Check 1: Device Status topic (e.g. ev-battery/ev-battery-001/status)
        if "/status" in topic:
            self._handle_status_message(topic, payload_data)
            return

        # Check 2: Telemetry topic (e.g. ev-battery/ev-battery-001/telemetry)
        if "/telemetry" in topic:
            self._handle_telemetry_message(payload_data)

    def _handle_status_message(self, topic: str, data: dict):
        device_id = data.get("device_id") or topic.split("/")[1]
        status_text = data.get("status", "").upper()
        
        db = SessionLocal()
        try:
            if status_text in ["OFFLINE", "DISCONNECTED"]:
                device_tracker.handle_lwt_disconnect(device_id, db)
                logger.info(f"[MQTT] Device '{device_id}' reported LWT OFFLINE.")
            elif status_text in ["ONLINE", "BOOT"]:
                device_tracker.record_activity(device_id, "hardware", db)
                logger.info(f"[MQTT] Device '{device_id}' reported ONLINE.")
        finally:
            db.close()

    def _handle_telemetry_message(self, data: dict):
        try:
            telemetry_input = TelemetryInput(**data)
            process_telemetry_pipeline(telemetry_input)
        except Exception as e:
            logger.error(f"[MQTT] Failed to validate/process telemetry: {e}")

    def publish_alert(self, device_id: str, alert_data: dict):
        """Publishes critical system notifications to MQTT alert topic."""
        if self.is_connected and self.client:
            topic = f"ev-battery/{device_id}/alerts"
            try:
                self.client.publish(topic, json.dumps(alert_data), qos=1)
            except Exception as e:
                logger.warning(f"[MQTT] Error publishing alert: {e}")


mqtt_service = MQTTManager()
