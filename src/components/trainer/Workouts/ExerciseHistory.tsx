import { X, Calendar, TrendingUp, Dumbbell, Trophy, ArrowUp, Copy } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

interface ExerciseHistoryProps {
  traineeId: string;
  traineeName: string;
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
  onLoadData?: (sets: HistorySet[]) => void;
}

interface HistorySet {
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number;
  failure?: boolean;
  set_type: string;
  superset_weight?: number;
  superset_reps?: number;
  dropset_weight?: number;
  dropset_reps?: number;
}

interface WorkoutHistory {
  workout_id: string;
  workout_date: string;
  sets: HistorySet[];
}

export default function ExerciseHistory({
  traineeId,
  traineeName,
  exerciseId,
  exerciseName,
  onClose,
  onLoadData
}: ExerciseHistoryProps) {
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [traineeId, exerciseId]);

  // Calculate personal records
  const personalRecords = useMemo(() => {
    if (history.length === 0) return null;
    
    let maxWeight = 0;
    let maxVolume = 0;
    let maxReps = 0;
    
    history.forEach(workout => {
      workout.sets.forEach(set => {
        if (set.weight > maxWeight) maxWeight = set.weight;
        if (set.reps > maxReps) maxReps = set.reps;
        const volume = set.weight * set.reps;
        if (volume > maxVolume) maxVolume = volume;
      });
    });
    
    return { maxWeight, maxVolume, maxReps };
  }, [history]);

  const loadHistory = async () => {
    const { data: workoutExercises } = await supabase
      .from('workout_exercises')
      .select(`
        id,
        workout_id,
        workouts!inner (
          id,
          workout_date,
          is_completed
        ),
        exercise_sets (
          set_number,
          weight,
          reps,
          rpe,
          failure,
          set_type,
          superset_weight,
          superset_reps,
          dropset_weight,
          dropset_reps
        )
      `)
      .eq('trainee_id', traineeId)
      .eq('exercise_id', exerciseId)
      .eq('workouts.is_completed', true)
      .order('workouts(workout_date)', { ascending: false })
      .limit(10);

    if (workoutExercises) {
      const formatted: WorkoutHistory[] = workoutExercises.map((we: any) => ({
        workout_id: we.workouts.id,
        workout_date: we.workouts.workout_date,
        sets: (we.exercise_sets || []).sort((a: any, b: any) => a.set_number - b.set_number)
      }));

      setHistory(formatted);
    }

    setLoading(false);
  };

  const getBestSet = (sets: HistorySet[]) => {
    if (sets.length === 0) return null;
    return sets.reduce((best, set) => {
      const currentVolume = set.weight * set.reps;
      const bestVolume = best.weight * best.reps;
      return currentVolume > bestVolume ? set : best;
    });
  };

  const getTotalVolume = (sets: HistorySet[]) => {
    return sets.reduce((total, set) => {
      let volume = set.weight * set.reps;

      if (set.set_type === 'superset' && set.superset_weight && set.superset_reps) {
        volume += set.superset_weight * set.superset_reps;
      }

      if (set.set_type === 'dropset' && set.dropset_weight && set.dropset_reps) {
        volume += set.dropset_weight * set.dropset_reps;
      }

      return total + volume;
    }, 0);
  };

  return (
    <>
      {/* Overlay - not full screen, allows seeing exercise list */}
      <div 
        className="fixed inset-0 backdrop-blur-sm bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Side Panel - Minimized */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 flex flex-col shadow-2xl bg-card border-r border-border animate-slide-in-right exercise-history-panel">
        {/* Header - Minimized */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1 min-w-0">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg flex-shrink-0">
                <Dumbbell className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-foreground truncate">{exerciseName}</h2>
                <p className="text-xs text-emerald-100 truncate">{traineeName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-all flex-shrink-0 mr-2"
              aria-label="סגור"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Personal Records - Minimized */}
        {personalRecords && (
          <div className="p-2 bg-gradient-to-b from-amber-500/10 to-transparent border-b border-border">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface rounded-lg p-2 border border-amber-500/20 text-center">
                <div className="text-base font-bold text-foreground">{personalRecords.maxWeight}</div>
                <div className="text-[10px] text-muted">מקס ק״ג</div>
              </div>
              <div className="bg-surface rounded-lg p-2 border border-cyan-500/20 text-center">
                <div className="text-base font-bold text-foreground">{personalRecords.maxReps}</div>
                <div className="text-[10px] text-muted">מקס חזרות</div>
              </div>
              <div className="bg-surface rounded-lg p-2 border border-emerald-500/20 text-center">
                <div className="text-base font-bold text-foreground">{personalRecords.maxVolume.toLocaleString()}</div>
                <div className="text-[10px] text-muted">מקס נפח</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 bg-card min-h-0">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
              <p className="text-muted text-xs">טוען...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center mx-auto mb-2 border border-border">
                <Calendar className="h-6 w-6 text-muted" />
              </div>
              <p className="text-foreground text-sm font-medium">אין היסטוריה</p>
              <p className="text-muted text-xs mt-1">אימון ראשון</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 5).map((workout, index) => {
                const bestSet = getBestSet(workout.sets);
                const totalVolume = getTotalVolume(workout.sets);
                const isLatest = index === 0;

                return (
                  <div
                    key={workout.workout_id}
                    className={`bg-surface rounded-lg p-2 border transition-all ${
                      isLatest ? 'border-emerald-500/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                        <div className={`p-1 rounded ${isLatest ? 'bg-emerald-500/20' : 'bg-elevated/50'}`}>
                          <Calendar className={`h-3 w-3 ${isLatest ? 'text-emerald-400' : 'text-muted'}`} />
                        </div>
                        <span className="font-semibold text-foreground text-xs">
                          {new Date(workout.workout_date).toLocaleDateString('he-IL', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        {isLatest && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                            אחרון
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs">
                        {onLoadData && (
                          <button
                            onClick={() => {
                              onLoadData(workout.sets);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 rounded-lg text-purple-400 transition-all text-[10px] font-medium"
                            title="טען"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                        <div className="flex items-center space-x-1 rtl:space-x-reverse bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/30">
                          <TrendingUp className="h-3 w-3 text-cyan-400" />
                          <span className="font-semibold text-cyan-400 text-xs">{totalVolume.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {workout.sets.slice(0, 3).map((set) => {
                        const isPR = personalRecords && 
                          (set.weight === personalRecords.maxWeight || 
                           set.weight * set.reps === personalRecords.maxVolume);
                        
                        return (
                          <div
                            key={set.set_number}
                            className={`flex items-center justify-between p-1.5 rounded-lg transition-all text-xs ${
                              bestSet && set.set_number === bestSet.set_number
                                ? 'bg-amber-500/10 border border-amber-500/30'
                                : 'bg-card/50 border border-border/30'
                            }`}
                          >
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <span className="font-semibold text-muted text-[10px]">
                                {set.set_number}
                              </span>
                              {set.set_type !== 'regular' && (
                                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded border border-cyan-500/30">
                                  {set.set_type === 'superset' ? 'ס' : 'ד'}
                                </span>
                              )}
                              {set.failure && (
                                <span className="text-[10px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded border border-red-500/30">🔥</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-[10px]">
                              <span className="font-bold text-foreground">
                                {set.weight}×{set.reps}
                              </span>
                              {set.rpe && (
                                <span className="text-muted bg-surface px-1 py-0.5 rounded border border-border">
                                  {set.rpe}
                                </span>
                              )}
                              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/30">
                                {(set.weight * set.reps).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {workout.sets.length > 3 && (
                        <div className="text-[10px] text-muted text-center pt-1">
                          +{workout.sets.length - 3} עוד
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
