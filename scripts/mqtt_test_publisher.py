"""
Standalone MQTT Test Publisher Script
Simulates physical ESP8266 NodeMCU hardware publishing telemetry over MQTT (or HTTP REST fallback).
Use this to test the complete end-to-end pipeline without physical microcontroller hardware!

Usage:
  python scripts/mqtt_test_publisher.py --broker localhost --interval 1.5 --scenario normal
"""
import sys
import os
import time
import json
import random
import math
import argparse
from datetime import datetime, timezone

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None

try:
    import requests
except ImportError:
    requests = None


def main():
    parser = argparse.ArgumentParser(description="EV Battery IoT MQTT Hardware Simulator")
    parser.add_argument("--broker", default="localhost", help="MQTT Broker host (default: localhost)")
    parser.add_argument("--port", type=int, default=1883, help="MQTT Broker port (default: 1883)")
    parser.add_argument("--device-id", default="ev-battery-001", help="Device identifier")
    parser.add_argument("--interval", type=float, default=1.5, help="Publish interval in seconds")
    parser.add_argument("--scenario", default="normal", choices=["normal", "overtemp", "overcurrent", "fault"], help="Simulation scenario")
    parser.add_argument("--use-http", action="store_true", help="Send directly via HTTP REST API instead of MQTT")
    args = parser.parse_args()

    topic = f"ev-battery/{args.device_id}/telemetry"
    status_topic = f"ev-battery/{args.device_id}/status"

    client = None
    if not args.use_http:
        if mqtt is None:
            print("[ERROR] paho-mqtt not installed. Run: pip install paho-mqtt or use --use-http")
            sys.exit(1)
        
        try:
            client = mqtt.Client(
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
                client_id=f"{args.device_id}-test-pub"
            )
        except AttributeError:
            client = mqtt.Client(client_id=f"{args.device_id}-test-pub")

        print(f"[MQTT] Connecting to broker at {args.broker}:{args.port}...")
        try:
            client.connect(args.broker, args.port, 60)
            client.loop_start()
            print("[MQTT] Connected successfully!")
            
            # Publish birth message
            birth_payload = json.dumps({
                "device_id": args.device_id,
                "status": "online",
                "firmware": "v1.0.0-esp8266",
                "ip": "192.168.1.150",
                "rssi": -65
            })
            client.publish(status_topic, birth_payload, qos=1, retain=True)
        except Exception as e:
            print(f"[WARN] Failed to connect to MQTT broker ({e}). Falling back to HTTP REST API...")
            args.use_http = True

    seq = 0
    tick = 0
    print(f"\n[STREAM] Commencing telemetry publication every {args.interval}s (Scenario: {args.scenario.upper()})...")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            seq += 1
            tick += 1
            now = datetime.now(timezone.utc).isoformat()

            # Dynamic electrical and thermal wave synthesis
            if args.scenario == "normal":
                voltage = round(11.85 - (tick * 0.005) + random.uniform(-0.02, 0.02), 2)
                current = round(-3.2 - 1.0 * math.sin(tick / 5.0) + random.uniform(-0.2, 0.2), 2)
                temp = round(28.5 + 2.5 * math.sin(tick / 15.0) + random.uniform(-0.2, 0.2), 1)
                sensor_status = "OK"
            elif args.scenario == "overtemp":
                voltage = 11.40
                current = -5.0
                temp = round(44.0 + min(15.0, tick * 0.9), 1)  # Escalates past 45°C to 59°C
                sensor_status = "THERMAL_ELEVATED"
            elif args.scenario == "overcurrent":
                voltage = 10.90  # Voltage sag under extreme load
                current = round(-18.5 - random.uniform(1.0, 3.0), 2)  # Exceeds 15A threshold
                temp = 38.0
                sensor_status = "HIGH_DISCHARGE"
            else:  # fault
                voltage = 99.9  # Implausible voltage
                current = 0.0
                temp = -99.0
                sensor_status = "SENSOR_FAULT"

            payload = {
                "device_id": args.device_id,
                "timestamp": now,
                "sequence": seq,
                "voltage_v": voltage,
                "current_a": current,
                "temperature_c": temp,
                "soc_pct": None,  # Evaluated by backend Coulomb counter
                "soh_pct": None,  # Strictly None
                "source": "hardware",  # Tagged as HARDWARE for testing hardware pipeline
                "sensor_status": sensor_status
            }

            json_str = json.dumps(payload)

            if not args.use_http and client and client.is_connected():
                client.publish(topic, json_str, qos=1)
                print(f"[MQTT TX #{seq}] V={voltage}V, I={current}A, T={temp}°C, Status={sensor_status}")
            else:
                if requests:
                    try:
                        res = requests.post("http://localhost:8000/api/telemetry", json=payload, timeout=2.0)
                        print(f"[HTTP TX #{seq}] Status: {res.status_code} | V={voltage}V, I={current}A, T={temp}°C")
                    except Exception as err:
                        print(f"[HTTP ERROR #{seq}] Failed to reach backend: {err}")
                else:
                    print(f"[PAYLOAD #{seq}] {json_str}")

            time.sleep(args.interval)

    except KeyboardInterrupt:
        print("\n[STOP] Stopping test publisher...")
        if client:
            # Publish offline LWT status
            client.publish(status_topic, json.dumps({"device_id": args.device_id, "status": "offline"}), qos=1)
            client.loop_stop()
            client.disconnect()
        print("[DONE] Exited cleanly.")


if __name__ == "__main__":
    main()
