import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Target,
  Check,
  Circle,
  Repeat,
  ClipboardList,
  Flame,
  Zap,
  Heart,
  Shield,
} from 'lucide-react';

interface MyWorkoutPlanProps {
  traineeId: string | null;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  days_per_week: number;
  is_active: boolean;
}

interface WorkoutDay {
  id: string;
  plan_id: string;
  day_number: number;
  day_name: string | null;
  focus: string | null;
  notes: string | null;
  order_index: number;
}

interface DayExercise {
  id: string;
  day_id: string;
  exercise_id: string | null;
  exercise_name: string | null;
  sets_count: number;
  reps_range: string;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
  exercise?: {
    id: string;
    name: string;
    muscle_group_id: string;
    muscle_group?: {
      name: string;
    };
  };
}

const muscleGroupIcons: Record<string, typeof Dumbbell> = {
  'חזה': Heart,
  'גב': Shield,
  'כתפיים': Zap,
  'רגליים': Flame,
  'זרועות': Dumbbell,
  'בטן': Target,
  'ישבן': Flame,
};

const dayColors = [
  { bg: 'from-green-500 to-emerald-600', light: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'from-amber-500 to-orange-600', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'from-cyan-500 to-teal-600', light: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  { bg: 'from-violet-500 to-purple-600', light: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  { bg: 'from-slate-500 to-slate-600', light: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
];

export default function MyWorkoutPlan({ traineeId }: MyWorkoutPlanProps) {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [dayExercises, setDayExercises] = useState<Record<string, DayExercise[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (traineeId) {
      loadActivePlan();
    }
  }, [traineeId]);

  const loadActivePlan = async () => {
    if (!traineeId) return;
    setLoading(true);

    const { data: planData } = await supabase
      .from('trainee_workout_plans')
      .select('*')
      .eq('trainee_id', traineeId)
      .eq('is_active', true)
      .maybeSingle();

    if (planData) {
      setPlan(planData);
      await loadPlanDays(planData.id);
    }

    setLoading(false);
  };

  const loadPlanDays = async (planId: string) => {
    const { data: daysData } = await supabase
      .from('workout_plan_days')
      .select('*')
      .eq('plan_id', planId)
      .order('order_index', { ascending: true });

    if (daysData) {
      setDays(daysData);

      const exercisesMap: Record<string, DayExercise[]> = {};
      for (const day of daysData) {
        const { data: exercisesData } = await supabase
          .from('workout_plan_day_exercises')
          .select(`
            *,
            exercise:exercises!workout_plan_day_exercises_exercise_id_fkey(
              id,
              name,
              muscle_group_id,
              muscle_group:muscle_groups(name)
            )
          `)
          .eq('day_id', day.id)
          .order('order_index', { ascending: true });

        exercisesMap[day.id] = exercisesData || [];
      }
      setDayExercises(exercisesMap);
    }
  };

  const toggleExerciseComplete = (exerciseId: string) => {
    setCompletedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const getCompletedCount = (dayId: string) => {
    const exercises = dayExercises[dayId] || [];
    return exercises.filter((ex) => completedExercises.has(ex.id)).length;
  };

  const formatRestTime = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}:${String(remainingSeconds).padStart(2, '0')} דקות` : `${minutes} דקות`;
    }
    return `${seconds} שניות`;
  };

  const getMuscleGroupIcon = (focus: string | null) => {
    if (!focus) return Dumbbell;
    for (const [key, icon] of Object.entries(muscleGroupIcons)) {
      if (focus.includes(key)) return icon;
    }
    return Dumbbell;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-700 mb-2">אין תוכנית אימונים פעילה</h3>
        <p className="text-gray-500">המאמן שלך עדיין לא יצר לך תוכנית אימונים</p>
      </div>
    );
  }

  if (selectedDay) {
    const exercises = dayExercises[selectedDay.id] || [];
    const colorIndex = (selectedDay.day_number - 1) % dayColors.length;
    const color = dayColors[colorIndex];
    const Icon = getMuscleGroupIcon(selectedDay.focus);
    const completedCount = getCompletedCount(selectedDay.id);

    return (
      <div className="space-y-4 pb-4">
        <button
          onClick={() => setSelectedDay(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          <span>חזרה לתוכנית</span>
        </button>

        <div className={`bg-gradient-to-l ${color.bg} rounded-xl p-5 text-white`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80">יום {selectedDay.day_number}</p>
              <h2 className="text-xl font-bold">
                {selectedDay.day_name || `יום אימון ${selectedDay.day_number}`}
              </h2>
              {selectedDay.focus && (
                <p className="flex items-center gap-2 mt-2 text-sm opacity-90">
                  <Target className="w-4 h-4" />
                  {selectedDay.focus}
                </p>
              )}
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Icon className="w-8 h-8" />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              <span>{exercises.length} תרגילים</span>
            </div>
            {completedCount > 0 && (
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <Check className="w-4 h-4" />
                <span>{completedCount}/{exercises.length} הושלמו</span>
              </div>
            )}
          </div>
        </div>

        {selectedDay.notes && (
          <div className={`${color.light} ${color.border} border rounded-xl p-4`}>
            <p className={`text-sm font-medium ${color.text} mb-1`}>הערות ליום זה</p>
            <p className="text-gray-700">{selectedDay.notes}</p>
          </div>
        )}

        <div className="space-y-3">
          {exercises.map((exercise, index) => {
            const isCompleted = completedExercises.has(exercise.id);
            const exerciseName = exercise.exercise?.name || exercise.exercise_name || 'תרגיל';

            return (
              <div
                key={exercise.id}
                className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all border-2 ${
                  isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="p-4 lg:p-5">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleExerciseComplete(exercise.id)}
                      className={`flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center transition-all shadow-md ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : `bg-gradient-to-br ${color.bg} text-white hover:shadow-lg`
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-6 h-6 lg:w-7 lg:h-7" />
                      ) : (
                        <span className="text-xl lg:text-2xl font-bold">{index + 1}</span>
                      )}
                    </button>

                    <div className="flex-1">
                      <h3 className={`text-lg lg:text-xl font-bold ${isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                        {exerciseName}
                      </h3>
                      {exercise.exercise?.muscle_group?.name && (
                        <p className="text-sm text-gray-500 mt-0.5">{exercise.exercise.muscle_group.name}</p>
                      )}

                      <div className="bg-gray-50 rounded-xl p-4 mt-3 border-2 border-gray-200">
                        <div className="grid grid-cols-3 gap-3">
                          <div className={`${color.light} ${color.border} border-2 rounded-lg p-3 text-center`}>
                            <div className={`flex items-center justify-center gap-1 mb-1 ${color.text}`}>
                              <Repeat className="w-4 h-4" />
                              <span className="text-xs font-medium">סטים</span>
                            </div>
                            <div className={`text-2xl lg:text-3xl font-bold ${color.text}`}>
                              {exercise.sets_count}
                            </div>
                          </div>

                          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1 text-blue-700">
                              <Target className="w-4 h-4" />
                              <span className="text-xs font-medium">חזרות</span>
                            </div>
                            <div className="text-2xl lg:text-3xl font-bold text-blue-700">
                              {exercise.reps_range}
                            </div>
                          </div>

                          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1 text-orange-700">
                              <Clock className="w-4 h-4" />
                              <span className="text-xs font-medium">מנוחה</span>
                            </div>
                            <div className="text-lg lg:text-xl font-bold text-orange-700">
                              {formatRestTime(exercise.rest_seconds)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {exercise.notes && (
                        <div className="mt-3 p-3 bg-amber-50 rounded-lg border-2 border-amber-200">
                          <div className="flex items-start gap-2">
                            <span className="text-lg">💡</span>
                            <p className="text-sm text-amber-800 font-medium">{exercise.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {exercises.length > 0 && completedCount === exercises.length && (
          <div className="bg-gradient-to-l from-green-500 to-emerald-600 rounded-xl p-5 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">כל הכבוד!</h3>
            <p className="text-green-100 mt-1">סיימת את כל התרגילים ליום זה</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="bg-gradient-to-l from-green-600 to-green-500 rounded-xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{plan.name}</h2>
            {plan.description && (
              <p className="text-green-100 text-sm mt-1">{plan.description}</p>
            )}
          </div>
          <div className="bg-white/20 p-3 rounded-xl">
            <ClipboardList className="w-7 h-7" />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
          <Calendar className="w-4 h-4" />
          <span>{plan.days_per_week} ימי אימון בשבוע</span>
        </div>
      </div>

      <div className="space-y-4">
        {days.map((day) => {
          const colorIndex = (day.day_number - 1) % dayColors.length;
          const color = dayColors[colorIndex];
          const exercises = dayExercises[day.id] || [];
          const Icon = getMuscleGroupIcon(day.focus);
          const completedCount = getCompletedCount(day.id);

          return (
            <div key={day.id} className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200">
              <div className={`bg-gradient-to-l ${color.bg} p-5 text-white`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <Icon className="w-6 h-6" />
                      </div>
                      {completedCount > 0 && completedCount === exercises.length && (
                        <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          הושלם
                        </span>
                      )}
                    </div>
                    <p className="text-sm opacity-80">יום {day.day_number}</p>
                    <h3 className="text-xl font-bold">
                      {day.day_name || `יום אימון ${day.day_number}`}
                    </h3>
                    {day.focus && (
                      <p className="flex items-center gap-2 mt-2 text-sm opacity-90">
                        <Target className="w-4 h-4" />
                        {day.focus}
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="bg-white/20 rounded-lg p-3 text-center min-w-[60px]">
                      <p className="text-3xl font-bold">{exercises.length}</p>
                      <p className="text-xs opacity-80">תרגילים</p>
                    </div>
                  </div>
                </div>

                {completedCount > 0 && completedCount < exercises.length && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>התקדמות</span>
                      <span className="font-semibold">
                        {completedCount}/{exercises.length}
                      </span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all"
                        style={{ width: `${(completedCount / exercises.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4">
                <button
                  onClick={() => setSelectedDay(day)}
                  className={`w-full py-4 px-4 rounded-xl font-semibold text-lg transition-all shadow-md hover:shadow-lg ${color.light} ${color.text} border-2 ${color.border}`}
                >
                  {completedCount === exercises.length && exercises.length > 0 ? 'צפה באימון' : 'התחל אימון'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {days.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">אין ימי אימון בתוכנית</p>
          <p className="text-sm text-gray-500 mt-1">המאמן שלך יוסיף ימי אימון בקרוב</p>
        </div>
      )}
    </div>
  );
}
