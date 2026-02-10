import { memo } from 'react';
import { TrendingUp, Target, Zap, Timer } from 'lucide-react';

interface WorkoutStatsProps {
  totalVolume: number;
  averageWeight?: number;
  averageReps?: number;
  totalSets: number;
  totalExercises: number;
  elapsedTime: number;
  isTablet?: boolean;
}

export const WorkoutStats = memo(({
  totalVolume,
  averageWeight,
  averageReps,
  totalSets,
  totalExercises,
  elapsedTime,
  isTablet,
}: WorkoutStatsProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="premium-card-static p-2 mb-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Total Volume */}
        <div className="flex items-center gap-1.5 bg-primary-500/10 border border-primary-500/30 rounded-lg px-2 py-1">
          <TrendingUp className="h-3 w-3 text-primary-400" />
          <span className="text-xs text-muted">נפח:</span>
          <span className="text-sm font-bold text-primary-400">{totalVolume.toLocaleString()}</span>
          <span className="text-[10px] text-muted">ק״ג</span>
        </div>

        {/* Average Weight */}
        {averageWeight !== undefined && averageWeight > 0 && (
          <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg px-2 py-1">
            <Target className="h-3 w-3 text-blue-400" />
            <span className="text-xs text-muted">ממוצע:</span>
            <span className="text-sm font-bold text-blue-400">{averageWeight.toFixed(1)}</span>
            <span className="text-[10px] text-muted">ק״ג</span>
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-1.5 bg-slate-500/10 border border-slate-500/30 rounded-lg px-2 py-1">
          <Timer className="h-3 w-3 text-slate-400" />
          <span className="text-sm font-bold text-slate-400 font-mono">{formatTime(elapsedTime)}</span>
        </div>

        {/* Total Sets */}
        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg px-2 py-1">
          <Target className="h-3 w-3 text-blue-400" />
          <span className="text-xs text-muted">סטים:</span>
          <span className="text-sm font-bold text-blue-400">{totalSets}</span>
        </div>

        {/* Total Exercises */}
        <div className="flex items-center gap-1.5 bg-primary-600/10 border border-primary-600/30 rounded-lg px-2 py-1">
          <Zap className="h-3 w-3 text-primary-400" />
          <span className="text-xs text-muted">תרגילים:</span>
          <span className="text-sm font-bold text-primary-400">{totalExercises}</span>
        </div>
      </div>
    </div>
  );
});

WorkoutStats.displayName = 'WorkoutStats';
