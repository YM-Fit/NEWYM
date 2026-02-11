import { X, Dumbbell, Calendar, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';

interface WorkoutHistorySet {
  weight: number;
  reps: number;
  set_number: number;
}

interface WorkoutHistoryEntry {
  workout_id: string;
  workout_date: string;
  sets: WorkoutHistorySet[];
}

interface ExerciseHistoryGroup {
  exerciseId: string;
  exerciseName: string;
  history: WorkoutHistoryEntry[];
}

interface WorkoutHistoryModalProps {
  traineeId: string;
  exercises: {
    exercise: {
      id: string;
      name: string;
    };
  }[];
  onClose: () => void;
}

export default function WorkoutHistoryModal({ traineeId, exercises, onClose }: WorkoutHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ExerciseHistoryGroup[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const exerciseIds = Array.from(new Set(exercises.map((ex) => ex.exercise.id)));
        if (exerciseIds.length === 0) {
          setGroups([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('workout_exercises')
          .select(
            `
            exercise_id,
            exercises (id, name),
            exercise_sets (weight, reps, set_number),
            workouts!inner (id, workout_date, is_completed)
          `
          )
          .eq('trainee_id', traineeId)
          .in('exercise_id', exerciseIds)
          .eq('workouts.is_completed', true)
          .order('workouts(workout_date)', { ascending: false })
          .limit(80);

        if (error) {
          logger.error('Error loading workout history modal', error, 'WorkoutHistoryModal');
          setLoading(false);
          return;
        }

        const byExercise = new Map<string, ExerciseHistoryGroup>();

        (data || []).forEach((row: any) => {
          const exId = row.exercise_id;
          const exName = row.exercises?.name || '';
          if (!byExercise.has(exId)) {
            byExercise.set(exId, {
              exerciseId: exId,
              exerciseName: exName,
              history: [],
            });
          }

          const group = byExercise.get(exId)!;
          const sets = (row.exercise_sets || []).sort(
            (a: any, b: any) => a.set_number - b.set_number
          );

          group.history.push({
            workout_id: row.workouts.id,
            workout_date: row.workouts.workout_date,
            sets,
          });
        });

        const result = Array.from(byExercise.values()).map((g) => ({
          ...g,
          history: g.history.slice(0, 3),
        }));

        setGroups(result);
      } catch (err) {
        logger.error('Unexpected error loading workout history modal', err, 'WorkoutHistoryModal');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [traineeId, exercises]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('he-IL');
  };

  const calculateVolume = (sets: WorkoutHistorySet[]) =>
    sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-500/15">
              <Dumbbell className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">היסטוריית אימון</h2>
              <p className="text-xs text-muted">
                הצגת האימונים האחרונים לכל התרגילים באימון הנוכחי
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-elevated/60 transition-all"
          >
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 text-muted">
              אין היסטוריית אימונים קודמת לתרגילים באימון זה.
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.exerciseId}
                className="border border-border rounded-xl bg-surface/40 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-primary-400" />
                    <h3 className="font-semibold text-foreground">{group.exerciseName}</h3>
                  </div>
                  <span className="text-xs text-muted">
                    {group.history.length} אימונים אחרונים
                  </span>
                </div>

                <div className="space-y-2">
                  {group.history.map((entry) => (
                    <div
                      key={entry.workout_id}
                      className="rounded-lg bg-elevated/40 border border-border px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(entry.workout_date)}</span>
                      </div>
                      <div className="flex-1 text-xs text-muted flex flex-wrap gap-2 justify-end">
                        {entry.sets.length === 0 ? (
                          <span>אין סטים שמורים</span>
                        ) : (
                          <>
                            <span>
                              {entry.sets
                                .map(
                                  (s) =>
                                    `${s.weight || 0}×${s.reps || 0}${
                                      s.set_number ? ` (סט ${s.set_number})` : ''
                                    }`
                                )
                                .join(' • ')}
                            </span>
                            <span className="flex items-center gap-1 text-primary-400 font-semibold">
                              <TrendingUp className="h-3 w-3" />
                              {calculateVolume(entry.sets).toLocaleString()} ק״ג
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

