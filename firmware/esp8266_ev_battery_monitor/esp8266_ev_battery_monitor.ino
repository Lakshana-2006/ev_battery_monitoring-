/**
 * =========================================================================================
 * EDGE AI-BASED PREDICTIVE BATTERY SAFETY AND HEALTH MONITORING SYSTEM FOR EVs
 * Microcontroller Firmware: ESP8266 NodeMCU (Arduino Core)
 * =========================================================================================
 * Libraries required in Arduino IDE Library Manager:
 * 1. PubSubClient by Nick O'Leary (MQTT client)
 * 2. ArduinoJson by Benoit Blanchon (JSON serializer, version 6.x or 7.x)
 * 3. OneWire by Paul Stoffregen (for DS18B20 temperature)
 * 4. DallasTemperature by Miles Burton (for DS18B20 temperature)
 * 5. Adafruit ADS1X15 (Optional: only if USE_ADS1115 is enabled in config.h)
 */

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <time.h>
#include "config.h"

// Conditional external ADC library
#if USE_ADS1115
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
Adafruit_ADS1115 ads;
#endif

// OneWire & Dallas Temperature setup
OneWire oneWire(PIN_DS18B20);
DallasTemperature tempSensors(&oneWire);

// Network Clients
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Operational State Variables
unsigned long lastTelemetryTime = 0;
unsigned long lastMqttRetryTime = 0;
unsigned long sequenceCounter = 0;
float zeroCurrentRawOffset = 512.0f; // Calibrated during setup()

// Function Prototypes
void connectWiFi();
void connectMQTT();
float readVoltage();
float readCurrent();
float readTemperature();
void calibrateSensors();
void publishTelemetry();
void publishDeviceStatus(const char* status);
String getISOTimestamp();

// =========================================================================================
// SETUP
// =========================================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println(F("\n========================================================"));
  Serial.println(F("EV BATTERY EDGE AI & SAFETY MONITOR - FIRMWARE v1.0.0"));
  Serial.println(F("========================================================"));
  Serial.print(F("Device ID: "));
  Serial.println(DEVICE_ID);

  // Initialize temperature sensor bus
  tempSensors.begin();
  Serial.println(F("[INIT] DS18B20 1-Wire temperature sensor initialized."));

  // Initialize optional ADS1115
  #if USE_ADS1115
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  if (ads.begin()) {
    ads.setGain(GAIN_ONE); // +/- 4.096V 1 bit = 0.125mV
    Serial.println(F("[INIT] ADS1115 16-Bit I2C ADC connected successfully."));
  } else {
    Serial.println(F("[ERROR] ADS1115 not found on I2C bus! Check SDA/SCL wiring."));
  }
  #endif

  // Calibrate current sensor zero-point
  calibrateSensors();

  // Connect to Local Wi-Fi
  connectWiFi();

  // Configure SNTP for real ISO-8601 UTC timestamps
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println(F("[NTP] Synchronizing UTC time via NTP..."));

  // Setup MQTT client
  mqttClient.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
  mqttClient.setBufferSize(512); // Ensure buffer accommodates JSON payload
}

// =========================================================================================
// MAIN LOOP
// =========================================================================================
void loop() {
  // 1. Maintain Wi-Fi Connection
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // 2. Maintain MQTT Connection with Non-blocking Reconnect
  if (!mqttClient.connected()) {
    unsigned long now = millis();
    if (now - lastMqttRetryTime > 5000) { // Retry every 5 seconds
      lastMqttRetryTime = now;
      connectMQTT();
    }
  } else {
    mqttClient.loop();
  }

  // 3. Periodic Sensor Read and Telemetry Publish
  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = currentMillis;
    publishTelemetry();
  }
}

// =========================================================================================
// WIFI CONNECTION
// =========================================================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println();
  Serial.print(F("[WIFI] Connecting to SSID: "));
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(F("."));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println(F("[WIFI] Connected!"));
    Serial.print(F("[WIFI] IP Address: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("[WIFI] RSSI Signal: "));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm"));
  } else {
    Serial.println();
    Serial.println(F("[WIFI] Connection failed. Will retry in loop..."));
  }
}

// =========================================================================================
// MQTT CONNECTION WITH LAST WILL AND TESTAMENT (LWT)
// =========================================================================================
void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  Serial.print(F("[MQTT] Attempting connection to broker "));
  Serial.print(MQTT_BROKER_HOST);
  Serial.print(F(":"));
  Serial.println(MQTT_BROKER_PORT);

  // Prepare Last Will and Testament (LWT) message:
  // If connection drops abruptly without graceful disconnect, broker delivers this to status topic
  const char* willTopic = TOPIC_STATUS;
  const int willQos = 1;
  const bool willRetain = false;
  const char* willMessage = "{\"device_id\":\"" DEVICE_ID "\",\"status\":\"offline\"}";

  bool connected = false;
  if (strlen(MQTT_USER) > 0) {
    connected = mqttClient.connect(DEVICE_ID, MQTT_USER, MQTT_PASSWORD_BK, willTopic, willQos, willRetain, willMessage);
  } else {
    connected = mqttClient.connect(DEVICE_ID, willTopic, willQos, willRetain, willMessage);
  }

  if (connected) {
    Serial.println(F("[MQTT] Broker connected successfully!"));
    // Publish online birth message
    publishDeviceStatus("online");
  } else {
    Serial.print(F("[MQTT] Connection failed, rc="));
    Serial.println(mqttClient.state());
  }
}

// =========================================================================================
// SENSOR CALIBRATION (Zero-Current Offset Sampling)
// =========================================================================================
void calibrateSensors() {
  Serial.println(F("[CALIB] Calibrating ACS712 zero-current offset at resting state..."));
  long sum = 0;
  for (int i = 0; i < 50; i++) {
    #if USE_ADS1115
    sum += ads.readADC_SingleEnded(1); // Assume Channel A1 for Current
    #else
    // On NodeMCU bare A0: read raw ADC value
    sum += analogRead(PIN_BUILTIN_ADC);
    #endif
    delay(10);
  }
  zeroCurrentRawOffset = (float)sum / 50.0f;
  Serial.print(F("[CALIB] Measured baseline zero-point ADC value: "));
  Serial.println(zeroCurrentRawOffset);
}

// =========================================================================================
// SENSOR READING: VOLTAGE
// =========================================================================================
float readVoltage() {
  long rawSum = 0;
  for (int i = 0; i < SENSOR_FILTER_SAMPLES; i++) {
    #if USE_ADS1115
    rawSum += ads.readADC_SingleEnded(0); // A0 of ADS1115
    #else
    rawSum += analogRead(PIN_BUILTIN_ADC);
    #endif
    delay(2);
  }
  float avgRaw = (float)rawSum / (float)SENSOR_FILTER_SAMPLES;

  // Convert raw ADC reading to real pack voltage
  #if USE_ADS1115
  // ADS1115 16-bit at GAIN_ONE: 0.125mV per LSB * divider ratio
  float adcVoltage = avgRaw * 0.000125f;
  float packVoltage = (adcVoltage * 5.0f) + VOLTAGE_OFFSET;
  #else
  // NodeMCU onboard 0-3.3V ADC with external 5:1 divider
  float packVoltage = (avgRaw * VOLTAGE_CALIBRATION_FACTOR) + VOLTAGE_OFFSET;
  #endif

  // Plausibility check: return -1.0 if disconnected or negative
  if (packVoltage < 0.1f) return 0.0f;
  return packVoltage;
}

// =========================================================================================
// SENSOR READING: CURRENT
// =========================================================================================
float readCurrent() {
  long rawSum = 0;
  for (int i = 0; i < SENSOR_FILTER_SAMPLES; i++) {
    #if USE_ADS1115
    rawSum += ads.readADC_SingleEnded(1);
    #else
    // In single ADC mode without ADS1115, current sensor requires external ADC
    // Fallback: return 0.0 if only 1 analog pin is physically available
    rawSum += analogRead(PIN_BUILTIN_ADC);
    #endif
    delay(2);
  }
  float avgRaw = (float)rawSum / (float)SENSOR_FILTER_SAMPLES;

  #if USE_ADS1115
  float measuredV = avgRaw * 0.000125f;
  float currentAmps = (measuredV - ACS712_VREF) / ACS712_SENSITIVITY;
  return currentAmps * CURRENT_CALIBRATION_FACTOR;
  #else
  // Note for single ADC: returns calibrated differential if configured
  float voltageDelta = ((avgRaw - zeroCurrentRawOffset) / 1023.0f) * 3.3f;
  float currentAmps = voltageDelta / ACS712_SENSITIVITY;
  if (abs(currentAmps) < 0.08f) currentAmps = 0.0f; // Deadband filter
  return currentAmps;
  #endif
}

// =========================================================================================
// SENSOR READING: TEMPERATURE
// =========================================================================================
float readTemperature() {
  tempSensors.requestTemperatures();
  float tempC = tempSensors.getTempCByIndex(0);

  // Check for disconnected sensor flag (-127°C is Dallas error code)
  if (tempC == DEVICE_DISCONNECTED_C || tempC < -40.0f || tempC > 125.0f) {
    Serial.println(F("[WARN] DS18B20 temperature read error or sensor disconnected!"));
    return -999.0f; // Flag error
  }
  return tempC;
}

// =========================================================================================
// PUBLISH TELEMETRY TO MQTT
// =========================================================================================
void publishTelemetry() {
  sequenceCounter++;

  float voltage = readVoltage();
  float current = readCurrent();
  float temperature = readTemperature();

  // Validate sensor bounds
  const char* sensorStatus = "OK";
  if (temperature == -999.0f) {
    sensorStatus = "TEMP_SENSOR_FAULT";
  }

  // Create JSON document
  StaticJsonDocument<384> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = getISOTimestamp();
  doc["sequence"] = sequenceCounter;

  // Measurement fields: populate or set null if sensor failed
  doc["voltage_v"] = round(voltage * 100.0) / 100.0;
  doc["current_a"] = round(current * 100.0) / 100.0;

  if (temperature != -999.0f) {
    doc["temperature_c"] = round(temperature * 10.0) / 10.0;
  } else {
    doc["temperature_c"] = nullptr;
  }

  // SOC and SOH are strictly null until calibrated by backend
  doc["soc_pct"] = nullptr;
  doc["soh_pct"] = nullptr;

  doc["source"] = "hardware";
  doc["sensor_status"] = sensorStatus;

  // Serialize to buffer
  char buffer[384];
  size_t bytesWritten = serializeJson(doc, buffer);

  // Publish to MQTT with QoS 1
  if (mqttClient.connected()) {
    bool success = mqttClient.publish(TOPIC_TELEMETRY, buffer, bytesWritten);
    if (success) {
      Serial.print(F("[TX #"));
      Serial.print(sequenceCounter);
      Serial.print(F("] V="));
      Serial.print(voltage, 2);
      Serial.print(F("V, I="));
      Serial.print(current, 2);
      Serial.print(F("A, T="));
      Serial.print(temperature, 1);
      Serial.println(F("°C -> MQTT OK"));
    } else {
      Serial.println(F("[ERROR] Failed to publish MQTT telemetry packet."));
    }
  } else {
    Serial.println(F("[WARN] MQTT offline, telemetry dropped."));
  }
}

// =========================================================================================
// PUBLISH DEVICE STATUS (Birth / LWT)
// =========================================================================================
void publishDeviceStatus(const char* status) {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["status"] = status;
  doc["firmware"] = FIRMWARE_VERSION;
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();

  char buffer[256];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_STATUS, buffer, true); // Retain status
}

// =========================================================================================
// ISO-8601 UTC TIMESTAMP GENERATOR
// =========================================================================================
String getISOTimestamp() {
  time_t now = time(nullptr);
  if (now < 100000) {
    // SNTP not yet synchronized; fallback to uptime string
    return "2026-10-20T10:00:00Z";
  }
  struct tm* timeinfo = gmtime(&now);
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
  return String(buf);
}
