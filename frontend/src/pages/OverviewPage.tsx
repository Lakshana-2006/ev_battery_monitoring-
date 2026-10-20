import React from 'react';
import { useBattery } from '../context/BatteryContext';
import { MetricCard } from '../components/MetricCard';
import { BatteryPackVisualizer } from '../components/BatteryPackVisualizer';
import {
  Zap,
  Gauge,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Cpu,
  Layers,
  Activity,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const OverviewPage: React.FC = () => {
  const { device, telemetry, prediction, alerts, liveHistory, connectionBadge } = useBattery();

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const criticalCount = activeAlerts.filter(a => a.severity === 'CRITICAL').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'WARNING').length;

  // Determine overall battery status
  const batteryStatus = criticalCount > 0 ? 'CRITICAL' : warningCount > 0 ? 'WARNING' : 'HEALTHY';

  // Format chart time
  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if active */}
      {criticalCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-between text-rose-300 animate-pulse">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold text-sm tracking-wide">CRITICAL BATTERY SAFETY ALERT DETECTED</span>
              <p className="text-xs text-rose-300/80 mt-0.5">
                {activeAlerts[0]?.message || 'Threshold violation in progress. Inspect pack parameters immediately.'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500 text-white">
            SAFETY TRIP ACTIVE
          </span>
        </div>
      )}

      {/* Primary Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Voltage */}
        <MetricCard
          title="Pack Voltage"
          value={telemetry?.voltage_v}
          unit="V"
          icon={Gauge}
          color="cyan"
          subtext={`Limit: ${(device?.series_cells || 3) * 4.2}V max`}
          status={
            telemetry?.voltage_v && telemetry.voltage_v > (device?.series_cells || 3) * 4.25 ? 'critical' : 'normal'
          }
        />

        {/* Current */}
        <MetricCard
          title="Battery Current"
          value={telemetry?.current_a}
          unit="A"
          icon={Zap}
          color={telemetry?.current_a && telemetry.current_a > 0 ? 'emerald' : 'cyan'}
          subtext={telemetry?.current_a && telemetry.current_a > 0 ? '+Charging' : '-Discharging'}
          status={
            telemetry?.current_a && Math.abs(telemetry.current_a) > 15 ? 'critical' : 'normal'
          }
        />

        {/* Temperature */}
        <MetricCard
          title="Temperature"
          value={telemetry?.temperature_c}
          unit="°C"
          icon={Thermometer}
          color={telemetry?.temperature_c && telemetry.temperature_c > 45 ? 'rose' : 'emerald'}
          subtext="Max safe: 45.0°C"
          status={
            telemetry?.temperature_c && telemetry.temperature_c > 55 ? 'critical' :
            telemetry?.temperature_c && telemetry.temperature_c > 45 ? 'warning' : 'normal'
          }
        />

        {/* State of Charge (SOC) */}
        <MetricCard
          title="State of Charge"
          value={telemetry?.soc_pct}
          unit="%"
          icon={Layers}
          color="emerald"
          isEstimate={true}
          subtext="Coulomb count"
          status={
            telemetry?.soc_pct && telemetry.soc_pct < 15 ? 'critical' :
            telemetry?.soc_pct && telemetry.soc_pct < 25 ? 'warning' : 'normal'
          }
        />

        {/* State of Health (SOH) */}
        <MetricCard
          title="State of Health"
          value={telemetry?.soh_pct}
          unit="%"
          icon={Activity}
          color="blue"
          subtext="Not calibrated"
        />

        {/* AI Anomaly Status */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              AI Anomaly
            </span>
            <div className={`p-2 rounded-xl ${
              prediction?.is_anomaly ? 'bg-rose-500/20 text-rose-400' : 'bg-cyan-500/10 text-cyan-400'
            }`}>
              <Cpu className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2">
            <span className={`text-base font-bold font-mono px-2 py-0.5 rounded uppercase ${
              prediction?.is_anomaly
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {prediction?.is_anomaly ? 'ANOMALOUS' : 'NORMAL'}
            </span>
            <div className="text-[11px] text-slate-400 mt-2 truncate">
              Risk: <span className="font-semibold text-slate-200">{prediction?.risk_level || 'LOW'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pack Visualization & Metadata Info Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BatteryPackVisualizer
            voltage={telemetry?.voltage_v ?? null}
            current={telemetry?.current_a ?? null}
            temperature={telemetry?.temperature_c ?? null}
            soc={telemetry?.soc_pct ?? null}
            soh={telemetry?.soh_pct ?? null}
            seriesCells={device?.series_cells || 3}
            chemistry={device?.chemistry || 'LI_ION'}
          />
        </div>

        {/* Telemetry Integrity & Stream Health */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Stream Diagnostics
              </h3>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-navy-800 text-cyan-400 border border-cyan-800">
                Seq #{telemetry?.sequence ?? '—'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Data Origin</span>
                <span className="font-mono font-bold uppercase text-white">
                  {telemetry?.source === 'simulation' ? 'DEMO SIMULATION' : 'LIVE HARDWARE'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Sensor Status</span>
                <span className={`font-mono font-semibold ${
                  telemetry?.sensor_status === 'OK' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {telemetry?.sensor_status || 'OK'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Plausibility Check</span>
                <span className={`font-mono font-semibold ${
                  telemetry?.is_valid !== false ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {telemetry?.is_valid !== false ? 'PASSED (Valid)' : 'FAILED'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Last Received</span>
                <span className="font-mono text-slate-300">
                  {telemetry?.timestamp ? new Date(telemetry.timestamp).toLocaleTimeString() : 'Awaiting data...'}
                </span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Instantaneous Power</span>
                <span className="font-mono font-bold text-cyan-400">
                  {telemetry?.voltage_v && telemetry.current_a
                    ? `${(telemetry.voltage_v * telemetry.current_a).toFixed(1)} W`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Overall Safety Status</span>
              <span className={`font-bold font-mono px-2 py-0.5 rounded text-xs ${
                batteryStatus === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                batteryStatus === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                'bg-emerald-500/20 text-emerald-400'
              }`}>
                {batteryStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Rolling Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voltage & Current Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Voltage & Current Dynamic Waveform
              </h3>
              <p className="text-xs text-slate-400">Live multi-parameter tracking (last 40 frames)</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Voltage (V)
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Current (A)
              </span>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveHistory}>
                <defs>
                  <linearGradient id="voltsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="currGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#64748b" textAnchor="end" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelFormatter={(ts) => formatTime(ts as string)}
                />
                <Area type="monotone" dataKey="voltage_v" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#voltsGrad)" name="Voltage (V)" />
                <Area type="monotone" dataKey="current_a" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#currGrad)" name="Current (A)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temperature & SOC Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Temperature & SOC Profiles
              </h3>
              <p className="text-xs text-slate-400">Thermal dynamics and Coulomb charge dissipation</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Temp (°C)
              </span>
              <span className="flex items-center gap-1 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> SOC (%)
              </span>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveHistory}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelFormatter={(ts) => formatTime(ts as string)}
                />
                <Area type="monotone" dataKey="temperature_c" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#tempGrad)" name="Temp (°C)" />
                <Area type="monotone" dataKey="soc_pct" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#socGrad)" name="SOC (%)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
