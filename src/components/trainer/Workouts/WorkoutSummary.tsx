import { useState, useEffect } from 'react';
import {
  X, Trophy, TrendingUp, TrendingDown, Clock, Dumbbell,
  Flame, Target, Star, Share2, CheckCircle, Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface WorkoutExercise {
  exercise: {
    id: string;
    name: string;
    muscle_group_id?: string;
  };
  sets: {
    weight: number;
    reps: number;
    rpe?: number;
  }[];
}

interface MuscleGroup {
  id: string;
  name: string;
}

interface PersonalRecord {
  exerciseName: string;
  type: 'weight' | 'reps' | 'volume';
  oldValue: number;
  newValue: number;
}

interface WorkoutSummaryProps {
  onClose: () => void;
  exercises: WorkoutExercise[];
  muscleGroups: MuscleGroup[];
  duration: number;
  traineeName: string;
  previousWorkout?: {
    totalVolume: number;
    exerciseCount: number;
    averageRpe: number;
  } | null;
  personalRecords?: PersonalRecord[];
}

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  'chest': '#ef4444',      // red-500
  'back': '#3b82f6',       // blue-500 (מותאם לפלטת המערכת)
  'shoulders': '#f59e0b',  // amber-500 (מותאם לפלטת המערכת)
  'biceps': '#10b981',     // emerald-500 (צבע ראשי במערכת)
  'triceps': '#3b82f6',    // blue-500
  'legs': '#ec4899',       // pink-500
  'glutes': '#f97316',     // orange-500
  'core': '#10b981',       // emerald-500 (מותאם לפלטת המערכת)
  'default': '#71717a',    // zinc-500 (מותאם לפלטת המערכת)
};

export default function WorkoutSummary({
  onClose,
  exercises,
  muscleGroups,
  duration,
  traineeName,
  previousWorkout,
  personalRecords = [],
}: WorkoutSummaryProps) {
  const [showConfetti, setShowConfetti] = useState(personalRecords.length > 0);
  const [animatedStats, setAnimatedStats] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStats(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const totalVolume = exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((setTotal, set) => setTotal + (set.weight * set.reps), 0);
  }, 0);

  const totalSets = exercises.reduce((total, ex) => total + ex.sets.length, 0);

  const averageRpe = exercises.reduce((total, ex) => {
    const exRpe = ex.sets.reduce((t, s) => t + (s.rpe || 0), 0) / ex.sets.length;
    return total + exRpe;
  }, 0) / exercises.length || 0;

  const volumeByMuscle = exercises.reduce((acc, ex) => {
    const muscleGroupId = ex.exercise.muscle_group_id || 'default';
    const muscleGroup = muscleGroups.find(mg => mg.id === muscleGroupId);
    const muscleName = muscleGroup?.name || 'אחר';
    const volume = ex.sets.reduce((t, s) => t + (s.weight * s.reps), 0);
    acc[muscleName] = (acc[muscleName] || 0) + volume;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(volumeByMuscle).map(([name, volume]) => ({
    name,
    volume: Math.round(volume),
    color: MUSCLE_GROUP_COLORS[name.toLowerCase()] || MUSCLE_GROUP_COLORS.default,
  })).sort((a, b) => b.volume - a.volume);

  const volumeChange = previousWorkout
    ? ((totalVolume - previousWorkout.totalVolume) / previousWorkout.totalVolume * 100)
    : null;

  const effortScore = Math.min(10, Math.round(
    (averageRpe * 0.4) +
    (Math.min(totalSets, 25) / 25 * 4) +
    (Math.min(exercises.length, 10) / 10 * 2)
  ) * 10) / 10;

  const getEffortLabel = (score: number) => {
    if (score >= 9) return 'אימון אינטנסיבי מאוד';
    if (score >= 7) return 'אימון טוב';
    if (score >= 5) return 'אימון בינוני';
    return 'אימון קל';
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')} שעות`;
    }
    return `${minutes} דקות`;
  };

  const handleShare = async () => {
    const shareText = `
סיכום אימון - ${traineeName}

נפח כולל: ${totalVolume.toLocaleString()} ק"ג
תרגילים: ${exercises.length}
סטים: ${totalSets}
זמן: ${formatDuration(duration)}
${personalRecords.length > 0 ? `\nשיאים חדשים: ${personalRecords.length}` : ''}
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'סיכום אימון',
          text: shareText,
        });
      } catch {
        await navigator.clipboard.writeText(shareText);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#64748b'][Math.floor(Math.random() * 5)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-4">
        <div className="sticky top-0 bg-emerald-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">אימון הושלם!</h2>
                <p className="text-sm text-emerald-100">{traineeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
              >
                <Share2 className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={onClose}
                className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {personalRecords.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 animate-pulse-slow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-amber-400">שיאים חדשים!</h3>
                  <p className="text-sm text-amber-400/70">{personalRecords.length} שיאים נשברו באימון הזה</p>
                </div>
                <Sparkles className="w-8 h-8 text-amber-500 mr-auto animate-spin-slow" />
              </div>
              <div className="space-y-2">
                {personalRecords.map((pr, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-surface rounded-xl p-3 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-amber-500" />
                      <span className="font-semibold text-foreground">{pr.exerciseName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted line-through">{pr.oldValue}</span>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-emerald-400">
                        {pr.newValue} {pr.type === 'weight' ? 'ק"ג' : pr.type === 'reps' ? 'חזרות' : 'ק"ג'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 transition-all duration-500 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">נפח כולל</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalVolume.toLocaleString()}</p>
              <p className="text-xs text-emerald-400/70">ק"ג</p>
              {volumeChange !== null && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${volumeChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {volumeChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{Math.abs(volumeChange).toFixed(1)}% מהאימון הקודם</span>
                </div>
              )}
            </div>

            <div className={`bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 transition-all duration-500 delay-100 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold text-blue-400">תרגילים</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{exercises.length}</p>
              <p className="text-xs text-blue-400/70">{totalSets} סטים</p>
            </div>

            <div className={`bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 transition-all duration-500 delay-200 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">משך</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatDuration(duration)}</p>
            </div>

            <div className={`bg-red-500/10 border border-red-500/30 rounded-xl p-4 transition-all duration-500 delay-300 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold text-red-400">מאמץ</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{effortScore}</p>
              <p className="text-xs text-red-400/70">{getEffortLabel(effortScore)}</p>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="bg-surface/30 border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground">נפח לפי קבוצת שריר</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                    <XAxis 
                      type="number" 
                      tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`} 
                      stroke="#71717a"
                      tick={{ fill: '#a1a1aa' }}
                      tickLine={false}
                      axisLine={{ stroke: '#3f3f46', strokeOpacity: 0.5 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={70} 
                      tick={{ fontSize: 12, fill: '#a1a1aa' }} 
                      stroke="#71717a"
                      tickLine={false}
                      axisLine={{ stroke: '#3f3f46', strokeOpacity: 0.5 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()} ק"ג`, 'נפח']}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid rgba(63, 63, 70, 0.5)', 
                        backgroundColor: 'rgba(24, 24, 27, 0.95)', 
                        backdropFilter: 'blur(8px)',
                        color: '#fff',
                        padding: '12px'
                      }}
                      cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                    />
                    <Bar 
                      dataKey="volume" 
                      radius={[0, 8, 8, 0]}
                      animationDuration={1000}
                      animationEasing="ease-in-out"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-surface/30 border border-border rounded-2xl p-6">
            <h3 className="font-bold text-foreground mb-4">סיכום תרגילים</h3>
            <div className="space-y-2">
              {exercises.map((ex, index) => {
                const exVolume = ex.sets.reduce((t, s) => t + (s.weight * s.reps), 0);
                const maxWeight = Math.max(...ex.sets.map(s => s.weight));
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-surface rounded-xl p-3 border border-border"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{ex.exercise.name}</p>
                      <p className="text-xs text-muted">{ex.sets.length} סטים</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-emerald-400">{exVolume.toLocaleString()} ק"ג</p>
                      <p className="text-xs text-muted">מקס: {maxWeight} ק"ג</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-border p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all"
          >
            סגור
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
