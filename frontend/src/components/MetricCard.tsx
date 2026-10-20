import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string | null | undefined;
  unit?: string;
  icon: LucideIcon;
  subtext?: string;
  status?: 'normal' | 'warning' | 'critical' | 'neutral';
  color?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'blue';
  isEstimate?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  icon: Icon,
  subtext,
  status = 'normal',
  color = 'cyan',
  isEstimate = false,
}) => {
  const isAvailable = value !== null && value !== undefined && value !== '';

  const getColorClasses = () => {
    if (status === 'critical') {
      return {
        border: 'border-rose-500/40',
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
        iconBg: 'bg-rose-500/10 text-rose-400',
        text: 'text-rose-400',
      };
    }
    if (status === 'warning') {
      return {
        border: 'border-amber-500/40',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
        iconBg: 'bg-amber-500/10 text-amber-400',
        text: 'text-amber-400',
      };
    }
    switch (color) {
      case 'emerald':
        return {
          border: 'border-emerald-500/30',
          glow: 'hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]',
          iconBg: 'bg-emerald-500/10 text-emerald-400',
          text: 'text-emerald-400',
        };
      case 'amber':
        return {
          border: 'border-amber-500/30',
          glow: 'hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]',
          iconBg: 'bg-amber-500/10 text-amber-400',
          text: 'text-amber-400',
        };
      case 'rose':
        return {
          border: 'border-rose-500/30',
          glow: 'hover:shadow-[0_0_15px_rgba(244,63,94,0.15)]',
          iconBg: 'bg-rose-500/10 text-rose-400',
          text: 'text-rose-400',
        };
      case 'blue':
        return {
          border: 'border-blue-500/30',
          glow: 'hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]',
          iconBg: 'bg-blue-500/10 text-blue-400',
          text: 'text-blue-400',
        };
      case 'cyan':
      default:
        return {
          border: 'border-cyan-500/30',
          glow: 'hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]',
          iconBg: 'bg-cyan-500/10 text-cyan-400',
          text: 'text-cyan-400',
        };
    }
  };

  const c = getColorClasses();

  return (
    <div
      className={`glass-panel p-4 rounded-2xl border transition-all duration-300 ${c.border} ${c.glow} relative overflow-hidden group`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            {title}
            {isEstimate && (
              <span className="text-[10px] lowercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-normal">
                est.
              </span>
            )}
          </span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            {isAvailable ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                  {typeof value === 'number' ? value.toFixed(1) : value}
                </span>
                {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
              </>
            ) : (
              <span className="text-base sm:text-lg font-semibold text-slate-500 italic">
                Unavailable
              </span>
            )}
          </div>
        </div>

        <div className={`p-2.5 rounded-xl ${c.iconBg} transition-transform group-hover:scale-110 duration-200`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {subtext && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>{subtext}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${status === 'critical' ? 'bg-rose-400 animate-ping' : status === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
        </div>
      )}
    </div>
  );
};
