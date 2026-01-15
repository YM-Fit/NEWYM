import type { NutritionFoodItem } from '../../../../types/nutritionTypes';

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
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string;
  order_index: number;
  food_items?: NutritionFoodItem[];
  total_calories?: number | null;
  total_protein?: number | null;
  total_carbs?: number | null;
  total_fat?: number | null;
}

export interface MealPlan {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  daily_calories: number | null;
  daily_water_ml: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
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
