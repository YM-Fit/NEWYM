import type { NutritionFoodItem, MealPlan as BaseMealPlan } from '../../../../types/nutritionTypes';

// Re-export MealPlan from nutritionTypes to avoid duplication
export type MealPlan = BaseMealPlan;

export interface MealPlanBuilderProps {
  traineeId: string;
  traineeName: string;
  trainerId: string;
  onBack: () => void;
}

export interface Meal {
  id?: string;
  plan_id?: string;
  meal_time: string;
  meal_name: string;
  description: string;
  alternatives: string;
  notes: string;
  order_index: number;
  food_items?: NutritionFoodItem[];
  // Calculated totals from food_items
  total_calories?: number | null;
  total_protein?: number | null;
  total_carbs?: number | null;
  total_fat?: number | null;
}

export interface MealPlanTemplate {
  id: string;
  name: string;
  description: string | null;
  daily_calories: number | null;
  daily_water_ml: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  meals: Meal[];
  created_at: string;
}

export interface NoteTemplate {
  id: string;
  title: string;
  content: string;
}

export interface HistoryEntry {
  id: string;
  change_description: string;
  changed_at: string;
  snapshot: any;
}
