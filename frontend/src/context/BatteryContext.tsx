import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Telemetry, DeviceInfo, AIPrediction, BatteryAlert, ModelMetadata, ConnectionBadge } from '../types';
import { api, WS_BASE } from '../services/api';

interface BatteryContextType {
  device: DeviceInfo | null;
  telemetry: Telemetry | null;
  prediction: AIPrediction | null;
  alerts: BatteryAlert[];
  liveHistory: Telemetry[];
  modelMeta: ModelMetadata | null;
  connectionBadge: ConnectionBadge;
  isWsConnected: boolean;
  refreshDevice: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  refreshModel: () => Promise<void>;
  acknowledgeAlert: (alertId: number) => Promise<void>;
  resolveAlert: (alertId: number) => Promise<void>;
}

const BatteryContext = createContext<BatteryContextType | undefined>(undefined);

export const BatteryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [alerts, setAlerts] = useState<BatteryAlert[]>([]);
  const [liveHistory, setLiveHistory] = useState<Telemetry[]>([]);
  const [modelMeta, setModelMeta] = useState<ModelMetadata | null>(null);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [connectionBadge, setConnectionBadge] = useState<ConnectionBadge>('DISCONNECTED');
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial data loader
  const refreshDevice = useCallback(async () => {
    try {
      const data = await api.getDeviceLatest('ev-battery-001');
      setDevice(data.device);
      setConnectionBadge(data.device.badge);
      if (data.latest_telemetry) {
        setTelemetry(data.latest_telemetry);
        setLiveHistory(prev => {
          if (prev.length === 0) return [data.latest_telemetry!];
          return prev;
        });
      }
      if (data.latest_prediction) {
        setPrediction(data.latest_prediction);
      }
    } catch (e) {
      console.warn('Initial device fetch failed (server may be starting):', e);
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    try {
      const res = await api.getAlerts({ limit: 50 });
      setAlerts(res.items);
    } catch (e) {
      console.warn('Alerts fetch failed:', e);
    }
  }, []);

  const refreshModel = useCallback(async () => {
    try {
      const data = await api.getModelStatus();
      setModelMeta(data);
    } catch (e) {
      console.warn('Model status fetch failed:', e);
    }
  }, []);

  const acknowledgeAlert = async (alertId: number) => {
    try {
      const updated = await api.updateAlertStatus(alertId, 'ACKNOWLEDGED');
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
    } catch (e) {
      console.error('Failed to acknowledge alert:', e);
    }
  };

  const resolveAlert = async (alertId: number) => {
    try {
      const updated = await api.updateAlertStatus(alertId, 'RESOLVED');
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
    } catch (e) {
      console.error('Failed to resolve alert:', e);
    }
  };

  // WebSocket connection management with reconnect
  useEffect(() => {
    let unmounted = false;

    const connectWebSocket = () => {
      if (unmounted) return;

      try {
        const ws = new WebSocket(WS_BASE);
        wsRef.current = ws;

        ws.onopen = () => {
          if (unmounted) return;
          setIsWsConnected(true);
          console.log('[WS] Connected to real-time telemetry stream');
        };

        ws.onmessage = (event) => {
          if (unmounted) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'TELEMETRY' && msg.data) {
              const item: Telemetry = {
                id: msg.data.id,
                device_id: msg.data.device_id,
                timestamp: msg.data.timestamp,
                sequence: msg.data.sequence,
                voltage_v: msg.data.voltage_v,
                current_a: msg.data.current_a,
                temperature_c: msg.data.temperature_c,
                soc_pct: msg.data.soc_pct,
                soh_pct: msg.data.soh_pct,
                power_w: msg.data.power_w,
                source: msg.data.source,
                sensor_status: msg.data.sensor_status,
                is_valid: msg.data.is_valid,
                validation_error: msg.data.validation_error
              };

              setTelemetry(item);

              if (msg.data.device_status) {
                setConnectionBadge(msg.data.device_status.badge);
                setDevice(prev => prev ? {
                  ...prev,
                  status: msg.data.device_status.connectivity,
                  badge: msg.data.device_status.badge,
                  last_seen: msg.data.device_status.last_seen
                } : null);
              }

              if (msg.data.ai_prediction) {
                setPrediction(msg.data.ai_prediction);
              }

              // Append to rolling live history buffer (keep last 40 frames)
              setLiveHistory(prev => {
                const next = [...prev, item];
                if (next.length > 40) return next.slice(next.length - 40);
                return next;
              });

              // If there are new alerts reported, refresh alerts
              if (msg.data.new_alerts && msg.data.new_alerts.length > 0) {
                refreshAlerts();
              }
            }
          } catch (err) {
            console.error('[WS] Parse error:', err);
          }
        };

        ws.onclose = () => {
          if (unmounted) return;
          setIsWsConnected(false);
          // Retry connection after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (e) => {
          console.warn('[WS] Error:', e);
          ws.close();
        };
      } catch (err) {
        console.warn('[WS] Setup failed, retrying in 3s:', err);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      }
    };

    // Initial load
    refreshDevice();
    refreshAlerts();
    refreshModel();
    connectWebSocket();

    // Periodic watchdog check every 4 seconds to detect stale/disconnected states even without WS messages
    const watchdogInterval = setInterval(() => {
      refreshDevice();
    }, 4000);

    return () => {
      unmounted = true;
      clearInterval(watchdogInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [refreshDevice, refreshAlerts, refreshModel]);

  return (
    <BatteryContext.Provider
      value={{
        device,
        telemetry,
        prediction,
        alerts,
        liveHistory,
        modelMeta,
        connectionBadge,
        isWsConnected,
        refreshDevice,
        refreshAlerts,
        refreshModel,
        acknowledgeAlert,
        resolveAlert
      }}
    >
      {children}
    </BatteryContext.Provider>
  );
};

export const useBattery = () => {
  const context = useContext(BatteryContext);
  if (!context) {
    throw new Error('useBattery must be used within a BatteryProvider');
  }
  return context;
};
