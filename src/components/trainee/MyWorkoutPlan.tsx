import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  Dumbbell,
  Target,
  Check,
  Repeat,
  ClipboardList,
  Flame,
  Zap,
  Heart,
  Shield,
  Edit3,
  Save,
  X,
  History,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  Award,
  Activity,
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
  updated_at: string | null;
  last_modified_by: string | null;
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
  target_weight: number | null;
  target_rpe: number | null;
  equipment_id: string | null;
  set_type: string;
  failure: boolean;
  superset_exercise_id: string | null;
  superset_weight: number | null;
  superset_reps: number | null;
  superset_rpe: number | null;
  superset_equipment_id: string | null;
  superset_dropset_weight: number | null;
  superset_dropset_reps: number | null;
  dropset_weight: number | null;
  dropset_reps: number | null;
  trainee_notes: string | null;
  trainee_target_weight: number | null;
  trainee_modified_at: string | null;
  exercise?: {
    id: string;
    name: string;
    muscle_group_id: string;
    muscle_group?: {
      name: string;
    };
  };
  equipment?: {
    id: string;
    name: string;
    emoji: string | null;
  };
  superset_exercise?: {
    id: string;
    name: string;
  };
  superset_equipment?: {
    id: string;
    name: string;
    emoji: string | null;
  };
}

interface PlanHistory {
  id: string;
  change_type: string;
  change_description: string;
  changed_by_type: string;
  created_at: string;
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

const muscleGroupColors: Record<string, string> = {
  'חזה': 'bg-rose-500/10 text-rose-700 border-rose-200',
  'גב': 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
  'כתפיים': 'bg-amber-500/10 text-amber-700 border-amber-200',
  'רגליים': 'bg-orange-500/10 text-orange-700 border-orange-200',
  'זרועות': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'בטן': 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  'ישבן': 'bg-purple-500/10 text-purple-700 border-purple-200',
};

const dayGradients = [
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-purple-500 to-indigo-600',
  'from-teal-500 to-emerald-600',
  'from-blue-500 to-cyan-600',
];

export default function MyWorkoutPlan({ traineeId }: MyWorkoutPlanProps) {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [dayExercises, setDayExercises] = useState<Record<string, DayExercise[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ trainee_notes: string; trainee_target_weight: number | null }>({
    trainee_notes: '',
    trainee_target_weight: null,
  });
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<PlanHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState<string | null>(null);

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
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planData) {
      setPlan(planData);
      await loadPlanDays(planData.id);
      await loadHistory(planData.id);
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
            exercise:exercise_id(
              id,
              name,
              muscle_group_id,
              muscle_group:muscle_groups(name)
            ),
            equipment:equipment_id(
              id,
              name,
              emoji
            ),
            superset_exercise:superset_exercise_id(
              id,
              name
            ),
            superset_equipment:superset_equipment_id(
              id,
              name,
              emoji
            )
          `)
          .eq('day_id', day.id)
          .order('order_index', { ascending: true });

        exercisesMap[day.id] = exercisesData || [];
      }
      setDayExercises(exercisesMap);
    }
  };

  const loadHistory = async (planId: string) => {
    const { data } = await supabase
      .from('workout_plan_history')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setHistory(data);
    }
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayId)) {
        newSet.delete(dayId);
      } else {
        newSet.add(dayId);
      }
      return newSet;
    });
  };

  const startEditing = (exercise: DayExercise) => {
    setEditingExercise(exercise.id);
    setEditData({
      trainee_notes: exercise.trainee_notes || '',
      trainee_target_weight: exercise.trainee_target_weight,
    });
  };

  const cancelEditing = () => {
    setEditingExercise(null);
    setEditData({ trainee_notes: '', trainee_target_weight: null });
  };

  const saveExerciseChanges = async (exercise: DayExercise) => {
    if (!plan) return;
    setSaving(true);

    const { error } = await supabase
      .from('workout_plan_day_exercises')
      .update({
        trainee_notes: editData.trainee_notes || null,
        trainee_target_weight: editData.trainee_target_weight,
        trainee_modified_at: new Date().toISOString(),
      })
      .eq('id', exercise.id);

    if (error) {
      toast.error('שגיאה בשמירת השינויים');
      console.error(error);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('workout_plan_history').insert({
          plan_id: plan.id,
          changed_by_user_id: userData.user.id,
          changed_by_type: 'trainee',
          change_type: 'exercise_updated',
          change_description: `עדכון תרגיל: ${exercise.exercise?.name || 'תרגיל'}`,
          previous_data: {
            trainee_notes: exercise.trainee_notes,
            trainee_target_weight: exercise.trainee_target_weight,
          },
          new_data: {
            trainee_notes: editData.trainee_notes,
            trainee_target_weight: editData.trainee_target_weight,
          },
        });
      }

      await supabase
        .from('trainee_workout_plans')
        .update({
          updated_at: new Date().toISOString(),
          last_modified_by: 'trainee',
        })
        .eq('id', plan.id);

      toast.success('השינויים נשמרו');
      setEditingExercise(null);
      await loadActivePlan();
    }

    setSaving(false);
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

  const calculateDayVolume = (dayId: string) => {
    const exercises = dayExercises[dayId] || [];
    let totalVolume = 0;

    exercises.forEach(ex => {
      const weight = ex.target_weight || ex.trainee_target_weight || 0;
      const avgReps = ex.reps_range.includes('-')
        ? (parseInt(ex.reps_range.split('-')[0]) + parseInt(ex.reps_range.split('-')[1])) / 2
        : parseInt(ex.reps_range) || 0;
      totalVolume += weight * avgReps * ex.sets_count;

      if (ex.superset_weight && ex.superset_reps) {
        totalVolume += ex.superset_weight * ex.superset_reps * ex.sets_count;
      }

      if (ex.dropset_weight && ex.dropset_reps) {
        totalVolume += ex.dropset_weight * ex.dropset_reps * ex.sets_count;
      }
    });

    return Math.round(totalVolume);
  };

  const getMuscleGroups = (dayId: string): string[] => {
    const exercises = dayExercises[dayId] || [];
    const groups = new Set<string>();

    exercises.forEach(ex => {
      if (ex.exercise?.muscle_group?.name) {
        groups.add(ex.exercise.muscle_group.name);
      }
    });

    return Array.from(groups);
  };

  const formatRestTime = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}` : `${minutes}`;
    }
    return `${seconds}`;
  };

  const getMuscleGroupIcon = (focus: string | null) => {
    if (!focus) return Dumbbell;
    for (const [key, icon] of Object.entries(muscleGroupIcons)) {
      if (focus.includes(key)) return icon;
    }
    return Dumbbell;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 flex items-center justify-center shadow-glow animate-float border border-white/10">
          <Dumbbell className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-emerald-500/20">
          <ClipboardList className="w-10 h-10 text-emerald-400" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-2">אין תוכנית אימונים פעילה</h3>
        <p className="text-sm text-[var(--color-text-muted)]">המאמן שלך עדיין לא יצר לך תוכנית אימונים</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6 pb-6">
      {/* Header Card - Premium Design */}
      <div className="relative premium-card-static overflow-hidden animate-fade-in">
        {/* Background Gradient Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/10 opacity-60" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative p-5 md:p-7 lg:p-8">
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                  <ClipboardList className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-1">תוכנית אימון</p>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] leading-tight">
                    {plan.name}
                  </h1>
                </div>
              </div>
              {plan.description && (
                <p className="text-[var(--color-text-secondary)] text-sm md:text-base leading-relaxed max-w-2xl">
                  {plan.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl backdrop-blur-sm">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-sm text-emerald-400">{plan.days_per_week} ימים/שבוע</span>
            </div>

            {plan.updated_at && (
              <div className="flex items-center gap-2 bg-[var(--color-bg-surface)] border border-[var(--color-border)] px-4 py-2 rounded-xl">
                <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-[var(--color-text-secondary)] text-sm font-medium">
                  עדכון: {formatDate(plan.updated_at)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Card */}
      {history.length > 0 && (
        <div className="premium-card-static overflow-hidden animate-fade-in">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-4 md:p-5 flex items-center justify-between text-right hover:bg-[var(--color-bg-surface)] transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <History className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="font-bold text-[var(--color-text-primary)]">היסטוריית שינויים</span>
            </div>
            {showHistory ? (
              <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)] transition-transform duration-300" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)] transition-transform duration-300" />
            )}
          </button>

          {showHistory && (
            <div className="border-t border-[var(--color-border)] p-4 md:p-5 space-y-3 max-h-64 overflow-y-auto animate-slide-down">
              {history.map((item) => (
                <div key={item.id} className="flex items-start gap-3 text-sm bg-[var(--color-bg-surface)] p-4 rounded-xl transition-all duration-300 hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
                  <div
                    className={`w-3 h-3 rounded-full mt-1.5 shadow-sm ${
                      item.changed_by_type === 'trainer' ? 'bg-cyan-500' : 'bg-emerald-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-[var(--color-text-primary)] font-medium">{item.change_description}</p>
                    <p className="text-[var(--color-text-muted)] text-xs mt-1">
                      {formatDate(item.created_at)} | {item.changed_by_type === 'trainer' ? 'מאמן' : 'מתאמן'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Workout Days Grid - Accordion Pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        {days.map((day, dayIndex) => {
          const gradient = dayGradients[dayIndex % dayGradients.length];
          const exercises = dayExercises[day.id] || [];
          const Icon = getMuscleGroupIcon(day.focus);
          const completedCount = getCompletedCount(day.id);
          const isExpanded = expandedDays.has(day.id);
          const volume = calculateDayVolume(day.id);
          const muscleGroups = getMuscleGroups(day.id);
          const progressPercent = exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0;

          return (
            <div
              key={day.id}
              className="premium-card-static overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 animate-fade-in-up border border-[var(--color-border)]"
              style={{ animationDelay: `${dayIndex * 50}ms` }}
            >
              {/* Accordion Header - Always Visible */}
              <div
                onClick={() => toggleDay(day.id)}
                className={`relative bg-gradient-to-br ${gradient} p-5 md:p-6 lg:p-7 text-white cursor-pointer transition-all duration-300 hover:shadow-xl overflow-hidden`}
              >
                {/* Subtle Pattern Overlay */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.1)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-white/25 p-3 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] backdrop-blur-md border border-white/20">
                          <Icon className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        {completedCount === exercises.length && exercises.length > 0 && (
                          <span className="bg-white/30 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-bold backdrop-blur-md shadow-lg animate-scale-in border border-white/20">
                            <Check className="w-3.5 h-3.5" />
                            הושלם
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm opacity-90 font-semibold mb-1.5 tracking-wide uppercase">יום {day.day_number}</p>
                      <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2.5 leading-tight">
                        {day.day_name || `יום אימון ${day.day_number}`}
                      </h3>
                      {day.focus && (
                        <p className="flex items-center gap-2 text-sm opacity-95 font-semibold">
                          <Target className="w-4 h-4" />
                          {day.focus}
                        </p>
                      )}
                    </div>

                    <button className="text-white/90 hover:text-white transition-all duration-300 hover:scale-110 bg-white/10 hover:bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 md:w-6 md:h-6" />
                      ) : (
                        <ChevronDown className="w-5 h-5 md:w-6 md:h-6" />
                      )}
                    </button>
                  </div>

                  {/* Summary Stats - Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/25">
                    <div className="bg-white/20 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md border border-white/20">
                      <Dumbbell className="w-3.5 h-3.5" />
                      {exercises.length} תרגילים
                    </div>

                    {volume > 0 && (
                      <div className="bg-white/20 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md border border-white/20">
                        <TrendingUp className="w-3.5 h-3.5" />
                        ~{volume.toLocaleString()} ק״ג
                      </div>
                    )}

                    {completedCount > 0 && completedCount < exercises.length && (
                      <div className="bg-white/20 px-3 py-1.5 rounded-full text-sm font-bold backdrop-blur-md shadow-md border border-white/20">
                        {completedCount}/{exercises.length}
                      </div>
                    )}
                  </div>

                  {/* Muscle Group Tags */}
                  {muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {muscleGroups.map((group, idx) => (
                        <span
                          key={idx}
                          className="bg-white/25 text-white text-xs px-3 py-1 rounded-full font-bold backdrop-blur-md shadow-md border border-white/20"
                        >
                          {group}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Progress Bar */}
                  {progressPercent > 0 && progressPercent < 100 && (
                    <div className="mt-4">
                      <div className="h-2.5 bg-white/25 rounded-full overflow-hidden shadow-inner backdrop-blur-sm border border-white/10">
                        <div
                          className="h-full bg-white transition-all duration-700 ease-out rounded-full shadow-lg"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Accordion Content - Exercises */}
              {isExpanded && (
                <div className="p-4 md:p-5 lg:p-6 space-y-4 animate-slide-down bg-[var(--color-bg-base)]">
                  {day.notes && (
                    <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 shadow-sm">
                      <p className="text-sm font-bold text-amber-400 mb-1 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        הערות ליום זה
                      </p>
                      <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{day.notes}</p>
                    </div>
                  )}

                  {exercises.map((exercise, exIndex) => {
                    const isCompleted = completedExercises.has(exercise.id);
                    const isEditing = editingExercise === exercise.id;
                    const exerciseName = exercise.exercise?.name || exercise.exercise_name || 'תרגיל';

                    return (
                      <div
                        key={exercise.id}
                        className={`premium-card-static overflow-hidden transition-all duration-300 hover:shadow-card-hover border-2 ${
                          isCompleted ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-[var(--color-border)]'
                        }`}
                        style={{ animationDelay: `${exIndex * 30}ms` }}
                      >
                        <div className="p-4 md:p-5">
                          <div className="flex items-start gap-4">
                            {/* Check Button */}
                            <button
                              onClick={() => toggleExerciseComplete(exercise.id)}
                              className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg ${
                                isCompleted
                                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white scale-105'
                                  : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)]'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-6 h-6 animate-scale-in" />
                              ) : (
                                <span className="text-xl font-bold">{exIndex + 1}</span>
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              {/* Exercise Name & Edit Button */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className={`text-base md:text-lg font-bold leading-tight ${isCompleted ? 'text-emerald-400' : 'text-[var(--color-text-primary)]'}`}>
                                    {exerciseName}
                                  </h4>
                                  {exercise.exercise?.muscle_group?.name && (
                                    <p className="text-xs md:text-sm text-[var(--color-text-muted)] mt-1 font-medium">{exercise.exercise.muscle_group.name}</p>
                                  )}
                                </div>
                                {!isEditing && (
                                  <button
                                    onClick={() => startEditing(exercise)}
                                    className="p-2 text-[var(--color-text-muted)] hover:text-cyan-400 hover:bg-cyan-500/15 rounded-lg transition-all duration-300 border border-transparent hover:border-cyan-500/30"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {/* Pills - Sets, Reps, Rest */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                <div className="bg-emerald-500/12 border border-emerald-500/25 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                                  <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-xs md:text-sm font-bold text-emerald-400">{exercise.sets_count} סטים</span>
                                </div>

                                <div className="bg-cyan-500/12 border border-cyan-500/25 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                                  <span className="text-xs md:text-sm font-bold text-cyan-400">{exercise.reps_range} חזרות</span>
                                </div>

                                <div className="bg-amber-500/12 border border-amber-500/25 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="text-xs md:text-sm font-bold text-amber-400">{formatRestTime(exercise.rest_seconds)}{exercise.rest_seconds >= 60 ? 'ד׳' : 'ש׳'}</span>
                                </div>

                                {exercise.failure && (
                                  <div className="bg-rose-500/12 border border-rose-500/25 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                                    <Activity className="w-3.5 h-3.5 text-rose-400" />
                                    <span className="text-xs md:text-sm font-bold text-rose-400">כשל</span>
                                  </div>
                                )}

                                {exercise.target_rpe && (
                                  <div className="bg-purple-500/12 border border-purple-500/25 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                                    <Award className="w-3.5 h-3.5 text-purple-400" />
                                    <span className="text-xs md:text-sm font-bold text-purple-400">RPE {exercise.target_rpe}</span>
                                  </div>
                                )}
                              </div>

                              {/* Mini Info - Equipment & Target Weight */}
                              <div className="space-y-2">
                                {exercise.equipment && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-[var(--color-text-muted)] font-medium">ציוד:</span>
                                    <div className="flex items-center gap-1.5 font-bold text-[var(--color-text-primary)]">
                                      {exercise.equipment.emoji && <span className="text-base">{exercise.equipment.emoji}</span>}
                                      {exercise.equipment.name}
                                    </div>
                                  </div>
                                )}

                                {exercise.target_weight && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-[var(--color-text-muted)] font-medium">משקל יעד (מאמן):</span>
                                    <span className="font-bold text-teal-400">{exercise.target_weight} ק״ג</span>
                                  </div>
                                )}

                                {exercise.trainee_target_weight && !isEditing && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-[var(--color-text-muted)] font-medium">משקל יעד שלי:</span>
                                    <span className="font-bold text-emerald-400">{exercise.trainee_target_weight} ק״ג</span>
                                  </div>
                                )}
                              </div>

                              {/* Superset Info */}
                              {exercise.set_type === 'superset' && exercise.superset_exercise && (
                                <div className="mt-3 bg-cyan-500/15 border border-cyan-500/30 rounded-xl p-3 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded-full">סופרסט</span>
                                    <span className="font-bold text-cyan-300 text-sm">{exercise.superset_exercise.name}</span>
                                  </div>
                                  {exercise.superset_weight && exercise.superset_reps && (
                                    <div className="text-xs text-cyan-400">
                                      <span className="font-medium">משקל וחזרות:</span> <span className="font-bold">{exercise.superset_weight} ק״ג × {exercise.superset_reps}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Dropset Info */}
                              {exercise.set_type === 'dropset' && (exercise.dropset_weight || exercise.dropset_reps) && (
                                <div className="mt-3 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 shadow-sm">
                                  <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full">דרופסט</span>
                                  <div className="text-xs text-amber-400 mt-2">
                                    <span className="font-medium">משקל וחזרות:</span> <span className="font-bold">{exercise.dropset_weight} ק״ג × {exercise.dropset_reps}</span>
                                  </div>
                                </div>
                              )}

                              {/* Trainer Notes - Info Icon */}
                              {exercise.notes && (
                                <div className="mt-3">
                                  <button
                                    onClick={() => setShowInfoTooltip(showInfoTooltip === exercise.id ? null : exercise.id)}
                                    className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-all duration-300 text-sm font-medium"
                                  >
                                    <Info className="w-4 h-4" />
                                    <span>הערות מהמאמן</span>
                                  </button>
                                  {showInfoTooltip === exercise.id && (
                                    <div className="mt-2 p-3 bg-amber-500/15 rounded-xl border border-amber-500/30 shadow-sm animate-fade-in">
                                      <p className="text-sm text-amber-300 leading-relaxed">{exercise.notes}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Trainee Notes - Display */}
                              {exercise.trainee_notes && !isEditing && (
                                <div className="mt-3 p-3 bg-emerald-500/15 rounded-xl border border-emerald-500/30 shadow-sm">
                                  <p className="text-xs font-bold text-emerald-400 mb-1">ההערות שלי</p>
                                  <p className="text-sm text-emerald-300 leading-relaxed">{exercise.trainee_notes}</p>
                                </div>
                              )}

                              {/* Edit Mode */}
                              {isEditing && (
                                <div className="mt-4 p-4 bg-cyan-500/15 rounded-2xl border border-cyan-500/30 space-y-4 shadow-md animate-fade-in">
                                  <h5 className="font-bold text-cyan-300">עריכה אישית</h5>

                                  <div>
                                    <label className="block text-sm font-bold text-cyan-400 mb-2">
                                      משקל יעד שלי (ק״ג)
                                    </label>
                                    <input
                                      type="number"
                                      value={editData.trainee_target_weight || ''}
                                      onChange={(e) =>
                                        setEditData({ ...editData, trainee_target_weight: e.target.value ? Number(e.target.value) : null })
                                      }
                                      placeholder={exercise.target_weight ? `המאמן המליץ: ${exercise.target_weight}` : 'הזן משקל יעד'}
                                      className="glass-input w-full px-4 py-3"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-bold text-cyan-400 mb-2">
                                      הערות שלי
                                    </label>
                                    <textarea
                                      value={editData.trainee_notes}
                                      onChange={(e) => setEditData({ ...editData, trainee_notes: e.target.value })}
                                      placeholder="הוסף הערות אישיות לתרגיל..."
                                      rows={3}
                                      className="glass-input w-full px-4 py-3 resize-none"
                                    />
                                  </div>

                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => saveExerciseChanges(exercise)}
                                      disabled={saving}
                                      className="flex-1 py-3 px-4 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                      <Save className="w-5 h-5" />
                                      {saving ? 'שומר...' : 'שמור'}
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="py-3 px-4 btn-secondary flex items-center justify-center"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Last Modified */}
                              {exercise.trainee_modified_at && !isEditing && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                  עודכן על ידך: {formatDate(exercise.trainee_modified_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Completion Message */}
                  {exercises.length > 0 && completedCount === exercises.length && (
                    <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl p-6 text-white text-center shadow-[0_8px_30px_rgba(16,185,129,0.3)] animate-scale-in overflow-hidden">
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.1)_50%,transparent_75%,transparent_100%)] bg-[length:30px_30px] opacity-20" />
                      <div className="relative">
                        <div className="w-16 h-16 bg-white/25 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(255,255,255,0.3)] backdrop-blur-md border border-white/20">
                          <Check className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl md:text-2xl font-bold mb-2">כל הכבוד!</h4>
                        <p className="text-emerald-50 mt-1 text-sm md:text-base">סיימת את כל התרגילים ליום זה</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {days.length === 0 && (
        <div className="text-center py-12 premium-card-static animate-fade-in">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-emerald-500/20">
            <Calendar className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-[var(--color-text-primary)] font-bold text-lg">אין ימי אימון בתוכנית</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">המאמן שלך יוסיף ימי אימון בקרוב</p>
        </div>
      )}
    </div>
  );
}
