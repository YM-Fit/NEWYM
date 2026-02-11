import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { habitsApi } from '../../api/habitsApi';
import { smartRecommendations } from '../../utils/smartRecommendations';
import { logger } from '../../utils/logger';

interface DashboardStats {
  workoutsThisMonth: number;
  lastWeight: number | null;
  consecutiveDays: number;
  personalGoal: string | null;
}

interface WorkoutDay {
  date: Date;
  hasWorkout: boolean;
  isToday: boolean;
}

interface TodayStatuses {
  workout: 'none' | 'planned' | 'in_progress' | 'completed';
  food: 'none' | 'partial' | 'completed';
  habits: 'none' | 'partial' | 'completed';
  weighIn: 'none' | 'recent';
}

export function useTraineeDashboardQuery(traineeId: string | null) {
  return useQuery({
    queryKey: ['traineeDashboard', traineeId],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString();

      const { count: workoutsCount } = await supabase
        .from('workout_trainees')
        .select('workouts!inner(id, workout_date, is_completed)', { count: 'exact', head: true })
        .eq('trainee_id', traineeId!)
        .eq('workouts.is_completed', true)
        .gte('workouts.workout_date', startOfMonthStr);

      const { data: lastMeasurement } = await supabase
        .from('measurements')
        .select('weight')
        .eq('trainee_id', traineeId!)
        .not('weight', 'is', null)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const consecutiveDays = await calculateConsecutiveDays(traineeId!);
      const weekDays = await loadWeekWorkouts(traineeId!);

      let habitsStreak = 0;
      try {
        const habits = await habitsApi.getTraineeHabits(traineeId!);
        for (const habit of habits) {
          const streak = await habitsApi.getHabitStreak(habit.id);
          habitsStreak = Math.max(habitsStreak, streak);
        }
      } catch {
        habitsStreak = 0;
      }

      let recommendations: any[] = [];
      try {
        const recs = await smartRecommendations.getTraineeRecommendations(traineeId!);
        recommendations = recs.slice(0, 3);
      } catch {
        recommendations = [];
      }

      const todayStatuses = await loadTodayStatuses(traineeId!);

      const stats: DashboardStats = {
        workoutsThisMonth: workoutsCount || 0,
        lastWeight: lastMeasurement?.weight || null,
        consecutiveDays,
        personalGoal: null,
      };

      return { stats, weekDays, habitsStreak, recommendations, todayStatuses };
    },
    enabled: !!traineeId,
    staleTime: 60_000,
  });
}

async function loadTodayStatuses(traineeId: string): Promise<TodayStatuses> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString();
  const tomorrowStr = tomorrow.toISOString();

  let workout: TodayStatuses['workout'] = 'none';
  const { data: todayWorkouts } = await supabase
    .from('workout_trainees')
    .select('workouts!inner(id, workout_date, is_completed)')
    .eq('trainee_id', traineeId)
    .gte('workouts.workout_date', todayStr)
    .lt('workouts.workout_date', tomorrowStr);

  if (todayWorkouts && todayWorkouts.length > 0) {
    const anyCompleted = todayWorkouts.some((w: any) => w.workouts.is_completed);
    workout = anyCompleted ? 'completed' : 'planned';
  }

  let food: TodayStatuses['food'] = 'none';
  const todayDateStr = today.toISOString().split('T')[0];
  const { data: todayMeals } = await supabase
    .from('meals')
    .select('id, meal_type')
    .eq('trainee_id', traineeId)
    .eq('meal_date', todayDateStr);

  if (todayMeals && todayMeals.length > 0) {
    const mealTypes = new Set(todayMeals.map((e: any) => e.meal_type));
    food = mealTypes.size >= 3 ? 'completed' : 'partial';
  }

  let habits: TodayStatuses['habits'] = 'none';
  const { data: traineeHabits } = await supabase
    .from('trainee_habits')
    .select('id')
    .eq('trainee_id', traineeId)
    .eq('is_active', true);

  if (traineeHabits && traineeHabits.length > 0) {
    const habitIds = traineeHabits.map((h: any) => h.id);
    const { data: todayHabitsLogs } = await supabase
      .from('habit_logs')
      .select('id')
      .in('habit_id', habitIds)
      .eq('log_date', todayStr);

    if (todayHabitsLogs && todayHabitsLogs.length > 0) {
      habits = 'partial';
    }
  }

  let weighIn: TodayStatuses['weighIn'] = 'none';
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const { data: recentWeights } = await supabase
    .from('trainee_self_weights')
    .select('id, weight_date')
    .eq('trainee_id', traineeId)
    .gte('weight_date', sevenDaysAgoStr);

  if (recentWeights && recentWeights.length > 0) weighIn = 'recent';

  return { workout, food, habits, weighIn };
}

async function calculateConsecutiveDays(traineeId: string): Promise<number> {
  const { data: workouts } = await supabase
    .from('workout_trainees')
    .select('workouts!inner(workout_date, is_completed)')
    .eq('trainee_id', traineeId)
    .eq('workouts.is_completed', true)
    .order('workouts(workout_date)', { ascending: false });

  if (!workouts || workouts.length === 0) return 0;

  const workoutDates = new Set(workouts.map((w: any) => w.workouts.workout_date));
  let consecutiveDays = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i <= 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    if (workoutDates.has(dateStr)) {
      consecutiveDays++;
    } else if (i > 0) {
      break;
    }
  }
  return consecutiveDays;
}

async function loadWeekWorkouts(traineeId: string): Promise<WorkoutDay[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);

  const weekDates: WorkoutDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDates.push({ date, hasWorkout: false, isToday: date.toDateString() === today.toDateString() });
  }

  const startStr = startOfWeek.toISOString();
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  const endStr = endOfWeek.toISOString();

  const { data: workouts } = await supabase
    .from('workout_trainees')
    .select('workouts!inner(workout_date, is_completed)')
    .eq('trainee_id', traineeId)
    .eq('workouts.is_completed', true)
    .gte('workouts.workout_date', startStr)
    .lte('workouts.workout_date', endStr);

  if (workouts) {
    const workoutDates = new Set(
      workouts.map((w: any) => {
        const d = new Date(w.workouts.workout_date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    );
    weekDates.forEach((day) => {
      const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
      day.hasWorkout = workoutDates.has(dateStr);
    });
  }

  return weekDates;
}
