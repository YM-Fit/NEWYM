import { supabase } from '../lib/supabase';
import type {
  MealPlan,
  MealPlanMeal,
  NutritionFoodItem,
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

  // Load food items for each meal
  const mealsWithFoodItems = await Promise.all(
    (meals || []).map(async (meal) => {
      const { data: foodItems } = await supabase
        .from('meal_plan_food_items')
        .select('*')
        .eq('meal_id', meal.id)
        .order('order_index', { ascending: true });

      // Calculate totals from food items
      const totals = (foodItems || []).reduce(
        (acc, item) => ({
          calories: acc.calories + (item.calories || 0),
          protein: acc.protein + (item.protein || 0),
          carbs: acc.carbs + (item.carbs || 0),
          fat: acc.fat + (item.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      return {
        ...meal,
        food_items: foodItems || [],
        total_calories: totals.calories || null,
        total_protein: totals.protein || null,
        total_carbs: totals.carbs || null,
        total_fat: totals.fat || null,
      };
    })
  );

  return { plan, meals: mealsWithFoodItems };
}

export async function createFoodItem(
  mealId: string,
  foodItem: Omit<NutritionFoodItem, 'id' | 'meal_id' | 'created_at'>
): Promise<NutritionFoodItem | null> {
  const { data, error } = await supabase
    .from('meal_plan_food_items')
    .insert({
      meal_id: mealId,
      ...foodItem,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating food item:', error);
    return null;
  }

  return data;
}

export async function updateFoodItem(
  foodItemId: string,
  updates: Partial<Omit<NutritionFoodItem, 'id' | 'meal_id' | 'created_at'>>
): Promise<NutritionFoodItem | null> {
  const { data, error } = await supabase
    .from('meal_plan_food_items')
    .update(updates)
    .eq('id', foodItemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating food item:', error);
    return null;
  }

  return data;
}

export async function deleteFoodItem(foodItemId: string): Promise<boolean> {
  const { error } = await supabase
    .from('meal_plan_food_items')
    .delete()
    .eq('id', foodItemId);

  if (error) {
    console.error('Error deleting food item:', error);
    return false;
  }

  return true;
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

