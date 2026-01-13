/*
  # Add Nutritional Information to Meals Table
  
  1. Changes
    - Add `calories` (integer) - calories in the meal
    - Add `protein` (integer) - protein in grams
    - Add `carbs` (integer) - carbs in grams
    - Add `fat` (integer) - fat in grams
  
  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meals' AND column_name = 'calories'
  ) THEN
    ALTER TABLE meals ADD COLUMN calories integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meals' AND column_name = 'protein'
  ) THEN
    ALTER TABLE meals ADD COLUMN protein integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meals' AND column_name = 'carbs'
  ) THEN
    ALTER TABLE meals ADD COLUMN carbs integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meals' AND column_name = 'fat'
  ) THEN
    ALTER TABLE meals ADD COLUMN fat integer;
  END IF;
END $$;
