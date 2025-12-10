/*
  # Drop Unused and Duplicate Indexes

  1. Changes
    - Drop unused indexes that are not being utilized by queries
    - Drop duplicate indexes to reduce storage overhead
    
  2. Performance Impact
    - Reduces storage requirements
    - Speeds up INSERT/UPDATE/DELETE operations
    - Maintains query performance by keeping necessary indexes
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_trainee_self_weights_date;
DROP INDEX IF EXISTS idx_meal_plan_meals_plan;
DROP INDEX IF EXISTS idx_mental_tools_trainer;
DROP INDEX IF EXISTS idx_mental_tools_category;
DROP INDEX IF EXISTS idx_food_diary_completed;
DROP INDEX IF EXISTS idx_scale_readings_created_at;
DROP INDEX IF EXISTS idx_workout_templates_created_at;
DROP INDEX IF EXISTS idx_food_diary_trainee_date;
DROP INDEX IF EXISTS idx_daily_water_trainee_date;
DROP INDEX IF EXISTS idx_food_diary_meals_diary;
DROP INDEX IF EXISTS idx_workout_plan_exercises_equipment;
DROP INDEX IF EXISTS idx_workout_plan_exercises_superset_exercise;
DROP INDEX IF EXISTS idx_workout_plan_exercises_superset_equipment;
DROP INDEX IF EXISTS idx_food_diary_unseen;

-- Drop duplicate index (keeping idx_daily_water_intake_trainee_date)
DROP INDEX IF EXISTS idx_daily_water_trainee_date;
