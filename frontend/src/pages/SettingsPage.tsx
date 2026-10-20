import React, { useState, useEffect } from 'react';
import { useBattery } from '../context/BatteryContext';
import {
  Settings,
  Battery,
  Sliders,
  Play,
  Square,
  Flame,
  Zap,
  AlertOctagon,
  Clock,
  WifiOff,
  CheckCircle2,
  Server
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { device, refreshDevice } = useBattery();

  // Battery settings form state
  const [chemistry, setChemistry] = useState(device?.chemistry || 'LI_ION');
  const [seriesCells, setSeriesCells] = useState(device?.series_cells || 3);
  const [capacityAh, setCapacityAh] = useState(device?.capacity_ah || 2.5);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Simulation controls state
  const [simRunning, setSimRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState('NORMAL');
  const [simMessage, setSimMessage] = useState<string | null>(null);

  const fetchSimStatus = async () => {
    try {
      const status = await api.getSimulationStatus();
      setSimRunning(status.is_running);
      setCurrentScenario(status.scenario);
    } catch (e) {
      console.warn('Failed to fetch sim status:', e);
    }
  };

  useEffect(() => {
    fetchSimStatus();
  }, []);

  useEffect(() => {
    if (device) {
      setChemistry(device.chemistry);
      setSeriesCells(device.series_cells);
      setCapacityAh(device.capacity_ah);
    }
  }, [device]);

  const handleSaveDeviceSettings = async () => {
    setSavingSettings(true);
    setSaveMessage(null);
    try {
      await api.updateDevice(device?.device_id || 'ev-battery-001', {
        chemistry,
        series_cells: seriesCells,
        capacity_ah: capacityAh
      });
      setSaveMessage('Battery pack configuration updated successfully!');
      await refreshDevice();
    } catch (e: any) {
      setSaveMessage(`Failed: ${e.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleStartSim = async (scenario: string = 'NORMAL') => {
    try {
      await api.startSimulation(scenario);
      setSimRunning(true);
      setCurrentScenario(scenario);
      setSimMessage(`Simulation active under scenario: ${scenario}`);
      await refreshDevice();
    } catch (e: any) {
      setSimMessage(`Error: ${e.message}`);
    }
  };

  const handleStopSim = async () => {
    try {
      await api.stopSimulation();
      setSimRunning(false);
      setSimMessage('Simulation stopped.');
      await refreshDevice();
    } catch (e: any) {
      setSimMessage(`Error: ${e.message}`);
    }
  };

  const handleSwitchScenario = async (scenario: string) => {
    try {
      if (!simRunning) {
        await handleStartSim(scenario);
        return;
      }
      await api.setSimulationScenario(scenario);
      setCurrentScenario(scenario);
      setSimMessage(`Switched scenario to: ${scenario}`);
      await refreshDevice();
    } catch (e: any) {
      setSimMessage(`Error: ${e.message}`);
    }
  };

  const scenarios = [
    {
      id: 'NORMAL',
      label: 'Normal Healthy Operation',
      icon: CheckCircle2,
      desc: '11.8V - 12.2V nominal, 2.5A - 4.0A discharge, ~29°C healthy temperature.',
      color: 'hover:border-emerald-500/50 hover:bg-emerald-500/10'
    },
    {
      id: 'TEMPERATURE_WARNING',
      label: 'Thermal Warning & Overheat',
      icon: Flame,
      desc: 'Temperature ramps from 44°C up to 57°C to test warning & critical thermal trips.',
      color: 'hover:border-rose-500/50 hover:bg-rose-500/10'
    },
    {
      id: 'ABNORMAL_CURRENT',
      label: 'Overcurrent Discharge Spike',
      icon: Zap,
      desc: 'Spikes load to 18A - 22A, breaching 15A threshold to trigger safety shutdown.',
      color: 'hover:border-amber-500/50 hover:bg-amber-500/10'
    },
    {
      id: 'SENSOR_FAULT',
      label: 'Sensor Out-of-Bounds Fault',
      icon: AlertOctagon,
      desc: 'Emits 99.9V reading to test plausibility checks and firmware fault flagging.',
      color: 'hover:border-purple-500/50 hover:bg-purple-500/10'
    },
    {
      id: 'STALE_TELEMETRY',
      label: 'Stale Telemetry Gap (Pause)',
      icon: Clock,
      desc: 'Halts packets for >6s so dashboard status switches to STALE DATA.',
      color: 'hover:border-amber-500/50 hover:bg-amber-500/10'
    },
    {
      id: 'DISCONNECTED',
      label: 'Device Disconnection (LWT)',
      icon: WifiOff,
      desc: 'Stops transmissions for >15s so watchdog switches state to DISCONNECTED.',
      color: 'hover:border-rose-500/50 hover:bg-rose-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          SYSTEM CONFIGURATION & HARDWARE SIMULATION BENCH
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Adjust physical pack chemistry parameters or test college viva scenarios without physical hardware.
        </p>
      </div>

      {/* Simulation Control Deck (PHASE 9) */}
      <div className="glass-panel p-6 rounded-2xl border border-cyan-800/60 bg-gradient-to-b from-navy-900 to-navy-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Demo Mode & Hardware Simulator Engine
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Generates physical EV battery dynamics tagged strictly as <span className="font-mono text-cyan-300 font-bold">DEMO SIMULATION</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {simRunning ? (
              <button
                onClick={handleStopSim}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 shadow-md shadow-rose-600/20"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Stop Simulator
              </button>
            ) : (
              <button
                onClick={() => handleStartSim('NORMAL')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Start Simulator
              </button>
            )}
          </div>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {scenarios.map((scen) => {
            const Icon = scen.icon;
            const isSelected = simRunning && currentScenario === scen.id;
            return (
              <button
                key={scen.id}
                onClick={() => handleSwitchScenario(scen.id)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-500/15 shadow-md shadow-cyan-500/10'
                    : `border-slate-800 bg-navy-950/70 ${scen.color}`
                }`}
              >
                <div className="flex items-start justify-between w-full mb-2">
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs text-white tracking-wide">{scen.label}</span>
                  </div>
                  {isSelected && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500 text-navy-950">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {scen.desc}
                </p>
              </button>
            );
          })}
        </div>

        {simMessage && (
          <p className="text-xs text-cyan-300 font-mono mt-4 text-center">
            {simMessage}
          </p>
        )}
      </div>

      {/* Battery Pack Physical Parameters Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Battery className="w-4 h-4 text-cyan-400" />
            Battery Chemistry & Series Configuration
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Cell Chemistry Model</label>
              <select
                value={chemistry}
                onChange={(e) => setChemistry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="LI_ION">Lithium-ion NMC (3.7V nominal, 4.2V max, 3.0V cut-off)</option>
                <option value="LIFEPO4">Lithium Iron Phosphate LiFePO4 (3.2V nominal, 3.65V max, 2.5V cut-off)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Series Cells Count (S)</label>
              <input
                type="number"
                min="1"
                max="16"
                value={seriesCells}
                onChange={(e) => setSeriesCells(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Pack nominal voltage: {(seriesCells * (chemistry === 'LI_ION' ? 3.7 : 3.2)).toFixed(1)}V | Max: {(seriesCells * (chemistry === 'LI_ION' ? 4.2 : 3.65)).toFixed(1)}V
              </span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Nominal Battery Pack Capacity (Ah)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="200"
                value={capacityAh}
                onChange={(e) => setCapacityAh(parseFloat(e.target.value) || 1.0)}
                className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Total pack energy capacity: ~{((seriesCells * (chemistry === 'LI_ION' ? 3.7 : 3.2)) * capacityAh).toFixed(1)} Wh
              </span>
            </div>

            <button
              onClick={handleSaveDeviceSettings}
              disabled={savingSettings}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 disabled:opacity-50"
            >
              {savingSettings ? 'Saving Configuration...' : 'Save Battery Pack Settings'}
            </button>

            {saveMessage && (
              <p className="text-xs text-emerald-400 font-mono text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {saveMessage}
              </p>
            )}
          </div>
        </div>

        {/* Safety Trip Thresholds Display */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Active Safety Trip Rules
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-navy-950/70 rounded-xl border border-slate-800">
                <div className="flex justify-between font-mono text-white mb-1">
                  <span>Overvoltage Trip (Pack)</span>
                  <span className="text-rose-400 font-bold">{(seriesCells * 4.28).toFixed(2)} V</span>
                </div>
                <p className="text-[11px] text-slate-400">Triggers critical safety alarm if single cell breaches 4.28V.</p>
              </div>

              <div className="p-3 bg-navy-950/70 rounded-xl border border-slate-800">
                <div className="flex justify-between font-mono text-white mb-1">
                  <span>Undervoltage Cutoff (Pack)</span>
                  <span className="text-rose-400 font-bold">{(seriesCells * 2.85).toFixed(2)} V</span>
                </div>
                <p className="text-[11px] text-slate-400">Triggers deep-discharge safety trip below 2.85V/cell.</p>
              </div>

              <div className="p-3 bg-navy-950/70 rounded-xl border border-slate-800">
                <div className="flex justify-between font-mono text-white mb-1">
                  <span>Thermal Emergency Limit</span>
                  <span className="text-rose-400 font-bold">55.0 °C</span>
                </div>
                <p className="text-[11px] text-slate-400">Critical thermal alert; warning starts at 45.0°C.</p>
              </div>

              <div className="p-3 bg-navy-950/70 rounded-xl border border-slate-800">
                <div className="flex justify-between font-mono text-white mb-1">
                  <span>Overcurrent Discharge Ceiling</span>
                  <span className="text-rose-400 font-bold">15.0 A</span>
                </div>
                <p className="text-[11px] text-slate-400">Max continuous allowable discharge vector.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
