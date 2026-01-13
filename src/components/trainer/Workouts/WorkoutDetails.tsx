import { ArrowRight, Dumbbell, Edit2, Copy, Trash2, TrendingUp, Target, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import ExerciseInstructionsModal from '../../common/ExerciseInstructionsModal';

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
  instructions?: string | null;
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
  const [instructionsExercise, setInstructionsExercise] = useState<{
    name: string;
    instructions: string | null | undefined;
  } | null>(null);

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
          name,
          instructions
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
        name: ex.exercises?.name || 'Exercise',
        instructions: ex.exercises?.instructions || null,
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workout...</p>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Workout not found</p>
        <button onClick={onBack} className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300"
            >
              <ArrowRight className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Workout from {new Date(workout.workout_date).toLocaleDateString('he-IL')}
              </h1>
              <p className="text-emerald-100">{trainee.name}</p>
            </div>
          </div>

          <div className="flex space-x-2 rtl:space-x-reverse">
            <button
              onClick={onDuplicate}
              className="bg-blue-500/20 hover:bg-blue-500/30 text-white px-4 py-2 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 backdrop-blur-sm"
            >
              <Copy className="h-4 w-4" />
              <span>Duplicate</span>
            </button>
            <button
              onClick={onEdit}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 backdrop-blur-sm"
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={onDelete}
              className="bg-red-500/20 hover:bg-red-500/30 text-white px-4 py-2 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 backdrop-blur-sm"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Dumbbell className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{exercises.length}</p>
          <p className="text-sm text-gray-600 font-medium">Exercises</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Target className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">{getTotalSets()}</p>
          <p className="text-sm text-gray-600 font-medium">Sets</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">{getTotalVolume().toLocaleString()}</p>
          <p className="text-sm text-gray-600 font-medium">kg Total Volume</p>
        </div>
      </div>

      {/* Exercise Cards */}
      <div className="space-y-4">
        {exercises.map((exercise, idx) => (
          <div key={exercise.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">{idx + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{exercise.name}</h3>
              </div>
              <button
                onClick={() => setInstructionsExercise({
                  name: exercise.name,
                  instructions: exercise.instructions,
                })}
                className="p-2 hover:bg-cyan-50 text-cyan-600 rounded-xl transition-all"
                aria-label="איך לבצע"
                title="איך לבצע"
              >
                <Info className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 text-sm font-semibold text-gray-500 pb-2 border-b border-gray-100">
                <div>Set</div>
                <div>Weight</div>
                <div>Reps</div>
                <div>RPE</div>
                <div>Equipment</div>
              </div>

              {exercise.sets.map((set) => (
                <div key={set.set_number} className="py-2">
                  <div className="grid grid-cols-5 gap-2 text-sm hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 rounded-xl py-3 px-2 transition-all duration-300">
                    <div className="font-semibold text-gray-900 flex items-center gap-1 flex-wrap">
                      #{set.set_number}
                      {set.set_type === 'superset' && (
                        <span className="text-xs bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 px-2 py-0.5 rounded-lg font-medium">Super</span>
                      )}
                      {set.set_type === 'dropset' && (
                        <span className="text-xs bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 px-2 py-0.5 rounded-lg font-medium">Drop</span>
                      )}
                      {set.failure && (
                        <span className="text-xs bg-gradient-to-r from-red-100 to-red-200 text-red-700 px-2 py-0.5 rounded-lg font-medium">Failure</span>
                      )}
                    </div>
                    <div className="text-gray-900 font-medium">{set.weight} kg</div>
                    <div className="text-gray-900 font-medium">{set.reps} reps</div>
                    <div className="text-gray-700">{set.rpe || '-'}</div>
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
                    <div className="mr-8 mt-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl text-sm space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-blue-900">Superset: {set.superset_exercise_name}</span>
                        </div>
                        <div className="text-blue-700 font-medium">
                          {set.superset_weight || 0} kg x {set.superset_reps || 0} reps
                          {set.superset_rpe && (
                            <span className="mr-2">| RPE: {set.superset_rpe}</span>
                          )}
                        </div>
                      </div>
                      {set.superset_equipment && (
                        <div className="flex items-center space-x-1 rtl:space-x-reverse text-xs text-blue-700">
                          <span>{set.superset_equipment.emoji}</span>
                          <span>Equipment: {set.superset_equipment.name}</span>
                        </div>
                      )}
                      {set.superset_dropset_weight && (
                        <div className="pt-2 border-t border-blue-300">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-amber-700">Dropset:</span>
                            <span className="text-amber-700 font-medium">
                              {set.superset_dropset_weight} kg x {set.superset_dropset_reps || 0} reps
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {set.set_type === 'dropset' && set.dropset_weight && (
                    <div className="mr-8 mt-2 p-3 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl text-sm shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-900">Dropset</span>
                        <div className="text-amber-700 font-medium">
                          {set.dropset_weight || 0} kg x {set.dropset_reps || 0} reps
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-3 border-t border-gray-100 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Exercise Volume:</span>
                  <span className="font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
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
                    }, 0).toLocaleString()} kg
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {instructionsExercise && (
        <ExerciseInstructionsModal
          isOpen={!!instructionsExercise}
          onClose={() => setInstructionsExercise(null)}
          exerciseName={instructionsExercise.name}
          instructions={instructionsExercise.instructions}
        />
      )}
    </div>
  );
}
