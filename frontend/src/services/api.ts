import { Telemetry, DeviceInfo, AIPrediction, BatteryAlert, ModelMetadata, SimulationStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
export const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000/ws/telemetry';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getDevices(): Promise<DeviceInfo[]> {
    const res = await fetch(`${API_BASE}/devices`);
    if (!res.ok) throw new Error('Failed to fetch devices');
    return res.json();
  },

  async getDeviceLatest(deviceId: string = 'ev-battery-001'): Promise<{
    device: DeviceInfo;
    latest_telemetry: Telemetry | null;
    latest_prediction: AIPrediction | null;
  }> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/latest`);
    if (!res.ok) throw new Error('Failed to fetch latest device snapshot');
    return res.json();
  },

  async updateDevice(deviceId: string, payload: Partial<DeviceInfo>): Promise<DeviceInfo> {
    const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update device settings');
    return res.json();
  },

  async calibrateSoc(deviceId: string, socPercent: number) {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/calibrate-soc?soc_percent=${socPercent}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to calibrate SOC');
    return res.json();
  },

  async getTelemetryHistory(params?: {
    device_id?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; limit: number; offset: number; items: Telemetry[] }> {
    const query = new URLSearchParams();
    if (params?.device_id) query.append('device_id', params.device_id);
    if (params?.source) query.append('source', params.source);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    const res = await fetch(`${API_BASE}/telemetry/history?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch telemetry history');
    return res.json();
  },

  async getAlerts(params?: {
    status?: string;
    severity?: string;
    limit?: number;
  }): Promise<{ total: number; active_count: number; warning_count: number; critical_count: number; items: BatteryAlert[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/alerts?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  async updateAlertStatus(alertId: number, status: 'ACKNOWLEDGED' | 'RESOLVED'): Promise<BatteryAlert> {
    const res = await fetch(`${API_BASE}/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update alert');
    return res.json();
  },

  async getModelStatus(): Promise<ModelMetadata> {
    const res = await fetch(`${API_BASE}/model/status`);
    if (!res.ok) throw new Error('Failed to fetch model status');
    return res.json();
  },

  async trainModel(forceDemoMode: boolean = false) {
    const res = await fetch(`${API_BASE}/model/train?force_demo_mode=${forceDemoMode}`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Training failed');
    }
    return res.json();
  },

  async getSimulationStatus(): Promise<SimulationStatus> {
    const res = await fetch(`${API_BASE}/simulation/status`);
    if (!res.ok) throw new Error('Failed to fetch simulation status');
    return res.json();
  },

  async startSimulation(scenario: string = 'NORMAL') {
    const res = await fetch(`${API_BASE}/simulation/start?scenario=${scenario}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to start simulation');
    return res.json();
  },

  async stopSimulation() {
    const res = await fetch(`${API_BASE}/simulation/stop`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to stop simulation');
    return res.json();
  },

  async setSimulationScenario(scenario: string) {
    const res = await fetch(`${API_BASE}/simulation/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario })
    });
    if (!res.ok) throw new Error('Failed to set scenario');
    return res.json();
  }
};
