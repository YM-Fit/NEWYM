import { supabase } from '../lib/supabase';
import type {
  MealPlan,
  MealPlanMeal,
  WeekDiaryData,
} from '../types/nutritionTypes';

export async function getActiveMealPlanWithMeals(
  traineeId: string
): Promise<{ plan: MealPlan | null; meals: MealPlanMeal[] }> {
  if (!traineeId) {
    return { plan: null, meals: [] };
  }

  const { data: plan, error: planError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('trainee_id', traineeId)
    .eq('is_active', true)
    .maybeSingle();

  if (planError || !plan) {
    return { plan: null, meals: [] };
  }

  const { data: meals, error: mealsError } = await supabase
    .from('meal_plan_meals')
    .select('*')
    .eq('plan_id', plan.id)
    .order('order_index', { ascending: true });

  if (mealsError) {
    return { plan, meals: [] };
  }

  return { plan, meals: meals || [] };
}

export async function getWeekDiaryData(
  traineeId: string,
  startDate: string,
  endDate: string
): Promise<WeekDiaryData> {
  if (!traineeId) {
    return { meals: [], waterLogs: [], diaryEntries: [] };
  }

  const [{ data: meals }, { data: waterLogs }, { data: diaryEntries }] =
    await Promise.all([
      supabase
        .from('meals')
        .select('*')
        .eq('trainee_id', traineeId)
        .gte('meal_date', startDate)
        .lte('meal_date', endDate)
        .order('meal_time', { ascending: true }),
      supabase
        .from('daily_log')
        .select('*')
        .eq('trainee_id', traineeId)
        .gte('log_date', startDate)
        .lte('log_date', endDate),
      supabase
        .from('food_diary')
        .select('*')
        .eq('trainee_id', traineeId)
        .gte('diary_date', startDate)
        .lte('diary_date', endDate),
    ]);

  return {
    meals: meals || [],
    waterLogs: waterLogs || [],
    diaryEntries: diaryEntries || [],
  };
}

