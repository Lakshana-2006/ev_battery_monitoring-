import React from 'react';
import {
  LayoutDashboard,
  Activity,
  BatteryCharging,
  Cpu,
  AlertTriangle,
  History,
  HardDrive,
  Settings,
  ChevronRight
} from 'lucide-react';

export type TabId =
  | 'overview'
  | 'live'
  | 'health'
  | 'ai'
  | 'alerts'
  | 'history'
  | 'device'
  | 'settings';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  activeAlertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, activeAlertCount }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitoring', icon: Activity },
    { id: 'health', label: 'Battery Health', icon: BatteryCharging },
    { id: 'ai', label: 'AI Analytics', icon: Cpu },
    { id: 'alerts', label: 'Alerts & Events', icon: AlertTriangle, badge: activeAlertCount },
    { id: 'history', label: 'Historical Data', icon: History },
    { id: 'device', label: 'Device Status', icon: HardDrive },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-navy-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-slate-500">
          Navigation Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as TabId)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/5'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              
              <div className="flex items-center space-x-1.5">
                {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4 text-cyan-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-800/80 bg-navy-950/60 m-3 rounded-xl border">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-400">Firmware Build</span>
          <span className="text-cyan-400 font-mono text-[11px]">v1.0.0-ESP8266</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Communication</span>
          <span className="text-emerald-400 font-mono text-[11px]">MQTT QoS 1</span>
        </div>
      </div>
    </aside>
  );
};
