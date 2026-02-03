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

export interface NutritionFoodItem {
  id: string;
  meal_id: string;
  food_name: string;
  quantity: number;
  unit: string; // 'g' (גרם), 'unit' (יחידות), 'ml' (מיליליטר), 'cup' (כוס), etc.
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  order_index: number;
  created_at?: string;
}

export interface MealPlanMeal {
  id: string;
  plan_id: string;
  meal_time: string;
  meal_name: string;
  description: string; // שדה זה ישמש כהערה כללית לארוחה (אופציונלי)
  alternatives?: string;
  notes?: string;
  order_index: number;
  // פריטי המזון יטענו בנפרד
  food_items?: NutritionFoodItem[];
  // ערכים תזונתיים כוללים (מחושבים מכל פריטי המזון)
  total_calories?: number | null;
  total_protein?: number | null;
  total_carbs?: number | null;
  total_fat?: number | null;
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

// =============================================
// FOOD DATABASE TYPES
// =============================================

export type FoodCategory = 'protein' | 'carbs' | 'fat';

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  brand: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  sugar_per_100g?: number;
  sodium_per_100g?: number;
  is_protein_enriched: boolean;
  default_unit_id?: string;
  default_serving_grams?: number;
  serving_description?: string;
  is_verified: boolean;
  is_common: boolean;
  trainer_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type UnitCategory = 'weight' | 'volume' | 'piece' | 'serving';

export interface UnitType {
  id: string;
  name_he: string;
  name_en: string | null;
  abbreviation: string | null;
  base_grams: number | null;
  base_ml: number | null;
  unit_category: UnitCategory;
  display_order: number;
}

export interface FoodUnitConversion {
  id: string;
  food_id: string;
  unit_type_id: string;
  grams_per_unit: number;
  is_default: boolean;
  display_order: number;
  // Joined data
  unit_type?: UnitType;
}

export interface FavoriteFood {
  id: string;
  trainer_id: string;
  food_id: string;
  created_at: string;
  // Joined data
  food?: Food;
}

export interface FoodUsageHistory {
  id: string;
  trainer_id: string;
  food_id: string;
  last_used_at: string;
  usage_count: number;
  // Joined data
  food?: Food;
}

// =============================================
// FOOD SEARCH & CALCULATION TYPES
// =============================================

export interface FoodSearchResult extends Food {
  default_unit?: UnitType;
  available_units?: FoodUnitConversion[];
}

export interface SelectedFood {
  food: Food;
  quantity: number;
  unit: UnitType;
  grams: number;
  // Calculated values
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionCalculation {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface FoodAlternative {
  food: Food;
  reason: string; // "פחות שומן", "יותר חלבון", "פחות קלוריות"
  comparison: {
    calories_diff: number;
    protein_diff: number;
    carbs_diff: number;
    fat_diff: number;
  };
}

