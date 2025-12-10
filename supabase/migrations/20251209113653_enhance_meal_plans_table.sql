/*
  # Enhance Meal Plans Table
  
  1. Changes to `meal_plans` table
    - Add `daily_calories` (integer) - daily calorie target
    - Add `daily_water_ml` (integer) - daily water intake target in ml
    - Add `protein_grams` (integer) - daily protein target
    - Add `carbs_grams` (integer) - daily carbs target
    - Add `fat_grams` (integer) - daily fat target
    - Add `notes` (text) - general notes for the plan
    - Add `description` (text) - plan description
    - Add `updated_at` (timestamp) - last update time
  
  2. Security
    - All existing RLS policies remain in place
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'daily_calories'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN daily_calories integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'daily_water_ml'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN daily_water_ml integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'protein_grams'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN protein_grams integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'carbs_grams'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN carbs_grams integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'fat_grams'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN fat_grams integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'notes'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'description'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN updated_at timestamp DEFAULT now();
  END IF;
END $$;
