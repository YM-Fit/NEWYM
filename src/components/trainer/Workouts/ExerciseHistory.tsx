import { X, Calendar, TrendingUp, Dumbbell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

interface ExerciseHistoryProps {
  traineeId: string;
  traineeName: string;
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
}

interface HistorySet {
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number;
  failure?: boolean;
  set_type: string;
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
  onClose
}: ExerciseHistoryProps) {
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [traineeId, exerciseId]);

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
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="bg-emerald-500 p-4 lg:p-6">
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

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-zinc-900">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-zinc-400">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                <Calendar className="h-10 w-10 text-zinc-500" />
              </div>
              <p className="text-white text-lg font-medium">No history for this exercise</p>
              <p className="text-zinc-500 text-sm mt-2">This will be the first workout!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((workout) => {
                const bestSet = getBestSet(workout.sets);
                const totalVolume = getTotalVolume(workout.sets);

                return (
                  <div
                    key={workout.workout_id}
                    className="bg-zinc-800/50 rounded-2xl p-4 border border-zinc-700/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                          <Calendar className="h-4 w-4 text-emerald-400" />
                        </div>
                        <span className="font-semibold text-white">
                          {new Date(workout.workout_date).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse text-sm">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                          <TrendingUp className="h-4 w-4 text-cyan-400" />
                          <span className="font-semibold text-cyan-400">{totalVolume.toLocaleString()} kg</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {workout.sets.map((set) => (
                        <div
                          key={set.set_number}
                          className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                            bestSet && set.set_number === bestSet.set_number
                              ? 'bg-amber-500/10 border border-amber-500/30'
                              : 'bg-zinc-900/50 border border-zinc-700/30 hover:bg-zinc-800/50'
                          }`}
                        >
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <span className="text-sm font-semibold text-zinc-400 min-w-[60px]">
                              Set #{set.set_number}
                            </span>
                            {set.set_type === 'superset' && (
                              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-lg font-medium border border-cyan-500/30">Super</span>
                            )}
                            {set.set_type === 'dropset' && (
                              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg font-medium border border-amber-500/30">Drop</span>
                            )}
                            {set.failure && (
                              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg font-medium border border-red-500/30">Failure</span>
                            )}
                            {bestSet && set.set_number === bestSet.set_number && (
                              <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-lg font-medium">Best</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm">
                            <span className="font-bold text-white">
                              {set.weight} kg x {set.reps}
                            </span>
                            {set.rpe && (
                              <span className="text-zinc-400 bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700/50">
                                RPE: {set.rpe}
                              </span>
                            )}
                            <span className="text-emerald-400 font-semibold min-w-[70px] text-left bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30">
                              {(set.weight * set.reps).toLocaleString()} kg
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-700/50 flex justify-between text-sm">
                      <span className="text-zinc-400 font-medium">{workout.sets.length} sets</span>
                      <span className="text-emerald-400 font-semibold">Total volume: {totalVolume.toLocaleString()} kg</span>
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
