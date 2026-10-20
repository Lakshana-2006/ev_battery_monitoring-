import React, { useState } from 'react';
import { useBattery } from '../context/BatteryContext';
import {
  BatteryCharging,
  Layers,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Info
} from 'lucide-react';
import { api } from '../services/api';

export const BatteryHealthPage: React.FC = () => {
  const { device, telemetry, refreshDevice } = useBattery();
  const [targetSoc, setTargetSoc] = useState(85.0);
  const [calibrating, setCalibrating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCalibrate = async () => {
    setCalibrating(true);
    setFeedback(null);
    try {
      await api.calibrateSoc(device?.device_id || 'ev-battery-001', targetSoc);
      setFeedback(`SOC successfully recalibrated to ${targetSoc}%!`);
      await refreshDevice();
    } catch (e: any) {
      setFeedback(`Failed: ${e.message}`);
    } finally {
      setCalibrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <BatteryCharging className="w-5 h-5 text-cyan-400" />
          STATE OF CHARGE (SOC) & STATE OF HEALTH (SOH) ESTIMATION
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Electrochemical state tracking, Coulomb integration drift compensation, and capacity degradation analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOC Coulomb Counting Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Coulomb Counting SOC Model
                </h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                ACTIVE
              </span>
            </div>

            <div className="p-4 bg-navy-950/80 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
              <div className="text-cyan-400 font-bold">Mathematical Formulation:</div>
              <div className="p-2.5 bg-slate-950 rounded-lg text-emerald-400 text-center font-bold text-sm">
                SOC(t) = SOC(t₀) + [ 1 / C_nom · ∫ I(t) · η dt ] × 100%
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] pt-1">
                <li><strong className="text-slate-200">C_nom:</strong> {device?.capacity_ah || 2.5} Ah ({((device?.capacity_ah || 2.5) * 3600).toFixed(0)} Coulombs)</li>
                <li><strong className="text-slate-200">Current Sign Convention:</strong> +I = Charging, -I = Discharging</li>
                <li><strong className="text-slate-200">Coulombic Efficiency (η):</strong> 98.0% during charge, 100% discharge</li>
                <li><strong className="text-slate-200">Sampling Interval:</strong> ~1.5s integration timestep (dt)</li>
              </ul>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Current SOC Reading:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {telemetry?.soc_pct !== null && telemetry?.soc_pct !== undefined ? `${telemetry.soc_pct.toFixed(1)}%` : 'Unavailable'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Battery Nominal Capacity:</span>
                <span className="font-mono text-white">{device?.capacity_ah || 2.5} Ah</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Resting Auto-Recalibration:</span>
                <span className="font-mono text-cyan-400">Enabled (at &gt;4.18V or &lt;3.0V cut-off)</span>
              </div>
            </div>
          </div>

          {/* Manual SOC Recalibration Section */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
              Manual Baseline Recalibration
            </span>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="0"
                max="100"
                value={targetSoc}
                onChange={(e) => setTargetSoc(parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-1.5 rounded-xl bg-navy-950 border border-slate-700 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400">%</span>
              <button
                onClick={handleCalibrate}
                disabled={calibrating}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {calibrating ? 'Calibrating...' : 'Set & Recalibrate'}
              </button>
            </div>
            {feedback && (
              <p className="text-xs text-emerald-400 mt-2 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {feedback}
              </p>
            )}
          </div>
        </div>

        {/* SOH Estimation Interface & Scientific Rigor Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  State of Health (SOH) Interface
                </h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                NOT CALIBRATED
              </span>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-200">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                Rigorous Engineering Standard:
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                State of Health (SOH) represents the usable capacity loss over cycles:
                <br />
                <span className="font-mono font-bold text-white">SOH = (Actual Discharged Capacity / Rated Nominal Capacity) × 100%</span>.
              </p>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                In electric vehicle battery management, <strong>SOH CANNOT be derived from single instantaneous voltage measurements</strong>. Doing so would violate basic electrochemical physics.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Prerequisites to Activate SOH Estimation:
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-navy-950/70 rounded-lg border border-slate-800 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                  <span className="text-slate-300">
                    <strong>Full Discharge Cycle Test:</strong> Continuous discharge logging from 100% to 0% at constant C-rate (e.g. 0.5C).
                  </span>
                </div>

                <div className="p-2.5 bg-navy-950/70 rounded-lg border border-slate-800 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                  <span className="text-slate-300">
                    <strong>Internal Resistance (DC-IR) Pulse Test:</strong> Measuring $\Delta V / \Delta I$ voltage drop within 100ms load pulse.
                  </span>
                </div>

                <div className="p-2.5 bg-navy-950/70 rounded-lg border border-slate-800 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] shrink-0 font-bold">3</span>
                  <span className="text-slate-300">
                    <strong>Edge AI Degradation Network:</strong> Training an LSTM or Random Forest regressor with ground-truth cycle wear data.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <span className="text-xs font-mono text-slate-500">
              Current SOH Status: <span className="text-slate-400 font-bold">Unavailable / Not Calibrated</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
