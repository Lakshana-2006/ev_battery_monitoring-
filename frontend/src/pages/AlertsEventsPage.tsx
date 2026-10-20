import React, { useState } from 'react';
import { useBattery } from '../context/BatteryContext';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Check,
  RotateCcw,
  Filter,
  Info,
  Clock
} from 'lucide-react';

export const AlertsEventsPage: React.FC = () => {
  const { alerts, acknowledgeAlert, resolveAlert, refreshAlerts } = useBattery();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
    return true;
  });

  const activeCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const criticalCount = alerts.filter(a => a.status === 'ACTIVE' && a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter(a => a.status === 'ACTIVE' && a.severity === 'WARNING').length;

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'INFO':
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Total Recorded</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">{alerts.length}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold uppercase">Active Trips</span>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{activeCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30">
          <span className="text-xs text-amber-400 font-semibold uppercase">Active Warnings</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{warningCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-rose-500/30">
          <span className="text-xs text-rose-400 font-semibold uppercase">Critical Emergencies</span>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{criticalCount}</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-xs">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400 font-semibold">Filter Status:</span>
          {['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-xl font-mono text-xs transition ${
                filterStatus === s
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold'
                  : 'bg-navy-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-semibold">Severity:</span>
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-xl font-mono text-xs transition ${
                filterSeverity === sev
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
            <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white uppercase">No Alerts Match Query</h3>
            <p className="text-xs text-slate-400 mt-1">
              Battery pack parameters are within safe engineering thresholds.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`glass-panel p-4 rounded-2xl border transition-all duration-200 ${
                alert.status === 'ACTIVE' && alert.severity === 'CRITICAL'
                  ? 'border-rose-500/50 bg-rose-950/20 shadow-md shadow-rose-950/30'
                  : alert.status === 'ACTIVE' && alert.severity === 'WARNING'
                  ? 'border-amber-500/40 bg-amber-950/15'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                    alert.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-bold text-white text-sm tracking-wide">
                        {alert.alert_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                        alert.status === 'ACTIVE' ? 'bg-rose-500/20 text-rose-300' :
                        alert.status === 'ACKNOWLEDGED' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {alert.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="flex items-center space-x-4 text-[11px] font-mono text-slate-400 mt-2">
                      {alert.value !== null && alert.value !== undefined && (
                        <span>Breached Value: <strong className="text-white">{alert.value.toFixed(2)}</strong></span>
                      )}
                      {alert.threshold !== null && alert.threshold !== undefined && (
                        <span>Threshold: <strong className="text-slate-300">{alert.threshold.toFixed(2)}</strong></span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  {alert.status === 'ACTIVE' && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
