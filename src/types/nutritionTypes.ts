export interface MealPlan {
  id: string;
  trainee_id: string;
  trainer_id?: string;
  name: string | null;
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

export interface MealPlanMeal {
  id: string;
  plan_id: string;
  meal_time: string;
  meal_name: string;
  description: string;
  alternatives?: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes?: string;
  order_index: number;
}

export interface TraineeMeal {
  id: string;
  trainee_id: string;
  meal_date: string;
  meal_type: string;
  meal_time: string | null;
  description: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface DailyWaterLog {
  id: string;
  trainee_id: string;
  log_date: string;
  water_ml: number;
}

export interface FoodDiaryEntry {
  id: string;
  trainee_id: string;
  diary_date: string;
  completed: boolean;
  completed_at: string | null;
  is_seen_by_trainer?: boolean;
}

export interface WeekDiaryData {
  meals: TraineeMeal[];
  waterLogs: DailyWaterLog[];
  diaryEntries: FoodDiaryEntry[];
}

