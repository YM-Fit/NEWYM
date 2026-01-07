import { Video as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  color: 'lime' | 'cyan' | 'orange' | 'green' | 'blue' | 'purple';
}

export default function StatsCard({ title, value, change, trend, icon: Icon, color }: StatsCardProps) {
  const colorClasses = {
    lime: 'bg-lime-500/20 text-lime-500',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    orange: 'bg-orange-500/20 text-orange-400',
    green: 'bg-lime-500/20 text-lime-500',
    blue: 'bg-cyan-500/20 text-cyan-400',
    purple: 'bg-cyan-500/20 text-cyan-400',
  };

  const valueColors = {
    lime: 'text-lime-500',
    cyan: 'text-cyan-400',
    orange: 'text-orange-400',
    green: 'text-lime-500',
    blue: 'text-cyan-400',
    purple: 'text-cyan-400',
  };

  const trendColors = {
    up: 'text-lime-500',
    down: 'text-red-400',
    neutral: 'text-gray-500',
  };

  return (
    <div className="stat-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${valueColors[color]}`}>{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${trend ? trendColors[trend] : 'text-gray-500'}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
