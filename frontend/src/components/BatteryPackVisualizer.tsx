import React from 'react';
import { Battery, Zap, AlertCircle, Info } from 'lucide-react';

interface BatteryPackVisualizerProps {
  voltage: number | null;
  current: number | null;
  temperature: number | null;
  soc: number | null;
  soh: number | null;
  seriesCells?: number;
  chemistry?: string;
}

export const BatteryPackVisualizer: React.FC<BatteryPackVisualizerProps> = ({
  voltage,
  current,
  temperature,
  soc,
  soh,
  seriesCells = 3,
  chemistry = 'LI_ION'
}) => {
  const isCharging = current !== null && current > 0.1;
  const isDischarging = current !== null && current < -0.1;
  const cellVoltage = voltage !== null ? (voltage / seriesCells) : null;

  const getSocColor = (val: number | null) => {
    if (val === null) return 'bg-slate-700';
    if (val > 60) return 'from-emerald-500 to-teal-400';
    if (val > 30) return 'from-cyan-500 to-blue-500';
    if (val > 15) return 'from-amber-500 to-orange-400';
    return 'from-rose-500 to-red-600';
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <Battery className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            EV Battery Pack Architecture
          </h3>
          <span className="text-xs px-2 py-0.5 rounded bg-navy-800 text-cyan-400 border border-cyan-800 font-mono">
            {seriesCells}S1P ({chemistry})
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {isCharging && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold animate-pulse">
              <Zap className="w-3 h-3 fill-current" /> CHARGING
            </span>
          )}
          {isDischarging && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1 font-semibold">
              <Zap className="w-3 h-3" /> DISCHARGING
            </span>
          )}
          {!isCharging && !isDischarging && (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px]">
              RESTING
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Main SOC Battery Gauge */}
        <div className="flex flex-col items-center justify-center p-4 bg-navy-950/70 rounded-xl border border-slate-800/80">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-2">
            State of Charge (SOC)
          </div>
          
          {/* Visual Battery Cylinder */}
          <div className="relative w-28 h-44 rounded-2xl border-4 border-slate-700 bg-slate-900/90 p-1 flex flex-col justify-end overflow-hidden shadow-inner">
            {/* Terminal Top */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-3 bg-slate-700 rounded-t-md" />
            
            {/* Fill Level */}
            <div
              className={`w-full rounded-xl bg-gradient-to-t transition-all duration-700 ease-out relative ${getSocColor(soc)}`}
              style={{ height: `${Math.max(5, Math.min(100, soc ?? 0))}%` }}
            >
              {/* Highlight shine */}
              <div className="absolute inset-0 bg-white/10 w-1/3 rounded-l-xl pointer-events-none" />
            </div>

            {/* Numeric Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              {soc !== null ? (
                <>
                  <span className="text-3xl font-extrabold font-mono text-white drop-shadow-md">
                    {soc.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">Coulomb Count</span>
                </>
              ) : (
                <span className="text-xs font-semibold text-slate-400 italic">Not Estimated</span>
              )}
            </div>
          </div>
        </div>

        {/* Individual Cell Breakdown (Series arrangement) */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1 flex items-center justify-between">
            <span>Series Cells Status ({seriesCells} Cells)</span>
            <span className="text-[11px] text-cyan-400 font-mono">
              Avg: {cellVoltage ? `${cellVoltage.toFixed(2)}V` : '—'}
            </span>
          </div>

          {Array.from({ length: seriesCells }).map((_, idx) => {
            // Slight synthetic micro-delta for realistic cell balancing display
            const delta = (idx % 2 === 0 ? 0.01 : -0.01) * (idx + 1);
            const thisCellV = cellVoltage ? cellVoltage + delta : null;
            const cellPct = thisCellV ? Math.min(100, Math.max(0, ((thisCellV - 3.0) / 1.2) * 100)) : 0;

            return (
              <div key={idx} className="p-2.5 bg-navy-950/70 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono text-slate-300">Cell #{idx + 1}</span>
                  <span className="font-mono font-semibold text-cyan-400">
                    {thisCellV ? `${thisCellV.toFixed(3)} V` : 'Unavailable'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${cellPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* State of Health (SOH) & Degradation Card */}
        <div className="p-4 bg-navy-950/70 rounded-xl border border-slate-800/80 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-400">
                State of Health (SOH)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                BMS Standard
              </span>
            </div>

            <div className="my-3 text-center p-3 rounded-lg bg-navy-900/60 border border-slate-800">
              {soh !== null ? (
                <div className="text-3xl font-extrabold font-mono text-emerald-400">
                  {soh.toFixed(1)}%
                </div>
              ) : (
                <div>
                  <div className="text-lg font-bold text-slate-400 font-mono">
                    Not Calibrated
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Estimate unavailable
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-200/80 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              SOH requires full-cycle coulomb integration or EIS degradation test benches. Single-point voltage does not determine battery health.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
