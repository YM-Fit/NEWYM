import { ArrowRight, Dumbbell, Edit2, Copy, Trash2, TrendingUp, Target, Info, Calendar, Clock } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import toast from 'react-hot-toast';
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
  const [error, setError] = useState<string | null>(null);
  const [instructionsExercise, setInstructionsExercise] = useState<{
    name: string;
    instructions: string | null | undefined;
  } | null>(null);

  useEffect(() => {
    if (workoutId) {
      loadWorkoutDetails();
    }
  }, [workoutId]);

  const loadWorkoutDetails = useCallback(async () => {
    if (!workoutId) return;
    
    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', workoutId)
      .single();
    
    if (workoutError) {
      logger.error('Error loading workout', workoutError, 'WorkoutDetails');
      setError('שגיאה בטעינת האימון');
      toast.error('שגיאה בטעינת האימון');
      setLoading(false);
      return;
    }

    if (workoutData) {
      setWorkout(workoutData);
    }

    const { data: exercisesData, error: exercisesError } = await supabase
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
    
    if (exercisesError) {
      logger.error('Error loading workout exercises', exercisesError, 'WorkoutDetails');
      setError('שגיאה בטעינת התרגילים');
      toast.error('שגיאה בטעינת התרגילים');
      setLoading(false);
      return;
    }

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
    setError(null);
  }, [workoutId]);

  const getTotalVolume = useMemo(() => {
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
  }, [exercises]);

  const getTotalSets = useMemo(() => {
    return exercises.reduce((total, ex) => total + ex.sets.length, 0);
  }, [exercises]);

  const handleInstructionsClick = useCallback((exercise: ExerciseWithSets) => {
    setInstructionsExercise({
      name: exercise.name,
      instructions: exercise.instructions,
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-muted">טוען אימון...</p>
        </div>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="text-center py-12 premium-card-static">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/15 flex items-center justify-center">
          <Trash2 className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {error || 'האימון לא נמצא'}
        </h3>
        <p className="text-muted mb-6">
          {error || 'האימון שביקשת לא קיים או נמחק'}
        </p>
        <button 
          onClick={onBack} 
          className="btn-primary px-6 py-3 rounded-xl font-medium"
        >
          חזור
        </button>
      </div>
    );
  }

  const workoutDate = useMemo(() => {
    return new Date(workout.workout_date);
  }, [workout.workout_date]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Premium Header */}
      <div className="premium-card-static p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <button
              onClick={onBack}
              className="p-2 sm:p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex-shrink-0"
              aria-label="חזור"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-emerald-100" />
                <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">אימון</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                {workoutDate.toLocaleDateString('he-IL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h1>
              <p className="text-emerald-100 text-sm sm:text-base">{trainee.name || trainee.full_name}</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onDuplicate}
              className="bg-blue-500/20 hover:bg-blue-500/30 text-white px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 transition-all backdrop-blur-sm text-sm sm:text-base"
              title="שכפל אימון"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">שכפל</span>
            </button>
            <button
              onClick={onEdit}
              className="bg-white/20 hover:bg-white/30 text-white px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 transition-all backdrop-blur-sm text-sm sm:text-base"
              title="ערוך אימון"
            >
              <Edit2 className="h-4 w-4" />
              <span className="hidden sm:inline">ערוך</span>
            </button>
            <button
              onClick={onDelete}
              className="bg-red-500/20 hover:bg-red-500/30 text-white px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 transition-all backdrop-blur-sm text-sm sm:text-base"
              title="מחק אימון"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">מחק</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="premium-card-static p-4 sm:p-6 text-center hover:shadow-lg transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500/15 to-emerald-600/15 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-400">{exercises.length}</p>
          <p className="text-xs sm:text-sm text-muted font-medium">תרגילים</p>
        </div>
        <div className="premium-card-static p-4 sm:p-6 text-center hover:shadow-lg transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500/15 to-blue-600/15 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-400">{getTotalSets}</p>
          <p className="text-xs sm:text-sm text-muted font-medium">סטים</p>
        </div>
        <div className="premium-card-static p-4 sm:p-6 text-center hover:shadow-lg transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500/15 to-amber-600/15 rounded-xl flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-400">{getTotalVolume.toLocaleString()}</p>
          <p className="text-xs sm:text-sm text-muted font-medium">ק״ג נפח כולל</p>
        </div>
      </div>

      {/* Exercise Cards */}
      <div className="space-y-4">
        {exercises.map((exercise, idx) => (
          <div key={exercise.id} className="premium-card-static p-4 sm:p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">{idx + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-muted900">{exercise.name}</h3>
              </div>
              <button
                onClick={() => handleInstructionsClick(exercise)}
                className="p-2 hover:bg-blue-500/15 text-blue-400 rounded-xl transition-all"
                aria-label="איך לבצע"
                title="איך לבצע"
              >
                <Info className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 text-xs sm:text-sm font-semibold text-muted pb-2 border-b border-border">
                <div>סט</div>
                <div>משקל</div>
                <div>חזרות</div>
                <div>RPE</div>
                <div>ציוד</div>
              </div>

              {exercise.sets.map((set) => (
                <div key={set.set_number} className="py-2">
                  <div className="grid grid-cols-5 gap-2 text-xs sm:text-sm hover:bg-surface/50 rounded-xl py-2 sm:py-3 px-2 transition-all">
                    <div className="font-semibold text-foreground flex items-center gap-1 flex-wrap">
                      #{set.set_number}
                      {set.set_type === 'superset' && (
                        <span className="text-[10px] sm:text-xs bg-blue-500/15 text-blue-400 px-1.5 sm:px-2 py-0.5 rounded-lg font-medium border border-blue-500/30">סופר</span>
                      )}
                      {set.set_type === 'dropset' && (
                        <span className="text-[10px] sm:text-xs bg-amber-500/15 text-amber-400 px-1.5 sm:px-2 py-0.5 rounded-lg font-medium border border-amber-500/30">דרופ</span>
                      )}
                      {set.failure && (
                        <span className="text-[10px] sm:text-xs bg-red-500/15 text-red-400 px-1.5 sm:px-2 py-0.5 rounded-lg font-medium border border-red-500/30">כשל</span>
                      )}
                    </div>
                    <div className="text-foreground font-medium">{set.weight} ק״ג</div>
                    <div className="text-foreground font-medium">{set.reps}</div>
                    <div className="text-muted">{set.rpe || '-'}</div>
                    <div className="flex items-center gap-1">
                      {set.equipment ? (
                        <>
                          <span className="text-sm">{set.equipment.emoji}</span>
                          <span className="text-muted text-xs truncate">{set.equipment.name}</span>
                        </>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </div>
                  </div>

                  {set.set_type === 'superset' && set.superset_exercise_name && (
                    <div className="mr-4 sm:mr-8 mt-2 p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs sm:text-sm space-y-2">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-blue-400">סופר-סט: {set.superset_exercise_name}</span>
                        </div>
                        <div className="text-blue-300 font-medium">
                          {set.superset_weight || 0} ק״ג × {set.superset_reps || 0}
                          {set.superset_rpe && (
                            <span className="mr-2">| RPE: {set.superset_rpe}</span>
                          )}
                        </div>
                      </div>
                      {set.superset_equipment && (
                        <div className="flex items-center gap-1 text-xs text-blue-300">
                          <span>{set.superset_equipment.emoji}</span>
                          <span>ציוד: {set.superset_equipment.name}</span>
                        </div>
                      )}
                      {set.superset_dropset_weight && (
                        <div className="pt-2 border-t border-blue-500/30">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-amber-400">דרופ-סט:</span>
                            <span className="text-amber-300 font-medium">
                              {set.superset_dropset_weight} ק״ג × {set.superset_dropset_reps || 0}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {set.set_type === 'dropset' && set.dropset_weight && (
                    <div className="mr-4 sm:mr-8 mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs sm:text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-400">דרופ-סט</span>
                        <div className="text-amber-300 font-medium">
                          {set.dropset_weight || 0} ק״ג × {set.dropset_reps || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-3 border-t border-border mt-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted">נפח תרגיל:</span>
                  <span className="font-bold text-emerald-400">
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
