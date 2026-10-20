import React, { useState } from 'react';
import { useBattery } from '../context/BatteryContext';
import {
  Activity,
  Play,
  Pause,
  Zap,
  Gauge,
  Thermometer,
  Layers,
  Code2,
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export const LiveMonitoringPage: React.FC = () => {
  const { telemetry, liveHistory, connectionBadge } = useBattery();
  const [isPaused, setIsPaused] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Buffer used for charts (freezes when paused)
  const [frozenHistory, setFrozenHistory] = useState(liveHistory);

  const displayHistory = isPaused ? frozenHistory : liveHistory;

  const togglePause = () => {
    if (!isPaused) {
      setFrozenHistory([...liveHistory]);
    }
    setIsPaused(!isPaused);
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  const power = (telemetry?.voltage_v && telemetry.current_a)
    ? (telemetry.voltage_v * telemetry.current_a)
    : null;

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            HIGH-FREQUENCY LIVE OSCILLOSCOPE & TELEMETRY STREAM
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time sensor waveform ingestion with auto-scroll and stream freeze buffer
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={togglePause}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              isPaused
                ? 'bg-amber-500 text-navy-950 hover:bg-amber-400'
                : 'bg-slate-800 text-cyan-400 border border-cyan-800/60 hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'RESUME STREAM' : 'PAUSE / FREEZE'}
          </button>

          <button
            onClick={() => setShowJson(!showJson)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            {showJson ? 'HIDE JSON' : 'INSPECT RAW JSON'}
          </button>
        </div>
      </div>

      {/* Raw JSON packet inspector overlay if toggled */}
      {showJson && (
        <div className="glass-panel p-4 rounded-2xl border border-cyan-800/60 bg-navy-950 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
            <span>Last Received Packet Dump (MQTT / WebSocket)</span>
            <span className="text-cyan-400">Sequence #{telemetry?.sequence ?? '—'}</span>
          </div>
          <pre className="text-cyan-300 overflow-x-auto p-2 bg-slate-950/70 rounded-lg">
            {JSON.stringify(telemetry, null, 2)}
          </pre>
        </div>
      )}

      {/* Instantaneous High-Res Live Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Voltage Gauge */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Instant Voltage</span>
            <div className="text-3xl font-extrabold font-mono text-cyan-400 mt-1">
              {telemetry?.voltage_v !== null && telemetry?.voltage_v !== undefined
                ? `${telemetry.voltage_v.toFixed(2)} V`
                : 'Unavailable'}
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Sensors: Divider / ADS1115
            </span>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
            <Gauge className="w-6 h-6" />
          </div>
        </div>

        {/* Current Gauge */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Instant Current</span>
            <div className={`text-3xl font-extrabold font-mono mt-1 ${
              telemetry?.current_a && telemetry.current_a > 0 ? 'text-emerald-400' : 'text-cyan-300'
            }`}>
              {telemetry?.current_a !== null && telemetry?.current_a !== undefined
                ? `${telemetry.current_a.toFixed(2)} A`
                : 'Unavailable'}
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {telemetry?.current_a && telemetry.current_a > 0 ? '+Charging vector' : '-Discharging vector'}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        {/* Instant Power */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Electrical Power</span>
            <div className="text-3xl font-extrabold font-mono text-white mt-1">
              {power !== null ? `${Math.abs(power).toFixed(1)} W` : '—'}
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {power && power > 0 ? 'Charging input' : 'Load delivery'}
            </span>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Temperature Gauge */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Core Temperature</span>
            <div className={`text-3xl font-extrabold font-mono mt-1 ${
              telemetry?.temperature_c && telemetry.temperature_c > 45 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {telemetry?.temperature_c !== null && telemetry?.temperature_c !== undefined
                ? `${telemetry.temperature_c.toFixed(1)} °C`
                : 'Unavailable'}
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Sensor: DS18B20 / NTC
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Thermometer className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Real-Time Oscilloscope Line Chart */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Live Synchronized Sensor Trace
            </h3>
            <p className="text-xs text-slate-400">
              {isPaused ? 'BUFFER FROZEN — Click Resume to restart live stream' : 'Streaming incoming telemetry packets...'}
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-mono">
            <span className="text-cyan-400">● Voltage</span>
            <span className="text-emerald-400">● Current</span>
            <span className="text-amber-400">● Temperature</span>
            <span className="text-purple-400">● SOC</span>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayHistory}>
              <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
              <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                labelFormatter={(ts) => formatTime(ts as string)}
              />
              <Legend />
              <Line type="monotone" dataKey="voltage_v" stroke="#06b6d4" strokeWidth={2.5} dot={false} name="Voltage (V)" isAnimationActive={false} />
              <Line type="monotone" dataKey="current_a" stroke="#10b981" strokeWidth={2} dot={false} name="Current (A)" isAnimationActive={false} />
              <Line type="monotone" dataKey="temperature_c" stroke="#f59e0b" strokeWidth={2} dot={false} name="Temperature (°C)" isAnimationActive={false} />
              <Line type="monotone" dataKey="soc_pct" stroke="#c084fc" strokeWidth={2} dot={false} name="SOC (%)" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
