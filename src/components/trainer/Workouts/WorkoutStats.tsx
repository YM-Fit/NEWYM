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
    <div className="premium-card-static p-4 mb-4">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-emerald-400" />
        סטטיסטיקות אימון
      </h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Volume */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-muted">נפח כולל</span>
          </div>
          <div className="text-xl font-bold text-emerald-400">{totalVolume.toLocaleString()}</div>
          <div className="text-xs text-muted">ק״ג</div>
        </div>

        {/* Average Weight */}
        {averageWeight !== undefined && averageWeight > 0 && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-muted">משקל ממוצע</span>
            </div>
            <div className="text-xl font-bold text-cyan-400">{averageWeight.toFixed(1)}</div>
            <div className="text-xs text-muted">ק״ג</div>
          </div>
        )}

        {/* Average Reps */}
        {averageReps !== undefined && averageReps > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-muted">חזרות ממוצע</span>
            </div>
            <div className="text-xl font-bold text-amber-400">{averageReps.toFixed(1)}</div>
            <div className="text-xs text-muted">חזרות</div>
          </div>
        )}

        {/* Duration */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-muted">משך זמן</span>
          </div>
          <div className="text-xl font-bold text-purple-400 font-mono">{formatTime(elapsedTime)}</div>
          <div className="text-xs text-muted">דקות:שניות</div>
        </div>

        {/* Total Sets */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-muted">סה״כ סטים</span>
          </div>
          <div className="text-xl font-bold text-blue-400">{totalSets}</div>
          <div className="text-xs text-muted">סטים</div>
        </div>

        {/* Total Exercises */}
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-teal-400" />
            <span className="text-xs text-muted">סה״כ תרגילים</span>
          </div>
          <div className="text-xl font-bold text-teal-400">{totalExercises}</div>
          <div className="text-xs text-muted">תרגילים</div>
        </div>
      </div>
    </div>
  );
});

WorkoutStats.displayName = 'WorkoutStats';
