import { supabase } from '../lib/supabase';
import type {
  Food,
  FoodCategory,
  UnitType,
  FoodUnitConversion,
  FoodSearchResult,
  FoodAlternative,
  NutritionCalculation,
} from '../types/nutritionTypes';

// =============================================
// FOOD SEARCH
// =============================================

/**
 * Search foods by name, category, or brand
 */
export const searchFoods = async (
  query: string,
  options?: {
    category?: FoodCategory;
    trainerId?: string;
    limit?: number;
    includeTrainerFoods?: boolean;
  }
): Promise<FoodSearchResult[]> => {
  const { category, trainerId, limit = 20, includeTrainerFoods = true } = options || {};

  let queryBuilder = supabase
    .from('foods')
    .select('*')
    .order('is_common', { ascending: false })
    .order('is_verified', { ascending: false })
    .order('name')
    .limit(limit);

  // Search by name or brand
  if (query && query.trim()) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,brand.ilike.%${query}%`);
  }

  // Filter by category
  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  // Include trainer's custom foods
  if (includeTrainerFoods && trainerId) {
    queryBuilder = queryBuilder.or(`trainer_id.is.null,trainer_id.eq.${trainerId}`);
  } else {
    queryBuilder = queryBuilder.is('trainer_id', null);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error searching foods:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get a single food by ID
 */
export const getFoodById = async (foodId: string): Promise<Food | null> => {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('id', foodId)
    .single();

  if (error) {
    console.error('Error fetching food:', error);
    return null;
  }

  return data;
};

/**
 * Get foods by category
 */
export const getFoodsByCategory = async (
  category: FoodCategory,
  limit: number = 50
): Promise<Food[]> => {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('category', category)
    .order('is_common', { ascending: false })
    .order('name')
    .limit(limit);

  if (error) {
    console.error('Error fetching foods by category:', error);
    return [];
  }

  return data || [];
};

/**
 * Get common/popular foods
 */
export const getCommonFoods = async (limit: number = 20): Promise<Food[]> => {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('is_common', true)
    .order('name')
    .limit(limit);

  if (error) {
    console.error('Error fetching common foods:', error);
    return [];
  }

  return data || [];
};

// =============================================
// UNIT TYPES
// =============================================

/**
 * Get all unit types
 */
export const getUnitTypes = async (): Promise<UnitType[]> => {
  const { data, error } = await supabase
    .from('unit_types')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('Error fetching unit types:', error);
    return [];
  }

  return data || [];
};

/**
 * Get unit conversions for a specific food
 */
export const getFoodUnitConversions = async (
  foodId: string
): Promise<FoodUnitConversion[]> => {
  const { data, error } = await supabase
    .from('food_unit_conversions')
    .select(`
      *,
      unit_type:unit_types(*)
    `)
    .eq('food_id', foodId)
    .order('display_order');

  if (error) {
    console.error('Error fetching food unit conversions:', error);
    return [];
  }

  return data || [];
};

// =============================================
// NUTRITION CALCULATION
// =============================================

/**
 * Calculate nutrition values based on quantity and unit
 */
export const calculateNutrition = (
  food: Food,
  quantity: number,
  gramsPerUnit: number = 1
): NutritionCalculation => {
  const totalGrams = quantity * gramsPerUnit;
  const multiplier = totalGrams / 100;

  return {
    calories: Math.round(food.calories_per_100g * multiplier * 10) / 10,
    protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
    fat: Math.round(food.fat_per_100g * multiplier * 10) / 10,
    fiber: food.fiber_per_100g ? Math.round(food.fiber_per_100g * multiplier * 10) / 10 : undefined,
    sugar: food.sugar_per_100g ? Math.round(food.sugar_per_100g * multiplier * 10) / 10 : undefined,
    sodium: food.sodium_per_100g ? Math.round(food.sodium_per_100g * multiplier * 10) / 10 : undefined,
  };
};

/**
 * Convert quantity to grams based on unit type
 */
export const convertToGrams = (
  quantity: number,
  unitType: UnitType,
  foodConversion?: FoodUnitConversion
): number => {
  // If we have a specific food conversion, use it
  if (foodConversion) {
    return quantity * foodConversion.grams_per_unit;
  }

  // Otherwise use the unit's base grams
  if (unitType.base_grams) {
    return quantity * unitType.base_grams;
  }

  // For volume units without specific food conversion, estimate
  if (unitType.base_ml) {
    // Rough estimate: 1ml ≈ 1g for most foods
    return quantity * unitType.base_ml;
  }

  // Default: assume grams
  return quantity;
};

// =============================================
// ALTERNATIVES
// =============================================

/**
 * Find alternative foods based on the selected food
 */
export const findAlternatives = async (
  food: Food,
  type: 'similar' | 'lower_calories' | 'higher_protein' | 'lower_fat' = 'similar',
  limit: number = 5
): Promise<FoodAlternative[]> => {
  let queryBuilder = supabase
    .from('foods')
    .select('*')
    .eq('category', food.category)
    .neq('id', food.id)
    .limit(limit);

  switch (type) {
    case 'similar':
      // Foods with similar protein content (±20%)
      const minProtein = food.protein_per_100g * 0.8;
      const maxProtein = food.protein_per_100g * 1.2;
      queryBuilder = queryBuilder
        .gte('protein_per_100g', minProtein)
        .lte('protein_per_100g', maxProtein);
      break;

    case 'lower_calories':
      queryBuilder = queryBuilder
        .lt('calories_per_100g', food.calories_per_100g)
        .order('calories_per_100g', { ascending: true });
      break;

    case 'higher_protein':
      queryBuilder = queryBuilder
        .gt('protein_per_100g', food.protein_per_100g)
        .order('protein_per_100g', { ascending: false });
      break;

    case 'lower_fat':
      queryBuilder = queryBuilder
        .lt('fat_per_100g', food.fat_per_100g)
        .order('fat_per_100g', { ascending: true });
      break;
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error finding alternatives:', error);
    return [];
  }

  return (data || []).map((altFood) => ({
    food: altFood,
    reason: getAlternativeReason(food, altFood, type),
    comparison: {
      calories_diff: altFood.calories_per_100g - food.calories_per_100g,
      protein_diff: altFood.protein_per_100g - food.protein_per_100g,
      carbs_diff: altFood.carbs_per_100g - food.carbs_per_100g,
      fat_diff: altFood.fat_per_100g - food.fat_per_100g,
    },
  }));
};

const getAlternativeReason = (
  original: Food,
  alternative: Food,
  type: string
): string => {
  const reasons: string[] = [];

  if (alternative.calories_per_100g < original.calories_per_100g) {
    reasons.push('פחות קלוריות');
  }
  if (alternative.protein_per_100g > original.protein_per_100g) {
    reasons.push('יותר חלבון');
  }
  if (alternative.fat_per_100g < original.fat_per_100g) {
    reasons.push('פחות שומן');
  }
  if (alternative.carbs_per_100g < original.carbs_per_100g) {
    reasons.push('פחות פחמימות');
  }

  return reasons.length > 0 ? reasons.join(', ') : 'חלופה דומה';
};

// =============================================
// FAVORITES & HISTORY
// =============================================

/**
 * Add food to favorites
 */
export const addFavoriteFood = async (
  trainerId: string,
  foodId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('favorite_foods')
    .upsert({ trainer_id: trainerId, food_id: foodId });

  if (error) {
    console.error('Error adding favorite food:', error);
    return false;
  }

  return true;
};

/**
 * Remove food from favorites
 */
export const removeFavoriteFood = async (
  trainerId: string,
  foodId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('favorite_foods')
    .delete()
    .eq('trainer_id', trainerId)
    .eq('food_id', foodId);

  if (error) {
    console.error('Error removing favorite food:', error);
    return false;
  }

  return true;
};

/**
 * Get trainer's favorite foods
 */
export const getFavoriteFoods = async (trainerId: string): Promise<Food[]> => {
  const { data, error } = await supabase
    .from('favorite_foods')
    .select(`
      food:foods(*)
    `)
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorite foods:', error);
    return [];
  }

  return (data || []).map((item) => item.food as Food).filter(Boolean);
};

/**
 * Update food usage history
 */
export const updateFoodUsage = async (
  trainerId: string,
  foodId: string
): Promise<void> => {
  // Try to update existing record
  const { data: existing } = await supabase
    .from('food_usage_history')
    .select('usage_count')
    .eq('trainer_id', trainerId)
    .eq('food_id', foodId)
    .single();

  if (existing) {
    await supabase
      .from('food_usage_history')
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: existing.usage_count + 1,
      })
      .eq('trainer_id', trainerId)
      .eq('food_id', foodId);
  } else {
    await supabase.from('food_usage_history').insert({
      trainer_id: trainerId,
      food_id: foodId,
      usage_count: 1,
    });
  }
};

/**
 * Get recently used foods
 */
export const getRecentlyUsedFoods = async (
  trainerId: string,
  limit: number = 10
): Promise<Food[]> => {
  const { data, error } = await supabase
    .from('food_usage_history')
    .select(`
      food:foods(*)
    `)
    .eq('trainer_id', trainerId)
    .order('last_used_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent foods:', error);
    return [];
  }

  return (data || []).map((item) => item.food as Food).filter(Boolean);
};

// =============================================
// CUSTOM FOODS (TRAINER)
// =============================================

/**
 * Add a custom food (trainer only)
 */
export const addCustomFood = async (
  trainerId: string,
  food: Omit<Food, 'id' | 'created_at' | 'updated_at' | 'is_verified' | 'is_common' | 'trainer_id'>
): Promise<Food | null> => {
  const { data, error } = await supabase
    .from('foods')
    .insert({
      ...food,
      trainer_id: trainerId,
      is_verified: false,
      is_common: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding custom food:', error);
    return null;
  }

  return data;
};

/**
 * Update a custom food (trainer only)
 */
export const updateCustomFood = async (
  foodId: string,
  trainerId: string,
  updates: Partial<Food>
): Promise<Food | null> => {
  const { data, error } = await supabase
    .from('foods')
    .update(updates)
    .eq('id', foodId)
    .eq('trainer_id', trainerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating custom food:', error);
    return null;
  }

  return data;
};

/**
 * Delete a custom food (trainer only)
 */
export const deleteCustomFood = async (
  foodId: string,
  trainerId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('foods')
    .delete()
    .eq('id', foodId)
    .eq('trainer_id', trainerId);

  if (error) {
    console.error('Error deleting custom food:', error);
    return false;
  }

  return true;
};

/**
 * Get trainer's custom foods
 */
export const getCustomFoods = async (trainerId: string): Promise<Food[]> => {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('trainer_id', trainerId)
    .order('name');

  if (error) {
    console.error('Error fetching custom foods:', error);
    return [];
  }

  return data || [];
};
