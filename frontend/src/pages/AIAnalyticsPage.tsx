import React, { useState } from 'react';
import { useBattery } from '../context/BatteryContext';
import {
  Cpu,
  Brain,
  Sliders,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { api } from '../services/api';

export const AIAnalyticsPage: React.FC = () => {
  const { prediction, modelMeta, liveHistory, refreshModel } = useBattery();
  const [training, setTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState<string | null>(null);

  const handleTrain = async (forceDemo: boolean = false) => {
    setTraining(true);
    setTrainingResult(null);
    try {
      const res = await api.trainModel(forceDemo);
      setTrainingResult(res.message);
      await refreshModel();
    } catch (e: any) {
      setTrainingResult(`Training failed: ${e.message}`);
    } finally {
      setTraining(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'VALIDATED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'DEMO ONLY':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'TRAINING / VALIDATION':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse';
      case 'NOT TRAINED':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  // Prepare scatter data for multivariate correlation visualization
  const scatterData = liveHistory.map((h, i) => ({
    x: h.voltage_v || 0,
    y: h.current_a || 0,
    z: h.temperature_c || 0,
    index: i,
    isAnomaly: prediction?.is_anomaly || false
  }));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            EDGE AI ANOMALY DETECTION & PREDICTIVE ANALYTICS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Multivariate unsupervised anomaly detection using Scikit-Learn Isolation Forest.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Model Status:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${getStatusBadge(prediction?.model_status)}`}>
            {prediction?.model_status || 'NOT TRAINED'}
          </span>
        </div>
      </div>

      {/* Model Status & Disclaimer Card */}
      <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-200/90 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block mb-0.5">Academic Rigor & Scientific Integrity Notice:</strong>
          An untrained machine learning model cannot predict cell thermal runaway or exact remaining useful life (RUL).
          This system uses an <strong>Isolation Forest</strong> algorithm to detect multivariate distributional drift in Voltage, Current, Temperature, and Power vectors.
          Status is strictly displayed as <span className="font-mono font-bold text-white">NOT TRAINED</span> or <span className="font-mono font-bold text-white">DEMO ONLY</span> until validated on physical hardware test benches.
        </div>
      </div>

      {/* Model Architecture & Live Inference Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Inference Score */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Live Anomaly Score
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase ${
                prediction?.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                prediction?.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {prediction?.risk_level || 'LOW'} RISK
              </span>
            </div>

            <div className="my-4 text-center p-4 bg-navy-950/70 rounded-xl border border-slate-800">
              <div className="text-3xl font-extrabold font-mono text-cyan-400">
                {prediction?.anomaly_score !== null && prediction?.anomaly_score !== undefined
                  ? prediction.anomaly_score.toFixed(3)
                  : '—'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Isolation Forest Decision Function Score (&lt;0.0 = Outlier)
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed p-3 bg-navy-900/50 rounded-xl border border-slate-800/80">
              {prediction?.explanation || 'No real-time predictions logged yet.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Model Version</span>
            <span className="font-mono text-cyan-400">{prediction?.model_version || 'v1.0.0'}</span>
          </div>
        </div>

        {/* Model Pipeline Parameters */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Model Hyperparameters
              </span>
              <span className="text-xs font-mono text-cyan-400">IsolationForest</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Estimators (Trees)</span>
                <span className="font-mono text-white">100 Trees</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Contamination Rate</span>
                <span className="font-mono text-white">5.0% (0.05)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Feature Dimensions</span>
                <span className="font-mono text-cyan-400">4D (V, I, T, Power)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Training Samples</span>
                <span className="font-mono text-emerald-400">{modelMeta?.training_samples ?? 0} Samples</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Execution Target</span>
                <span className="font-mono text-slate-200">Python Backend / Edge Gateway</span>
              </div>
            </div>
          </div>

          {/* Model Training Trigger */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={() => handleTrain(false)}
              disabled={training}
              className="w-full py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {training ? 'Fitting Isolation Forest...' : 'Fit Model On Historical Telemetry'}
            </button>
            {trainingResult && (
              <p className="text-[11px] text-cyan-300 mt-2 text-center font-mono">
                {trainingResult}
              </p>
            )}
          </div>
        </div>

        {/* Feature Correlation Multi-Space Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Multivariate Scatter Plot
            </span>
            <span className="text-[10px] font-mono text-slate-400">Voltage (X) vs Current (Y)</span>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" dataKey="x" name="Voltage" unit="V" stroke="#64748b" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                <YAxis type="number" dataKey="y" name="Current" unit="A" stroke="#64748b" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Scatter name="Sensor States" data={scatterData} fill="#06b6d4">
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isAnomaly ? '#f43f5e' : '#06b6d4'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comparison: Rule-Based Safety vs Edge AI Anomaly Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Comparison: Rule-Based Thresholds vs. Edge AI Anomaly Detection
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Criteria</th>
                <th className="py-2.5 px-3">Rule-Based Safety Limits (BMS)</th>
                <th className="py-2.5 px-3">Edge AI Isolation Forest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
              <tr>
                <td className="py-2 px-3 font-semibold text-white">Detection Mechanism</td>
                <td className="py-2 px-3 text-cyan-300">Static single-variable thresholds (e.g. V &gt; 12.8V, T &gt; 45°C)</td>
                <td className="py-2 px-3 text-emerald-300">Multivariate correlation drift in 4D space (V, I, T, Power)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-white">Incipient Fault Sensitivity</td>
                <td className="py-2 px-3 text-slate-400">Blind to subtle shifts occurring within nominal bounds</td>
                <td className="py-2 px-3 text-emerald-300">Detects subtle anomalies before hard limits are breached</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-white">False Positive Protection</td>
                <td className="py-2 px-3 text-slate-300">Deterministic; zero false positives on calibrated sensors</td>
                <td className="py-2 px-3 text-amber-300">Requires training data baseline to prevent noise triggers</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-white">Action Taken</td>
                <td className="py-2 px-3 text-rose-300">Immediate Hardware Trip / Contactor Open</td>
                <td className="py-2 px-3 text-cyan-300">Predictive Warning & Predictive Maintenance Flag</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
