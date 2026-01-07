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
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl transition-all duration-300">
        {/* Premium Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 lg:p-6">
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
              className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gradient-to-b from-gray-50 to-white">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Calendar className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-700 text-lg font-medium">No history for this exercise</p>
              <p className="text-gray-500 text-sm mt-2">This will be the first workout!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((workout) => {
                const bestSet = getBestSet(workout.sets);
                const totalVolume = getTotalVolume(workout.sets);

                return (
                  <div
                    key={workout.workout_id}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                          <Calendar className="h-4 w-4 text-emerald-600" />
                        </div>
                        <span className="font-semibold text-gray-900">
                          {new Date(workout.workout_date).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse text-sm">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse bg-blue-50 px-3 py-1.5 rounded-xl">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-blue-700">{totalVolume.toLocaleString()} kg</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {workout.sets.map((set) => (
                        <div
                          key={set.set_number}
                          className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${
                            bestSet && set.set_number === bestSet.set_number
                              ? 'bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 shadow-md'
                              : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <span className="text-sm font-semibold text-gray-700 min-w-[60px]">
                              Set #{set.set_number}
                            </span>
                            {set.set_type === 'superset' && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium">Super</span>
                            )}
                            {set.set_type === 'dropset' && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-medium">Drop</span>
                            )}
                            {set.failure && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg font-medium">Failure</span>
                            )}
                            {bestSet && set.set_number === bestSet.set_number && (
                              <span className="text-xs bg-gradient-to-r from-amber-400 to-amber-500 text-white px-2 py-1 rounded-lg font-medium shadow-sm">Best</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm">
                            <span className="font-bold text-gray-900">
                              {set.weight} kg x {set.reps}
                            </span>
                            {set.rpe && (
                              <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                RPE: {set.rpe}
                              </span>
                            )}
                            <span className="text-emerald-600 font-semibold min-w-[70px] text-left bg-emerald-50 px-2 py-1 rounded-lg">
                              {(set.weight * set.reps).toLocaleString()} kg
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">{workout.sets.length} sets</span>
                      <span className="text-emerald-600 font-semibold">Total volume: {totalVolume.toLocaleString()} kg</span>
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
