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
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <Dumbbell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-white">{exerciseName}</h2>
                <p className="text-sm text-emerald-100">{traineeName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>

        {/* Personal Records */}
        {personalRecords && (
          <div className="p-4 bg-gradient-to-b from-amber-500/10 to-transparent border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-amber-400" />
              <h3 className="font-semibold text-amber-400 text-sm">שיאים אישיים</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-amber-500/20 text-center">
                <div className="text-xl lg:text-2xl font-bold text-white">{personalRecords.maxWeight}</div>
                <div className="text-xs text-zinc-400">ק״ג מקס</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-cyan-500/20 text-center">
                <div className="text-xl lg:text-2xl font-bold text-white">{personalRecords.maxReps}</div>
                <div className="text-xs text-zinc-400">חזרות מקס</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-emerald-500/20 text-center">
                <div className="text-xl lg:text-2xl font-bold text-white">{personalRecords.maxVolume.toLocaleString()}</div>
                <div className="text-xs text-zinc-400">נפח סט מקס</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-zinc-900">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-zinc-400">טוען היסטוריה...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                <Calendar className="h-10 w-10 text-zinc-500" />
              </div>
              <p className="text-white text-lg font-medium">אין היסטוריה לתרגיל זה</p>
              <p className="text-zinc-500 text-sm mt-2">זה יהיה האימון הראשון!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((workout, index) => {
                const bestSet = getBestSet(workout.sets);
                const totalVolume = getTotalVolume(workout.sets);
                const isLatest = index === 0;

                return (
                  <div
                    key={workout.workout_id}
                    className={`bg-zinc-800/50 rounded-2xl p-4 border transition-all ${
                      isLatest ? 'border-emerald-500/30' : 'border-zinc-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className={`p-1.5 rounded-lg ${isLatest ? 'bg-emerald-500/20' : 'bg-zinc-700/50'}`}>
                          <Calendar className={`h-4 w-4 ${isLatest ? 'text-emerald-400' : 'text-zinc-400'}`} />
                        </div>
                        <span className="font-semibold text-white">
                          {new Date(workout.workout_date).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        {isLatest && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                            אחרון
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm">
                        {/* Load data button */}
                        {onLoadData && (
                          <button
                            onClick={() => {
                              onLoadData(workout.sets);
                              onClose();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 rounded-xl text-purple-400 transition-all btn-press-feedback text-xs font-medium"
                            title="טען נתונים לתרגיל הנוכחי"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span>טען</span>
                          </button>
                        )}
                        <div className="flex items-center space-x-1 rtl:space-x-reverse bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                          <TrendingUp className="h-4 w-4 text-cyan-400" />
                          <span className="font-semibold text-cyan-400">{totalVolume.toLocaleString()} ק״ג</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {workout.sets.map((set) => {
                        const isPR = personalRecords && 
                          (set.weight === personalRecords.maxWeight || 
                           set.weight * set.reps === personalRecords.maxVolume);
                        
                        return (
                          <div
                            key={set.set_number}
                            className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                              bestSet && set.set_number === bestSet.set_number
                                ? 'bg-amber-500/10 border border-amber-500/30'
                                : 'bg-zinc-900/50 border border-zinc-700/30 hover:bg-zinc-800/50'
                            }`}
                          >
                            <div className="flex items-center space-x-2 rtl:space-x-reverse flex-wrap gap-1">
                              <span className="text-sm font-semibold text-zinc-400 min-w-[50px]">
                                סט {set.set_number}
                              </span>
                              {set.set_type === 'superset' && (
                                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-lg font-medium border border-cyan-500/30">סופר</span>
                              )}
                              {set.set_type === 'dropset' && (
                                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-lg font-medium border border-amber-500/30">דרופ</span>
                              )}
                              {set.failure && (
                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-lg font-medium border border-red-500/30">כשל</span>
                              )}
                              {isPR && (
                                <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-lg font-medium flex items-center gap-1">
                                  <Trophy className="h-3 w-3" /> PR
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 rtl:space-x-reverse text-sm">
                              <span className="font-bold text-white">
                                {set.weight} ק״ג × {set.reps}
                              </span>
                              {set.rpe && (
                                <span className="text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-700/50 text-xs">
                                  RPE {set.rpe}
                                </span>
                              )}
                              <span className="text-emerald-400 font-semibold min-w-[60px] text-left bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30 text-xs">
                                {(set.weight * set.reps).toLocaleString()} ק״ג
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-700/50 flex justify-between text-sm">
                      <span className="text-zinc-400 font-medium">{workout.sets.length} סטים</span>
                      <span className="text-emerald-400 font-semibold">נפח כולל: {totalVolume.toLocaleString()} ק״ג</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
