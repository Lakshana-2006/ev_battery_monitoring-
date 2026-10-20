import React from 'react';
import { useBattery } from '../context/BatteryContext';
import {
  HardDrive,
  Wifi,
  Radio,
  Cpu,
  Server,
  Activity,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const DeviceStatusPage: React.FC = () => {
  const { device, telemetry, connectionBadge, isWsConnected } = useBattery();

  const isOnline = connectionBadge === 'LIVE HARDWARE' || connectionBadge === 'DEMO SIMULATION';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            ESP8266 NODEMCU HARDWARE ARCHITECTURE & NETWORK DIAGNOSTICS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Microcontroller telemetry node, ADC interfaces, Mosquitto MQTT broker, and Last Will diagnostics.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
            connectionBadge === 'LIVE HARDWARE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
            connectionBadge === 'DEMO SIMULATION' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' :
            connectionBadge === 'STALE DATA' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
            'bg-rose-500/20 text-rose-400 border-rose-500/40'
          }`}>
            {connectionBadge}
          </span>
        </div>
      </div>

      {/* Network & Infrastructure Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ESP8266 Microcontroller */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">NodeMCU Board</h3>
              <span className="text-[11px] text-slate-400 font-mono">ESP-12E / ESP8266EX Core</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Clock Frequency</span>
              <span className="font-mono text-white">80 MHz / 160 MHz</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Firmware Version</span>
              <span className="font-mono text-cyan-400">{device?.firmware_version || 'v1.0.0-esp8266'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Target Device ID</span>
              <span className="font-mono text-emerald-400 font-bold">{device?.device_id || 'ev-battery-001'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Publish Loop Interval</span>
              <span className="font-mono text-white">1500 ms (1.5 seconds)</span>
            </div>
          </div>
        </div>

        {/* Mosquitto MQTT Broker */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mosquitto MQTT</h3>
              <span className="text-[11px] text-slate-400 font-mono">Port 1883 | QoS 1</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Telemetry Topic</span>
              <span className="font-mono text-cyan-400">ev-battery/+/telemetry</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Status / LWT Topic</span>
              <span className="font-mono text-emerald-400">ev-battery/+/status</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Last Will Message</span>
              <span className="font-mono text-rose-400">&#123;&quot;status&quot;:&quot;offline&quot;&#125;</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Alerts Topic</span>
              <span className="font-mono text-amber-400">ev-battery/ev-battery-001/alerts</span>
            </div>
          </div>
        </div>

        {/* Real-time Watchdog Health */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Watchdog Monitor</h3>
              <span className="text-[11px] text-slate-400 font-mono">Telemetry Liveness Check</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Stale Threshold</span>
              <span className="font-mono text-amber-400">6.0 seconds</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Disconnect Threshold</span>
              <span className="font-mono text-rose-400">15.0 seconds</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Browser WebSocket</span>
              <span className="font-mono text-emerald-400">{isWsConnected ? 'Active Connected' : 'Disconnected'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Last Seen</span>
              <span className="font-mono text-slate-300">
                {device?.last_seen ? new Date(device.last_seen).toLocaleTimeString() : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Engineering Note: ESP8266 ADC Limitations */}
      <div className="glass-panel p-6 rounded-2xl border border-cyan-800/60 bg-gradient-to-br from-navy-900 to-navy-950">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          ESP8266 ADC Limitation & Hardware Interface Guide
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
          <div className="space-y-3">
            <p className="leading-relaxed">
              <strong className="text-white">The Single ADC A0 Limitation:</strong> The ESP8266 silicon possesses only <strong>one analog-to-digital converter pin (A0)</strong>. Furthermore, the bare chip input has a strict <strong>0.0V to 1.0V</strong> ceiling. NodeMCU breakout boards add an internal 220kΩ / 100kΩ divider scaling the input to <strong>0.0V to 3.3V</strong>.
            </p>
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 font-mono text-[11px]">
              ⚠️ WARNING: Never connect battery voltage (e.g. 12V or 48V) directly to A0. An external precision resistor divider is mandatory!
            </div>
          </div>

          <div className="space-y-3">
            <p className="leading-relaxed">
              <strong className="text-white">Supported Multi-Sensor Wiring Topologies:</strong>
            </p>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800 flex items-center justify-between">
                <span className="text-cyan-400 font-semibold">Topology 1 (Recommended):</span>
                <span className="text-white">ADS1115 (4-Ch 16-Bit I2C ADC)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800 flex items-center justify-between">
                <span className="text-cyan-400 font-semibold">Topology 2 (Digital Modules):</span>
                <span className="text-white">INA219 (I2C V/I) + DS18B20 (1-Wire Temp)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800 flex items-center justify-between">
                <span className="text-cyan-400 font-semibold">Topology 3 (Single A0 Pin):</span>
                <span className="text-white">Voltage Divider on A0 + DS18B20 on D4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
