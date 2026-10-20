export type DeviceStatus = 'ONLINE' | 'STALE' | 'DISCONNECTED';
export type ConnectionBadge = 'LIVE HARDWARE' | 'DEMO SIMULATION' | 'STALE DATA' | 'DISCONNECTED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
export type ModelStatus = 'NOT TRAINED' | 'DEMO ONLY' | 'TRAINING / VALIDATION' | 'VALIDATED';

export interface Telemetry {
  id?: number;
  device_id: string;
  timestamp: string;
  sequence?: number | null;
  voltage_v: number | null;
  current_a: number | null;
  temperature_c: number | null;
  soc_pct: number | null;
  soh_pct: number | null;
  power_w?: number | null;
  source: 'hardware' | 'simulation' | string;
  sensor_status: string;
  is_valid: boolean;
  validation_error?: string | null;
}

export interface DeviceInfo {
  device_id: string;
  name: string;
  chemistry: string;
  series_cells: number;
  capacity_ah: number;
  status: DeviceStatus;
  badge: ConnectionBadge;
  data_source: string;
  last_seen: string | null;
  elapsed_seconds?: number;
  firmware_version?: string;
}

export interface AIPrediction {
  is_anomaly: boolean;
  anomaly_score: number | null;
  model_name: string;
  model_version: string;
  model_status: ModelStatus;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string | null;
}

export interface BatteryAlert {
  id: number;
  device_id: string;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  value: number | null;
  threshold: number | null;
  status: AlertStatus;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ModelMetadata {
  model_name: string;
  model_version: string;
  algorithm: string;
  status: ModelStatus;
  feature_names: string[];
  training_samples: number;
  hyperparameters: Record<string, any>;
  training_date: string | null;
  is_active: boolean;
  description: string | null;
}

export interface SimulationStatus {
  is_running: boolean;
  scenario: string;
  sequence: number;
  pause_transmissions: boolean;
}
