import React from 'react';
import { useBattery } from '../context/BatteryContext';
import { ShieldAlert, Cpu, Radio, Activity, RefreshCw } from 'lucide-react';

export const Header: React.FC = () => {
  const { device, telemetry, prediction, alerts, connectionBadge, isWsConnected, refreshDevice } = useBattery();

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const criticalCount = activeAlerts.filter(a => a.severity === 'CRITICAL').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'WARNING').length;

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case 'LIVE HARDWARE':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
      case 'DEMO SIMULATION':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]';
      case 'STALE DATA':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/40 animate-pulse';
      case 'DISCONNECTED':
      default:
        return 'bg-rose-500/15 text-rose-400 border-rose-500/40';
    }
  };

  const getModelBadge = (status?: string) => {
    switch (status) {
      case 'VALIDATED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'DEMO ONLY':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'TRAINING / VALIDATION':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse';
      case 'NOT TRAINED':
      default:
        return 'bg-slate-700/50 text-slate-400 border-slate-600/50';
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-navy-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Activity className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              EDGE AI EV BATTERY MONITOR
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                BMS v1.0
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            IoT & Edge AI Predictive Battery Safety and Health System | Target: <span className="text-cyan-400 font-mono">{device?.device_id || 'ev-battery-001'}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Connection Status Badge */}
        <div className="flex items-center">
          <span className={`px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-full border flex items-center gap-1.5 transition-all duration-300 ${getBadgeStyle(connectionBadge)}`}>
            <span className={`w-2 h-2 rounded-full ${
              connectionBadge === 'LIVE HARDWARE' ? 'bg-emerald-400 animate-ping' :
              connectionBadge === 'DEMO SIMULATION' ? 'bg-cyan-400' :
              connectionBadge === 'STALE DATA' ? 'bg-amber-400' : 'bg-rose-400'
            }`} />
            {connectionBadge}
          </span>
        </div>

        {/* AI Model Status Badge */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-lg border bg-navy-950 border-slate-800">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">AI:</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${getModelBadge(prediction?.model_status)}`}>
            {prediction?.model_status || 'NOT TRAINED'}
          </span>
        </div>

        {/* Alerts Pill */}
        {activeAlerts.length > 0 && (
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>{criticalCount > 0 ? `${criticalCount} CRITICAL` : `${warningCount} WARNING`}</span>
          </div>
        )}

        {/* WebSocket Signal */}
        <div className="flex items-center text-xs text-slate-400 pl-1 border-l border-slate-800">
          <Radio className={`w-4 h-4 ${isWsConnected ? 'text-emerald-400' : 'text-slate-600'}`} />
          <span className="ml-1 hidden xl:inline text-[11px] font-mono">
            {isWsConnected ? 'LIVE FEED' : 'CONNECTING'}
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => refreshDevice()}
          title="Refresh Data"
          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
