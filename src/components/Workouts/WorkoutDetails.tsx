import { ArrowRight, Dumbbell, Edit2, Copy, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface WorkoutDetailsProps {
  workoutId: string;
  trainee: any;
  onBack: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

interface Equipment {
  id: string;
  name: string;
  emoji: string | null;
}

interface ExerciseWithSets {
  id: string;
  name: string;
  sets: Array<{
    set_number: number;
    weight: number;
    reps: number;
    rpe?: number;
    set_type: string;
    failure?: boolean;
    equipment?: Equipment | null;
    superset_exercise_id?: string;
    superset_exercise_name?: string;
    superset_weight?: number;
    superset_reps?: number;
    superset_rpe?: number;
    superset_equipment?: Equipment | null;
    superset_dropset_weight?: number;
    superset_dropset_reps?: number;
    dropset_weight?: number;
    dropset_reps?: number;
  }>;
}

export default function WorkoutDetails({
  workoutId,
  trainee,
  onBack,
  onEdit,
  onDuplicate,
  onDelete
}: WorkoutDetailsProps) {
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkoutDetails();
  }, [workoutId]);

  const loadWorkoutDetails = async () => {
    const { data: workoutData } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', workoutId)
      .single();

    if (workoutData) {
      setWorkout(workoutData);
    }

    const { data: exercisesData } = await supabase
      .from('workout_exercises')
      .select(`
        id,
        exercise_id,
        exercises (
          name
        ),
        exercise_sets (
          set_number,
          weight,
          reps,
          rpe,
          set_type,
          failure,
          superset_exercise_id,
          superset_weight,
          superset_reps,
          superset_rpe,
          superset_equipment_id,
          superset_dropset_weight,
          superset_dropset_reps,
          dropset_weight,
          dropset_reps,
          equipment_id,
          equipment:equipment_id (
            id,
            name,
            emoji
          ),
          superset_equipment:superset_equipment_id (
            id,
            name,
            emoji
          )
        )
      `)
      .eq('workout_id', workoutId)
      .order('order_index', { ascending: true });

    if (exercisesData) {
      const allExerciseIds = new Set<string>();
      exercisesData.forEach(ex => {
        (ex.exercise_sets || []).forEach(set => {
          if (set.superset_exercise_id) {
            allExerciseIds.add(set.superset_exercise_id);
          }
        });
      });

      let supersetExercisesMap: Record<string, string> = {};
      if (allExerciseIds.size > 0) {
        const { data: supersetExercises } = await supabase
          .from('exercises')
          .select('id, name')
          .in('id', Array.from(allExerciseIds));

        if (supersetExercises) {
          supersetExercises.forEach(ex => {
            supersetExercisesMap[ex.id] = ex.name;
          });
        }
      }

      const formatted = exercisesData.map(ex => ({
        id: ex.id,
        name: ex.exercises?.name || 'תרגיל',
        sets: (ex.exercise_sets || []).map(set => ({
          ...set,
          superset_exercise_name: set.superset_exercise_id ? supersetExercisesMap[set.superset_exercise_id] : undefined,
          superset_equipment: set.superset_equipment || null
        })).sort((a, b) => a.set_number - b.set_number)
      }));
      setExercises(formatted);
    }

    setLoading(false);
  };

  const getTotalVolume = () => {
    return exercises.reduce((total, ex) => {
      return total + ex.sets.reduce((sum, set) => {
        let setVolume = set.weight * set.reps;

        // Add superset volume
        if (set.superset_weight && set.superset_reps) {
          setVolume += set.superset_weight * set.superset_reps;
        }

        // Add dropset volume
        if (set.dropset_weight && set.dropset_reps) {
          setVolume += set.dropset_weight * set.dropset_reps;
        }

        // Add superset dropset volume
        if (set.superset_dropset_weight && set.superset_dropset_reps) {
          setVolume += set.superset_dropset_weight * set.superset_dropset_reps;
        }

        return sum + setVolume;
      }, 0);
    }, 0);
  };

  const getTotalSets = () => {
    return exercises.reduce((total, ex) => total + ex.sets.length, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען אימון...</p>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">אימון לא נמצא</p>
        <button onClick={onBack} className="mt-4 text-green-600 hover:text-green-700">
          חזור
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              אימון מ-{new Date(workout.workout_date).toLocaleDateString('he-IL')}
            </h1>
            <p className="text-gray-600">{trainee.name}</p>
          </div>
        </div>

        <div className="flex space-x-2 rtl:space-x-reverse">
          <button
            onClick={onDuplicate}
            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors"
          >
            <Copy className="h-4 w-4" />
            <span>שכפל</span>
          </button>
          <button
            onClick={onEdit}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            <span>ערוך</span>
          </button>
          <button
            onClick={onDelete}
            className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>מחק</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <Dumbbell className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{exercises.length}</p>
          <p className="text-sm text-gray-600">תרגילים</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">💪</div>
          <p className="text-2xl font-bold text-gray-900">{getTotalSets()}</p>
          <p className="text-sm text-gray-600">סטים</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">⚡</div>
          <p className="text-2xl font-bold text-gray-900">{getTotalVolume().toLocaleString()}</p>
          <p className="text-sm text-gray-600">ק״ג נפח כולל</p>
        </div>
      </div>

      <div className="space-y-4">
        {exercises.map((exercise, idx) => (
          <div key={exercise.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
              <div className="bg-green-50 w-8 h-8 rounded-lg flex items-center justify-center">
                <span className="text-green-700 font-semibold text-sm">{idx + 1}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{exercise.name}</h3>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 text-sm font-medium text-gray-600 pb-2 border-b">
                <div>סט</div>
                <div>משקל</div>
                <div>חזרות</div>
                <div>RPE</div>
                <div>ציוד</div>
              </div>

              {exercise.sets.map((set) => (
                <div key={set.set_number} className="py-2">
                  <div className="grid grid-cols-5 gap-2 text-sm hover:bg-gray-50 rounded py-2">
                    <div className="font-medium text-gray-900">
                      #{set.set_number}
                      {set.set_type === 'superset' && (
                        <span className="mr-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">סופר</span>
                      )}
                      {set.set_type === 'dropset' && (
                        <span className="mr-1 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">דרופ</span>
                      )}
                      {set.failure && (
                        <span className="mr-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">🔥</span>
                      )}
                    </div>
                    <div className="text-gray-900">{set.weight} ק״ג</div>
                    <div className="text-gray-900">{set.reps} חזרות</div>
                    <div className="text-gray-900">{set.rpe || '-'}</div>
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      {set.equipment ? (
                        <>
                          <span>{set.equipment.emoji}</span>
                          <span className="text-gray-700">{set.equipment.name}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </div>

                  {set.set_type === 'superset' && set.superset_exercise_name && (
                    <div className="mr-8 mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-blue-900">→ {set.superset_exercise_name}</span>
                        </div>
                        <div className="text-blue-700">
                          {set.superset_weight || 0} ק״ג × {set.superset_reps || 0} חזרות
                          {set.superset_rpe && (
                            <span className="mr-2">| RPE: {set.superset_rpe}</span>
                          )}
                        </div>
                      </div>
                      {set.superset_equipment && (
                        <div className="flex items-center space-x-1 rtl:space-x-reverse text-xs text-blue-700">
                          <span>{set.superset_equipment.emoji}</span>
                          <span>ציוד: {set.superset_equipment.name}</span>
                        </div>
                      )}
                      {set.superset_dropset_weight && (
                        <div className="pt-2 border-t border-blue-300">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-orange-700">דרופ-סט:</span>
                            <span className="text-orange-700">
                              {set.superset_dropset_weight} ק״ג × {set.superset_dropset_reps || 0} חזרות
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {set.set_type === 'dropset' && set.dropset_weight && (
                    <div className="mr-8 mt-1 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-orange-900">דרופ-סט</span>
                        <div className="text-orange-700">
                          {set.dropset_weight || 0} ק״ג × {set.dropset_reps || 0} חזרות
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-2 border-t mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">נפח תרגיל:</span>
                  <span className="font-semibold text-gray-900">
                    {exercise.sets.reduce((sum, set) => {
                      let setVolume = set.weight * set.reps;

                      if (set.superset_weight && set.superset_reps) {
                        setVolume += set.superset_weight * set.superset_reps;
                      }

                      if (set.dropset_weight && set.dropset_reps) {
                        setVolume += set.dropset_weight * set.dropset_reps;
                      }

                      if (set.superset_dropset_weight && set.superset_dropset_reps) {
                        setVolume += set.superset_dropset_weight * set.superset_dropset_reps;
                      }

                      return sum + setVolume;
                    }, 0).toLocaleString()} ק״ג
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
