import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  color: 'emerald' | 'cyan' | 'amber' | 'teal' | 'rose';
}

export default function StatsCard({ title, value, change, icon: Icon, color }: StatsCardProps) {
  const colorConfig = {
    emerald: {
      bg: 'from-emerald-500/20 to-emerald-500/5',
      icon: 'bg-emerald-500/20 text-emerald-400',
      value: 'text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    },
    cyan: {
      bg: 'from-cyan-500/20 to-cyan-500/5',
      icon: 'bg-cyan-500/20 text-cyan-400',
      value: 'text-cyan-400',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    },
    amber: {
      bg: 'from-amber-500/20 to-amber-500/5',
      icon: 'bg-amber-500/20 text-amber-400',
      value: 'text-amber-400',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    },
    teal: {
      bg: 'from-teal-500/20 to-teal-500/5',
      icon: 'bg-teal-500/20 text-teal-400',
      value: 'text-teal-400',
      glow: 'shadow-[0_0_20px_rgba(20,184,166,0.15)]',
    },
    rose: {
      bg: 'from-rose-500/20 to-rose-500/5',
      icon: 'bg-rose-500/20 text-rose-400',
      value: 'text-rose-400',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    },
  };

  const config = colorConfig[color];

  return (
    <div className={`stat-card p-6 bg-gradient-to-br ${config.bg} ${config.glow}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">{title}</p>
          <p className={`text-3xl font-bold ${config.value} tracking-tight animate-count-up`}>
            {value}
          </p>
          {change && (
            <p className="text-sm text-[var(--color-text-muted)] mt-2 font-medium">
              {change}
            </p>
          )}
        </div>
        <div className={`p-3.5 rounded-xl ${config.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
