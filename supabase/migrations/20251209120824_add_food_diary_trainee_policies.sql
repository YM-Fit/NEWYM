/*
  # Add Food Diary RLS Policies for Trainees

  1. Changes
    - Add trainee_id column to food_diary_meals for direct trainee access
    - Add RLS policies for trainees to manage their own food diary
    - Add RLS policies for trainees to manage their water intake

  2. Security
    - Trainees can only access their own data
    - Trainers can view their trainees' data
*/

-- Add trainee_id to food_diary_meals if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_diary_meals' AND column_name = 'trainee_id'
  ) THEN
    ALTER TABLE food_diary_meals ADD COLUMN trainee_id uuid REFERENCES trainees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add target_ml column to daily_water_intake if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_water_intake' AND column_name = 'target_ml'
  ) THEN
    ALTER TABLE daily_water_intake ADD COLUMN target_ml integer DEFAULT 2000;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Trainers can view trainees food diary" ON food_diary;
DROP POLICY IF EXISTS "Trainees can view own food diary" ON food_diary;
DROP POLICY IF EXISTS "Trainees can insert own food diary" ON food_diary;
DROP POLICY IF EXISTS "Trainees can update own food diary" ON food_diary;

DROP POLICY IF EXISTS "Trainers can view trainees meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainees can view own meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainees can insert own meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainees can update own meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainees can delete own meals" ON food_diary_meals;

DROP POLICY IF EXISTS "Trainers can view trainees water intake" ON daily_water_intake;
DROP POLICY IF EXISTS "Trainees can view own water intake" ON daily_water_intake;
DROP POLICY IF EXISTS "Trainees can insert own water intake" ON daily_water_intake;
DROP POLICY IF EXISTS "Trainees can update own water intake" ON daily_water_intake;

-- RLS Policies for food_diary
CREATE POLICY "Trainers can view trainees food diary"
  ON food_diary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees t
      WHERE t.id = food_diary.trainee_id
      AND t.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can view own food diary"
  ON food_diary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = food_diary.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can insert own food diary"
  ON food_diary FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = food_diary.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can update own food diary"
  ON food_diary FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = food_diary.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = food_diary.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );

-- RLS Policies for food_diary_meals
CREATE POLICY "Trainers can view trainees meals"
  ON food_diary_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM food_diary fd
      JOIN trainees t ON t.id = fd.trainee_id
      WHERE fd.id = food_diary_meals.diary_id
      AND t.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can view own meals"
  ON food_diary_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM food_diary fd
      JOIN trainee_auth ta ON ta.trainee_id = fd.trainee_id
      WHERE fd.id = food_diary_meals.diary_id
      AND ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can insert own meals"
  ON food_diary_meals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM food_diary fd
      JOIN trainee_auth ta ON ta.trainee_id = fd.trainee_id
      WHERE fd.id = food_diary_meals.diary_id
      AND ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can update own meals"
  ON food_diary_meals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM food_diary fd
      JOIN trainee_auth ta ON ta.trainee_id = fd.trainee_id
      WHERE fd.id = food_diary_meals.diary_id
      AND ta.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM food_diary fd
      JOIN trainee_auth ta ON ta.trainee_id = fd.trainee_id
      WHERE fd.id = food_diary_meals.diary_id
      AND ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can delete own meals"
  ON food_diary_meals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM food_diary fd
      JOIN trainee_auth ta ON ta.trainee_id = fd.trainee_id
      WHERE fd.id = food_diary_meals.diary_id
      AND ta.auth_user_id = auth.uid()
    )
  );

-- RLS Policies for daily_water_intake
CREATE POLICY "Trainers can view trainees water intake"
  ON daily_water_intake FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees t
      WHERE t.id = daily_water_intake.trainee_id
      AND t.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can view own water intake"
  ON daily_water_intake FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = daily_water_intake.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can insert own water intake"
  ON daily_water_intake FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = daily_water_intake.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can update own water intake"
  ON daily_water_intake FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = daily_water_intake.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = daily_water_intake.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_food_diary_trainee_date ON food_diary(trainee_id, diary_date);
CREATE INDEX IF NOT EXISTS idx_food_diary_meals_diary ON food_diary_meals(diary_id);
CREATE INDEX IF NOT EXISTS idx_daily_water_intake_trainee_date ON daily_water_intake(trainee_id, intake_date);
