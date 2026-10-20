/**
 * =========================================================================================
 * EDGE AI EV BATTERY MONITOR - ESP8266 FIRMWARE CONFIGURATION (config.h)
 * =========================================================================================
 * Configure your Wi-Fi credentials, MQTT broker IP, sensor pins, and calibration factors here.
 * NEVER commit private Wi-Fi passwords to public GitHub repositories!
 */

#ifndef CONFIG_H
#define CONFIG_H

// =========================================================================================
// 1. DEVICE IDENTIFICATION
// =========================================================================================
#define DEVICE_ID           "ev-battery-001"
#define FIRMWARE_VERSION    "v1.0.0-esp8266"

// =========================================================================================
// 2. WI-FI CONFIGURATION
// =========================================================================================
// Replace with your local Wi-Fi Access Point credentials:
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// =========================================================================================
// 3. MQTT BROKER CONFIGURATION
// =========================================================================================
// IMPORTANT: Do NOT use "localhost" or "127.0.0.1". Use the local LAN IP of the computer
// running Mosquitto (e.g., "192.168.1.50" or your cloud broker domain).
const char* MQTT_BROKER_HOST = "192.168.1.100";  // <-- Set to your PC / Broker LAN IP
const int   MQTT_BROKER_PORT = 1883;
const char* MQTT_USER        = "";               // Optional broker username
const char* MQTT_PASSWORD_BK = "";               // Optional broker password

// MQTT Topics
#define TOPIC_TELEMETRY     "ev-battery/" DEVICE_ID "/telemetry"
#define TOPIC_STATUS        "ev-battery/" DEVICE_ID "/status"
#define TOPIC_ALERTS        "ev-battery/" DEVICE_ID "/alerts"

// Telemetry Publication Interval (milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 1500;  // 1.5 seconds

// =========================================================================================
// 4. HARDWARE ADC & SENSOR TOPOLOGY SELECTION
// =========================================================================================
/**
 * ESP8266 SILICON LIMITATION NOTE:
 * The ESP8266 microcontroller only has ONE single built-in analog pin (A0).
 * - Bare ESP8266 A0 max voltage = 1.0 V.
 * - NodeMCU boards have an onboard 220k/100k resistor divider raising A0 limit to 3.3 V.
 * 
 * If you need to read BOTH analog voltage AND analog current (e.g. ACS712), you have 2 options:
 * OPTION A: Set USE_ADS1115 to true (Connect external ADS1115 16-bit 4-ch ADC over I2C D1/D2).
 * OPTION B: Set USE_ADS1115 to false (Voltage on NodeMCU A0 + Digital DS18B20 Temp on D4).
 */
#define USE_ADS1115         false   // Set to true if using ADS1115 I2C ADC module

// I2C Pins (if using ADS1115 or INA219)
#define PIN_I2C_SDA         4       // NodeMCU D2 (GPIO4)
#define PIN_I2C_SCL         5       // NodeMCU D1 (GPIO5)

// Temperature Sensor Pin (DS18B20 1-Wire Digital Sensor)
#define PIN_DS18B20         2       // NodeMCU D4 (GPIO2) with 4.7k pullup resistor

// Built-in ADC Pin
#define PIN_BUILTIN_ADC     A0

// =========================================================================================
// 5. SENSOR CALIBRATION FACTORS & CALCULATION CONSTANTS
// =========================================================================================
/**
 * VOLTAGE SENSOR CALIBRATION:
 * For a standard 25V voltage divider module (R1 = 30kΩ, R2 = 7.5kΩ, ratio = 5:1):
 * V_in = V_adc * (R1 + R2) / R2 = V_adc * 5.0
 * On NodeMCU: V_adc = (AnalogRead / 1023.0) * 3.3V
 * Voltage Scale Factor = (3.3 / 1023.0) * 5.0 = 0.016129
 */
const float VOLTAGE_CALIBRATION_FACTOR = 0.016129f;  // Adjust based on your precision multimeter
const float VOLTAGE_OFFSET            = 0.00f;      // Additive offset if needed

/**
 * CURRENT SENSOR CALIBRATION (ACS712 Hall-Effect Sensor):
 * ACS712 outputs Vcc/2 (2.5V on 5V supply) at 0 Amps.
 * Sensitivity:
 * - ACS712-05B: 185 mV/A (0.185 V/A)
 * - ACS712-20A: 100 mV/A (0.100 V/A)
 * - ACS712-30A: 66 mV/A  (0.066 V/A)
 */
const float ACS712_VREF               = 2.50f;      // Zero-current quiescent output voltage
const float ACS712_SENSITIVITY        = 0.185f;     // 185 mV/A for 5A version
const float CURRENT_CALIBRATION_FACTOR = 1.00f;

/**
 * NOISE FILTERING SAMPLES:
 * Moving average filter count to reject electrical switching noise from EV motor/inverters.
 */
const int SENSOR_FILTER_SAMPLES = 10;

#endif // CONFIG_H
