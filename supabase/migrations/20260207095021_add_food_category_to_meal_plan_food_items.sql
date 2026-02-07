/*
  # Add food category tracking to meal plan food items

  1. Modified Tables
    - `meal_plan_food_items`
      - Added `category` (text) - food category: 'protein', 'fat', 'carb'
      - Added `calories_per_100g` (decimal) - reference nutritional value per 100g
      - Added `protein_per_100g` (decimal) - reference protein per 100g
      - Added `carbs_per_100g` (decimal) - reference carbs per 100g
      - Added `fat_per_100g` (decimal) - reference fat per 100g

  2. Purpose
    - Track food category for alternatives system
    - Store per-100g reference values for auto-calculation
    - Enable finding food substitutes in the same category
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plan_food_items' AND column_name = 'category'
  ) THEN
    ALTER TABLE meal_plan_food_items ADD COLUMN category text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plan_food_items' AND column_name = 'calories_per_100g'
  ) THEN
    ALTER TABLE meal_plan_food_items ADD COLUMN calories_per_100g decimal(10,2) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plan_food_items' AND column_name = 'protein_per_100g'
  ) THEN
    ALTER TABLE meal_plan_food_items ADD COLUMN protein_per_100g decimal(10,2) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plan_food_items' AND column_name = 'carbs_per_100g'
  ) THEN
    ALTER TABLE meal_plan_food_items ADD COLUMN carbs_per_100g decimal(10,2) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plan_food_items' AND column_name = 'fat_per_100g'
  ) THEN
    ALTER TABLE meal_plan_food_items ADD COLUMN fat_per_100g decimal(10,2) DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_plan_food_items_category
  ON meal_plan_food_items (category)
  WHERE category IS NOT NULL;
