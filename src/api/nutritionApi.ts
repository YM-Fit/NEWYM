import { supabase } from '../lib/supabase';
import type {
  MealPlan,
  MealPlanMeal,
  NutritionFoodItem,
  WeekDiaryData,
} from '../types/nutritionTypes';
import { rateLimiter } from '../utils/rateLimiter';

export async function getActiveMealPlanWithMeals(
  traineeId: string
): Promise<{ plan: MealPlan | null; meals: MealPlanMeal[] }> {
  // Rate limiting: 100 requests per minute per trainee
  const rateLimitKey = `getActiveMealPlan:${traineeId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 100, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }

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
    .eq('plan_id', (plan as { id: string }).id)
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
  // Rate limiting: 50 requests per minute per meal
  const rateLimitKey = `createFoodItem:${mealId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 50, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }

  const { data, error } = await supabase
    .from('meal_plan_food_items')
    .insert({
      meal_id: mealId,
      ...foodItem,
    } as never)
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
  // Rate limiting: 50 requests per minute per food item
  const rateLimitKey = `updateFoodItem:${foodItemId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 50, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }

  const { data, error } = await supabase
    .from('meal_plan_food_items')
    .update(updates as never)
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
  // Rate limiting: 20 requests per minute per food item
  const rateLimitKey = `deleteFoodItem:${foodItemId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 20, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }

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
  // Rate limiting: 100 requests per minute per trainee
  const rateLimitKey = `getWeekDiaryData:${traineeId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 100, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }

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

/**
 * Get plan by ID with all meals and food items (for copying)
 */
export async function getMealPlanById(
  planId: string
): Promise<{
  plan: MealPlan | null;
  meals: Array<MealPlanMeal & { food_items?: NutritionFoodItem[] }>;
} | null> {
  const rateLimitKey = `getMealPlanById:${planId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 50, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }

  const { data: plan, error: planError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  if (planError || !plan) {
    return null;
  }

  const { data: meals, error: mealsError } = await supabase
    .from('meal_plan_meals')
    .select('*')
    .eq('plan_id', planId)
    .order('order_index', { ascending: true });

  if (mealsError) {
    return { plan, meals: [] };
  }

  const mealsWithFoodItems = await Promise.all(
    (meals || []).map(async (meal) => {
      const { data: foodItems } = await supabase
        .from('meal_plan_food_items')
        .select('*')
        .eq('meal_id', meal.id)
        .order('order_index', { ascending: true });

      return {
        ...meal,
        food_items: foodItems || [],
      };
    })
  );

  return { plan, meals: mealsWithFoodItems };
}

/**
 * Copy meal plan to another trainee
 */
export async function copyMealPlanToTrainee(
  planId: string,
  targetTraineeId: string,
  trainerId: string,
  newName?: string
): Promise<MealPlan | null> {
  const rateLimitKey = `copyMealPlan:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 20, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }

  const data = await getMealPlanById(planId);
  if (!data || !data.plan) {
    return null;
  }

  const { plan: sourcePlan, meals: sourceMeals } = data;

  const { data: newPlan, error: planError } = await supabase
    .from('meal_plans')
    .insert({
      trainer_id: trainerId,
      trainee_id: targetTraineeId,
      name: newName || `${sourcePlan.name} (עותק)`,
      description: sourcePlan.description,
      is_active: false,
      daily_calories: sourcePlan.daily_calories,
      daily_water_ml: sourcePlan.daily_water_ml,
      protein_grams: sourcePlan.protein_grams,
      carbs_grams: sourcePlan.carbs_grams,
      fat_grams: sourcePlan.fat_grams,
      notes: sourcePlan.notes,
    } as never)
    .select()
    .single();

  if (planError || !newPlan) {
    console.error('Error creating copied plan:', planError);
    return null;
  }

  for (const meal of sourceMeals) {
    const { data: newMeal, error: mealError } = await supabase
      .from('meal_plan_meals')
      .insert({
        plan_id: newPlan.id,
        meal_time: meal.meal_time,
        meal_name: meal.meal_name,
        description: meal.description || '',
        alternatives: meal.alternatives || '',
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        notes: meal.notes || '',
        order_index: meal.order_index,
      } as never)
      .select()
      .single();

    if (mealError || !newMeal) {
      console.error('Error copying meal:', mealError);
      continue;
    }

    const foodItems = meal.food_items || [];
    for (const item of foodItems) {
      await supabase.from('meal_plan_food_items').insert({
        meal_id: newMeal.id,
        food_name: item.food_name,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        order_index: item.order_index,
        category: item.category,
        calories_per_100g: item.calories_per_100g,
        protein_per_100g: item.protein_per_100g,
        carbs_per_100g: item.carbs_per_100g,
        fat_per_100g: item.fat_per_100g,
      } as never);
    }
  }

  return newPlan;
}

