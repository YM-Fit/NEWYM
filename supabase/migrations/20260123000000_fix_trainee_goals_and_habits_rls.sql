/*
  # Fix Trainee Goals and Habits RLS Policies
  
  This migration:
  1. Creates food_diary table if it doesn't exist (was missing!)
  2. Creates food_diary_meals table if it doesn't exist
  3. Adds INSERT policy for trainees on trainee_goals table
  4. Ensures trainee_habits and habit_logs tables exist with proper RLS
  5. Adds INSERT policy for trainees on trainee_habits table
*/

-- ============================================
-- 1. FOOD_DIARY - Create table if it doesn't exist
-- ============================================

-- Create food_diary table if it doesn't exist
CREATE TABLE IF NOT EXISTS food_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  diary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_seen_by_trainer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trainee_id, diary_date)
);

CREATE INDEX IF NOT EXISTS idx_food_diary_trainee_date ON food_diary(trainee_id, diary_date);
CREATE INDEX IF NOT EXISTS idx_food_diary_completed ON food_diary(trainee_id, completed, diary_date DESC);
CREATE INDEX IF NOT EXISTS idx_food_diary_trainer_view ON food_diary(trainee_id, diary_date DESC, completed);

-- Enable RLS
ALTER TABLE food_diary ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Trainers can view trainees food diary" ON food_diary;
DROP POLICY IF EXISTS "Trainees can view own food diary" ON food_diary;
DROP POLICY IF EXISTS "Trainees can insert own food diary" ON food_diary;
DROP POLICY IF EXISTS "Trainees can update own food diary" ON food_diary;

-- Trainers can view trainees food diary
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

-- Trainees can view own food diary
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

-- Trainees can insert own food diary
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

-- Trainees can update own food diary
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

-- ============================================
-- 2. FOOD_DIARY_MEALS - Create table if it doesn't exist
-- ============================================

-- Create food_diary_meals table if it doesn't exist
CREATE TABLE IF NOT EXISTS food_diary_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES food_diary(id) ON DELETE CASCADE,
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  meal_type VARCHAR(20) NOT NULL,
  meal_time TIME,
  description TEXT,
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_diary_meals_diary ON food_diary_meals(diary_id);
CREATE INDEX IF NOT EXISTS idx_food_diary_meals_trainee ON food_diary_meals(trainee_id);

-- Enable RLS
ALTER TABLE food_diary_meals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Trainers can view trainees meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainees can view own meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainees can insert own meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainees can update own meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainees can delete own meals" ON food_diary_meals;

-- Trainers can view trainees meals
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

-- Trainees can view own meals
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

-- Trainees can insert own meals
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

-- Trainees can update own meals
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

-- Trainees can delete own meals
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

-- ============================================
-- 3. TRAINEE_GOALS - Add INSERT policy for trainees
-- ============================================

-- Add INSERT policy for trainees (currently only SELECT is allowed)
-- Drop existing policy if it exists first
DROP POLICY IF EXISTS "Trainees can insert their own goals" ON trainee_goals;

CREATE POLICY "Trainees can insert their own goals"
  ON trainee_goals FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth ta 
      WHERE ta.trainee_id = trainee_goals.trainee_id 
      AND ta.auth_user_id = auth.uid()
    )
  );

-- Add UPDATE policy for trainees (to allow updating their own goals)
-- Drop existing policy if it exists first
DROP POLICY IF EXISTS "Trainees can update their own goals" ON trainee_goals;

CREATE POLICY "Trainees can update their own goals"
  ON trainee_goals FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta 
      WHERE ta.trainee_id = trainee_goals.trainee_id 
      AND ta.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth ta 
      WHERE ta.trainee_id = trainee_goals.trainee_id 
      AND ta.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 4. TRAINEE_HABITS - Ensure table exists and add INSERT policy
-- ============================================

-- Create trainee_habits table if it doesn't exist
CREATE TABLE IF NOT EXISTS trainee_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  habit_name VARCHAR(100) NOT NULL,
  habit_type VARCHAR(50) NOT NULL CHECK (habit_type IN ('water', 'steps', 'sleep', 'nutrition', 'custom')),
  target_value DECIMAL(10,2),
  unit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainee_habits_trainee_id ON trainee_habits(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_habits_is_active ON trainee_habits(is_active);

-- Enable RLS
ALTER TABLE trainee_habits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Trainers can manage their trainees habits" ON trainee_habits;
DROP POLICY IF EXISTS "Trainees can view their own habits" ON trainee_habits;
DROP POLICY IF EXISTS "Trainees can update their own habits" ON trainee_habits;
DROP POLICY IF EXISTS "Trainees can insert their own habits" ON trainee_habits;

-- Trainers can manage their trainees habits
CREATE POLICY "Trainers can manage their trainees habits"
  ON trainee_habits FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_habits.trainee_id AND t.trainer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_habits.trainee_id AND t.trainer_id = auth.uid())
  );

-- Trainees can view their own habits
CREATE POLICY "Trainees can view their own habits"
  ON trainee_habits FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_habits.trainee_id AND ta.auth_user_id = auth.uid())
  );

-- Trainees can insert their own habits
CREATE POLICY "Trainees can insert their own habits"
  ON trainee_habits FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_habits.trainee_id AND ta.auth_user_id = auth.uid())
  );

-- Trainees can update their own habits
CREATE POLICY "Trainees can update their own habits"
  ON trainee_habits FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_habits.trainee_id AND ta.auth_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_habits.trainee_id AND ta.auth_user_id = auth.uid())
  );

-- ============================================
-- 5. HABIT_LOGS - Ensure table exists with proper RLS
-- ============================================

-- Create habit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES trainee_habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  actual_value DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_log_date ON habit_logs(log_date);

-- Enable RLS
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Trainers can view their trainees habit logs" ON habit_logs;
DROP POLICY IF EXISTS "Trainers can insert habit logs for their trainees" ON habit_logs;
DROP POLICY IF EXISTS "Trainees can manage their own habit logs" ON habit_logs;

-- Trainers can view their trainees habit logs
CREATE POLICY "Trainers can view their trainees habit logs"
  ON habit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_habits th
      JOIN trainees t ON t.id = th.trainee_id
      WHERE th.id = habit_logs.habit_id AND t.trainer_id = auth.uid()
    )
  );

-- Trainers can insert habit logs for their trainees
CREATE POLICY "Trainers can insert habit logs for their trainees"
  ON habit_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_habits th
      JOIN trainees t ON t.id = th.trainee_id
      WHERE th.id = habit_logs.habit_id AND t.trainer_id = auth.uid()
    )
  );

-- Trainees can manage their own habit logs
CREATE POLICY "Trainees can manage their own habit logs"
  ON habit_logs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_habits th
      JOIN trainee_auth ta ON ta.trainee_id = th.trainee_id
      WHERE th.id = habit_logs.habit_id AND ta.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_habits th
      JOIN trainee_auth ta ON ta.trainee_id = th.trainee_id
      WHERE th.id = habit_logs.habit_id AND ta.auth_user_id = auth.uid()
    )
  );
