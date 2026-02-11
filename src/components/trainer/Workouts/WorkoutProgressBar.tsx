import { memo } from 'react';
import { Timer, Target, TrendingUp, Zap } from 'lucide-react';

interface WorkoutProgressBarProps {
  totalSets: number;
  completedSets: number;
  totalExercises: number;
  completedExercises: number;
  totalVolume: number;
  elapsedTime: number;
  progressPercent: number;
}

export const WorkoutProgressBar = memo(({
  totalSets,
  completedSets,
  totalExercises,
  completedExercises,
  totalVolume,
  elapsedTime,
  progressPercent,
}: WorkoutProgressBarProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="premium-card-static p-3 lg:p-4 mb-4 animate-fade-in">
      {/* Progress bar */}
      <div className="relative h-3 bg-surface rounded-full overflow-hidden mb-3 shadow-inner">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-600 via-primary-500 to-blue-500 rounded-full transition-all duration-500 shadow-lg"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{
            animation: 'shimmer 2s infinite',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
            backgroundSize: '200% 100%',
          }}></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-foreground z-10">{progressPercent}%</span>
        </div>
      </div>
      
      {/* Stats row */}
      <div className="flex items-center justify-between flex-wrap gap-2 lg:gap-4">
        {/* Timer */}
        <div className="flex items-center gap-2 bg-surface/50 px-3 py-1.5 rounded-lg border border-amber-500/30">
          <Timer className="h-4 w-4 text-amber-400" />
          <span className="font-mono font-semibold text-foreground text-sm lg:text-base">{formatTime(elapsedTime)}</span>
        </div>
        
        {/* Sets progress */}
        <div className="flex items-center gap-2 bg-surface/50 px-3 py-1.5 rounded-lg border border-blue-500/30">
          <Target className="h-4 w-4 text-blue-400" />
          <span className="text-sm lg:text-base">
            <span className="font-semibold text-blue-400">{completedSets}</span>
            <span className="text-muted">/{totalSets}</span>
            <span className="text-muted mr-1">סטים</span>
          </span>
        </div>
        
        {/* Volume */}
        <div className="flex items-center gap-2 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/30">
          <TrendingUp className="h-4 w-4 text-primary-400" />
          <span className="font-semibold text-primary-400 text-sm lg:text-base">{totalVolume.toLocaleString()}</span>
          <span className="text-primary-400/70 text-xs">ק״ג</span>
        </div>
        
        {/* Exercises progress */}
        <div className="flex items-center gap-2 bg-surface/50 px-3 py-1.5 rounded-lg border border-slate-500/30">
          <Zap className="h-4 w-4 text-slate-400" />
          <span className="text-sm lg:text-base">
            <span className="font-semibold text-slate-400">{completedExercises}</span>
            <span className="text-muted">/{totalExercises}</span>
            <span className="text-muted mr-1">תרגילים</span>
          </span>
        </div>
        
        {/* Progress percentage */}
        <div className="flex items-center gap-1 bg-gradient-to-r from-primary-500/20 to-primary-600/20 px-4 py-1.5 rounded-lg border border-primary-500/30">
          <span className="text-lg lg:text-xl font-bold text-foreground">{progressPercent}%</span>
          <span className="text-xs text-muted">הושלמו</span>
        </div>
      </div>
    </div>
  );
});

WorkoutProgressBar.displayName = 'WorkoutProgressBar';
