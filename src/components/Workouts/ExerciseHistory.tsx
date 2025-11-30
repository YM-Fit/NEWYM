import { X, Calendar, TrendingUp, Dumbbell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Dumbbell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{exerciseName}</h2>
                <p className="text-sm text-gray-600">{traineeName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">טוען היסטוריה...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">אין היסטוריה לתרגיל זה</p>
              <p className="text-gray-500 text-sm mt-2">זה יהיה האימון הראשון!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((workout) => {
                const bestSet = getBestSet(workout.sets);
                const totalVolume = getTotalVolume(workout.sets);

                return (
                  <div key={workout.workout_id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold text-gray-900">
                          {new Date(workout.workout_date).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse text-sm">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse text-blue-600">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-medium">{totalVolume.toLocaleString()} ק"ג</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {workout.sets.map((set) => (
                        <div
                          key={set.set_number}
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            bestSet && set.set_number === bestSet.set_number
                              ? 'bg-yellow-50 border border-yellow-200'
                              : 'bg-white border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <span className="text-sm font-medium text-gray-700 min-w-[60px]">
                              סט #{set.set_number}
                            </span>
                            {set.set_type === 'superset' && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">סופר</span>
                            )}
                            {set.set_type === 'dropset' && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">דרופ</span>
                            )}
                            {set.failure && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">🔥</span>
                            )}
                            {bestSet && set.set_number === bestSet.set_number && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">⭐ הכי טוב</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm">
                            <span className="font-semibold text-gray-900">
                              {set.weight} ק"ג × {set.reps}
                            </span>
                            {set.rpe && (
                              <span className="text-gray-600">
                                RPE: {set.rpe}
                              </span>
                            )}
                            <span className="text-gray-500 min-w-[60px] text-left">
                              {(set.weight * set.reps).toLocaleString()} ק"ג
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between text-sm">
                      <span className="text-gray-600">{workout.sets.length} סטים</span>
                      <span className="text-gray-600">נפח כולל: {totalVolume.toLocaleString()} ק"ג</span>
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
