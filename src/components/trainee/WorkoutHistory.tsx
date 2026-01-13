import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
  Dumbbell,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Activity,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
} from 'lucide-react';
import SelfWorkoutSession from './SelfWorkoutSession';
import { LoadingSpinner, Skeleton, SkeletonWorkoutCard } from '../ui';
import { EmptyState } from '../common/EmptyState';
import { useDebounce } from '../../hooks/useDebounce';

interface WorkoutHistoryProps {
  traineeId: string | null;
  traineeName?: string;
  trainerId?: string;
}

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  exercises: {
    id: string;
    name: string;
    muscle_group_id: string;
    muscle_groups?: {
      name: string;
    };
  };
  exercise_sets: ExerciseSet[];
}

interface ExerciseSet {
  id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  failure: boolean;
  set_type: string;
  equipment_id: string | null;
  superset_weight: number | null;
  superset_reps: number | null;
  superset_equipment_id: string | null;
  superset_rpe: number | null;
  dropset_weight: number | null;
  dropset_reps: number | null;
  equipment?: {
    id: string;
    name: string;
    emoji: string | null;
  };
  superset_equipment?: {
    id: string;
    name: string;
    emoji: string | null;
  };
}

interface Workout {
  id: string;
  workout_date: string;
  is_completed: boolean;
  notes: string | null;
  workout_exercises: WorkoutExercise[];
}

interface MuscleGroup {
  id: string;
  name: string;
}

export default function WorkoutHistory({ traineeId, traineeName, trainerId }: WorkoutHistoryProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [previousExerciseData, setPreviousExerciseData] = useState<Map<string, { weight: number; reps: number }>>(new Map());
  const [showSelfWorkout, setShowSelfWorkout] = useState(false);

  useEffect(() => {
    if (traineeId) {
      loadWorkouts();
      loadMuscleGroups();
    }
  }, [traineeId]);

  const loadWorkouts = async () => {
    if (!traineeId) return;
    setLoading(true);

    const { data } = await supabase
      .from('workout_trainees')
      .select(`
        workouts!inner (
          id,
          workout_date,
          is_completed,
          notes,
          workout_exercises (
            id,
            exercise_id,
            order_index,
            exercises (
              id,
              name,
              muscle_group_id,
              muscle_groups (name)
            ),
            exercise_sets (
              id,
              set_number,
              weight,
              reps,
              rpe,
              failure,
              set_type,
              equipment_id,
              superset_weight,
              superset_reps,
              superset_equipment_id,
              superset_rpe,
              dropset_weight,
              dropset_reps,
              equipment:equipment_id(id, name, emoji),
              superset_equipment:superset_equipment_id(id, name, emoji)
            )
          )
        )
      `)
      .eq('trainee_id', traineeId)
      .order('workouts(workout_date)', { ascending: false });

    if (data) {
      const formattedWorkouts = data
        .map((w: any) => w.workouts)
        .filter((w: Workout) => w !== null);
      setWorkouts(formattedWorkouts);
      buildPreviousExerciseData(formattedWorkouts);
    }
    setLoading(false);
  };

  const loadMuscleGroups = async () => {
    const { data } = await supabase
      .from('muscle_groups')
      .select('id, name')
      .order('name');

    if (data) {
      setMuscleGroups(data);
    }
  };

  const buildPreviousExerciseData = (allWorkouts: Workout[]) => {
    const exerciseHistory = new Map<string, { weight: number; reps: number; date: string }[]>();

    allWorkouts
      .filter((w) => w.is_completed)
      .sort((a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime())
      .forEach((workout) => {
        workout.workout_exercises?.forEach((we) => {
          const exerciseId = we.exercise_id;
          const maxSet = we.exercise_sets?.reduce(
            (max, set) => {
              const volume = (set.weight || 0) * (set.reps || 0);
              const maxVolume = (max.weight || 0) * (max.reps || 0);
              return volume > maxVolume ? set : max;
            },
            { weight: 0, reps: 0 } as ExerciseSet
          );

          if (maxSet && maxSet.weight) {
            if (!exerciseHistory.has(exerciseId)) {
              exerciseHistory.set(exerciseId, []);
            }
            exerciseHistory.get(exerciseId)!.push({
              weight: maxSet.weight,
              reps: maxSet.reps || 0,
              date: workout.workout_date,
            });
          }
        });
      });

    const previousData = new Map<string, { weight: number; reps: number }>();
    exerciseHistory.forEach((history, exerciseId) => {
      if (history.length >= 2) {
        const previous = history[history.length - 2];
        previousData.set(exerciseId, { weight: previous.weight, reps: previous.reps });
      }
    });

    setPreviousExerciseData(previousData);
  };

  const getAvailableMonths = () => {
    const months = new Set<string>();
    workouts.forEach((w) => {
      const date = new Date(w.workout_date);
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  };

  const getFilteredWorkouts = () => {
    return workouts.filter((w) => {
      if (selectedMonth !== 'all') {
        const date = new Date(w.workout_date);
        const workoutMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (workoutMonth !== selectedMonth) return false;
      }

      if (selectedMuscleGroup !== 'all') {
        const hasMuscleGroup = w.workout_exercises?.some(
          (we) => we.exercises?.muscle_group_id === selectedMuscleGroup
        );
        if (!hasMuscleGroup) return false;
      }

      return true;
    });
  };

  const calculateWorkoutVolume = (workout: Workout) => {
    let totalVolume = 0;
    workout.workout_exercises?.forEach((we) => {
      we.exercise_sets?.forEach((set) => {
        totalVolume += (set.weight || 0) * (set.reps || 0);
        if (set.superset_weight && set.superset_reps) {
          totalVolume += set.superset_weight * set.superset_reps;
        }
        if (set.dropset_weight && set.dropset_reps) {
          totalVolume += set.dropset_weight * set.dropset_reps;
        }
      });
    });
    return totalVolume;
  };

  const getMonthlyStats = () => {
    const now = new Date();
    const thisMonth = workouts.filter((w) => {
      const date = new Date(w.workout_date);
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear() &&
        w.is_completed
      );
    });

    const totalWorkouts = thisMonth.length;
    const totalVolume = thisMonth.reduce((sum, w) => sum + calculateWorkoutVolume(w), 0);
    const avgVolume = totalWorkouts > 0 ? Math.round(totalVolume / totalWorkouts) : 0;

    return { totalWorkouts, avgVolume };
  };

  const getLatestPR = () => {
    let latestPR: { exercise: string; weight: number; date: string } | null = null;

    const exerciseMaxes = new Map<string, { weight: number; date: string; name: string }>();

    workouts
      .filter((w) => w.is_completed)
      .sort((a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime())
      .forEach((workout) => {
        workout.workout_exercises?.forEach((we) => {
          const exerciseId = we.exercise_id;
          const exerciseName = we.exercises?.name || '';

          we.exercise_sets?.forEach((set) => {
            const weight = set.weight || 0;
            const currentMax = exerciseMaxes.get(exerciseId);

            if (!currentMax || weight > currentMax.weight) {
              if (currentMax && weight > currentMax.weight) {
                latestPR = {
                  exercise: exerciseName,
                  weight: weight,
                  date: workout.workout_date,
                };
              }
              exerciseMaxes.set(exerciseId, {
                weight,
                date: workout.workout_date,
                name: exerciseName,
              });
            }
          });
        });
      });

    return latestPR;
  };

  const getExerciseComparison = (exerciseId: string, currentWeight: number, currentReps: number) => {
    const previous = previousExerciseData.get(exerciseId);
    if (!previous) return null;

    const currentVolume = currentWeight * currentReps;
    const previousVolume = previous.weight * previous.reps;

    if (currentVolume > previousVolume) {
      return { direction: 'up' as const, diff: currentWeight - previous.weight };
    } else if (currentVolume < previousVolume) {
      return { direction: 'down' as const, diff: previous.weight - currentWeight };
    }
    return { direction: 'same' as const, diff: 0 };
  };

  const formatMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const stats = useMemo(() => getMonthlyStats(), [workouts]);
  const latestPR = useMemo(() => getLatestPR(), [workouts, previousExerciseData]);
  const filteredWorkouts = filteredWorkoutsMemo;

  const filteredWorkoutsMemo = useMemo(() => getFilteredWorkouts(), [workouts, selectedMonth, selectedMuscleGroup]);

  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        <Skeleton variant="rounded" height={60} className="w-full" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonWorkoutCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (showSelfWorkout) {
    if (!trainerId) {
      toast.error('לא ניתן לבצע אימון עצמאי ללא מאמן');
      setShowSelfWorkout(false);
      return null;
    }

    return (
      <SelfWorkoutSession
        traineeId={traineeId!}
        traineeName={traineeName || ''}
        trainerId={trainerId}
        onBack={() => setShowSelfWorkout(false)}
        onSave={() => {
          setShowSelfWorkout(false);
          loadWorkouts();
        }}
      />
    );
  }

  if (selectedWorkout) {
    return (
      <WorkoutDetail
        workout={selectedWorkout}
        onBack={() => setSelectedWorkout(null)}
        previousExerciseData={previousExerciseData}
        getExerciseComparison={getExerciseComparison}
      />
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <button
        onClick={() => setShowSelfWorkout(true)}
        className="w-full btn-primary py-4 rounded-xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all shadow-lg"
      >
        <Plus className="w-6 h-6" />
        <span className="font-bold text-lg">אימון עצמאי</span>
      </button>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mb-2">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
          <p className="text-xs text-emerald-100">אימונים החודש</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mb-2">
            <Activity className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold">{stats.avgVolume.toLocaleString()}</p>
          <p className="text-xs text-cyan-100">נפח ממוצע</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mb-2">
            <Trophy className="w-5 h-5" />
          </div>
          {latestPR ? (
            <>
              <p className="text-lg font-bold truncate">{latestPR.weight} ק״ג</p>
              <p className="text-xs text-amber-100 truncate">{latestPR.exercise}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold">-</p>
              <p className="text-xs text-amber-100">שיא אחרון</p>
            </>
          )}
        </div>
      </div>

      <div className="premium-card-static overflow-hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between bg-[var(--color-bg-surface)] border-b border-[var(--color-border)]"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span className="font-medium text-[var(--color-text-primary)]">סינון</span>
          </div>
          {showFilters ? (
            <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />
          )}
        </button>

        {showFilters && (
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">חודש</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="glass-input w-full p-2"
              >
                <option value="all">כל החודשים</option>
                {getAvailableMonths().map((month) => (
                  <option key={month} value={month}>
                    {formatMonthName(month)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">קבוצת שריר</label>
              <select
                value={selectedMuscleGroup}
                onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                className="glass-input w-full p-2"
              >
                <option value="all">כל קבוצות השריר</option>
                {muscleGroups.map((mg) => (
                  <option key={mg.id} value={mg.id}>
                    {mg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="premium-card-static overflow-hidden">
        <div className="bg-[var(--color-bg-surface)] px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-[var(--color-text-primary)]">היסטוריית אימונים</h3>
        </div>

        {filteredWorkouts.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Dumbbell}
              title={workouts.length === 0 ? "אין אימונים עדיין" : "לא נמצאו אימונים"}
              description={workouts.length === 0 ? "התחל באימון הראשון שלך" : "לא נמצאו אימונים בתקופה שנבחרה"}
              action={workouts.length === 0 ? {
                label: 'התחל אימון',
                onClick: () => setShowSelfWorkout(true)
              } : undefined}
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredWorkouts.map((workout) => (
              <button
                key={workout.id}
                onClick={() => setSelectedWorkout(workout)}
                className="w-full p-4 flex items-center justify-between hover:bg-[var(--color-bg-surface)] transition-colors text-right"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                      workout.is_completed ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-[var(--color-bg-surface)] border-[var(--color-border)]'
                    }`}
                  >
                    {workout.is_completed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[var(--color-text-muted)]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {new Date(workout.workout_date).toLocaleDateString('he-IL', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                      <span>{workout.workout_exercises?.length || 0} תרגילים</span>
                      <span>{calculateWorkoutVolume(workout).toLocaleString()} ק״ג נפח</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--color-text-muted)] rotate-180" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface WorkoutDetailProps {
  workout: Workout;
  onBack: () => void;
  previousExerciseData: Map<string, { weight: number; reps: number }>;
  getExerciseComparison: (
    exerciseId: string,
    currentWeight: number,
    currentReps: number
  ) => { direction: 'up' | 'down' | 'same'; diff: number } | null;
}

function WorkoutDetail({
  workout,
  onBack,
  getExerciseComparison,
}: WorkoutDetailProps) {
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  const toggleExercise = (exerciseId: string) => {
    setExpandedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const getMaxSet = (sets: ExerciseSet[]) => {
    return sets.reduce(
      (max, set) => {
        const volume = (set.weight || 0) * (set.reps || 0);
        const maxVolume = (max.weight || 0) * (max.reps || 0);
        return volume > maxVolume ? set : max;
      },
      { weight: 0, reps: 0 } as ExerciseSet
    );
  };

  return (
    <div className="space-y-4 pb-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowRight className="w-5 h-5" />
        <span>חזרה לרשימה</span>
      </button>

      <div className="bg-gradient-to-l from-emerald-600 to-emerald-500 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">
              {new Date(workout.workout_date).toLocaleDateString('he-IL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-emerald-100 mt-1">
              {workout.workout_exercises?.length || 0} תרגילים
            </p>
          </div>
          {workout.is_completed ? (
            <div className="bg-white/20 px-3 py-1 rounded-full text-sm">הושלם</div>
          ) : (
            <div className="bg-white/20 px-3 py-1 rounded-full text-sm">לא הושלם</div>
          )}
        </div>
      </div>

      {workout.notes && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-400 mb-1">הערות המאמן</p>
          <p className="text-amber-300 leading-relaxed">{workout.notes}</p>
        </div>
      )}

      <div className="space-y-3">
        {workout.workout_exercises
          ?.sort((a, b) => a.order_index - b.order_index)
          .map((we) => {
            const isExpanded = expandedExercises.has(we.id);
            const maxSet = getMaxSet(we.exercise_sets || []);
            const comparison = getExerciseComparison(
              we.exercise_id,
              maxSet.weight || 0,
              maxSet.reps || 0
            );

            return (
              <div
                key={we.id}
                className="premium-card-static overflow-hidden"
              >
                <button
                  onClick={() => toggleExercise(we.id)}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/15 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[var(--color-text-primary)]">{we.exercises?.name}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {we.exercises?.muscle_groups?.name || 'כללי'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {comparison && (
                      <div
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          comparison.direction === 'up'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : comparison.direction === 'down'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                        }`}
                      >
                        {comparison.direction === 'up' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : comparison.direction === 'down' ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        {comparison.diff > 0 && `${comparison.diff} ק״ג`}
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[var(--color-border)]">
                    <div className="mt-3 space-y-2">
                      {we.exercise_sets
                        ?.sort((a, b) => a.set_number - b.set_number)
                        .map((set, index) => (
                          <div key={set.id} className="space-y-1">
                            <div className="bg-[var(--color-bg-surface)] rounded-lg p-3 border border-[var(--color-border)]">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center text-xs font-medium">
                                    {index + 1}
                                  </span>
                                  <span className="font-medium text-[var(--color-text-primary)]">
                                    {set.weight || 0} ק״ג × {set.reps || 0}
                                  </span>
                                  {set.failure && (
                                    <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                                      כשל
                                    </span>
                                  )}
                                </div>
                                {set.rpe && (
                                  <span className="text-sm text-[var(--color-text-muted)]">RPE {set.rpe}</span>
                                )}
                              </div>
                              {set.equipment && (
                                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mr-9">
                                  {set.equipment.emoji && <span>{set.equipment.emoji}</span>}
                                  <span>{set.equipment.name}</span>
                                </div>
                              )}
                            </div>

                            {set.superset_weight && set.superset_reps && (
                              <div className="bg-cyan-500/15 border border-cyan-500/30 rounded-lg p-3 mr-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-cyan-400 font-medium">סופרסט</span>
                                    <span className="font-medium text-cyan-300">
                                      {set.superset_weight} ק״ג × {set.superset_reps}
                                    </span>
                                  </div>
                                  {set.superset_rpe && (
                                    <span className="text-sm text-cyan-400">RPE {set.superset_rpe}</span>
                                  )}
                                </div>
                                {set.superset_equipment && (
                                  <div className="flex items-center gap-2 text-sm text-cyan-400">
                                    {set.superset_equipment.emoji && <span>{set.superset_equipment.emoji}</span>}
                                    <span>{set.superset_equipment.name}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {set.dropset_weight && set.dropset_reps && (
                              <div className="flex items-center justify-between bg-amber-500/15 border border-amber-500/30 rounded-lg p-3 mr-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-amber-400 font-medium">דרופסט</span>
                                  <span className="font-medium text-amber-300">
                                    {set.dropset_weight} ק״ג × {set.dropset_reps}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
