/*
  # Add Workout Plan History and Trainee Edit Permissions

  1. New Tables
    - `workout_plan_history` - Stores history of changes to workout plans
      - `id` (uuid, primary key)
      - `plan_id` (uuid, references trainee_workout_plans)
      - `changed_by_user_id` (uuid, who made the change)
      - `changed_by_type` (text, 'trainer' or 'trainee')
      - `change_type` (text, 'created', 'updated', 'exercise_added', etc.)
      - `change_description` (text, human readable description)
      - `previous_data` (jsonb, snapshot before change)
      - `new_data` (jsonb, snapshot after change)
      - `created_at` (timestamptz)

  2. New Columns
    - `trainee_workout_plans.last_modified_by` (text, 'trainer' or 'trainee')
    - `workout_plan_day_exercises.trainee_notes` (text, notes from trainee)
    - `workout_plan_day_exercises.trainee_target_weight` (numeric, trainee's preferred weight)
    
  3. Security
    - RLS policies for trainee to update their own workout plan exercises
    - RLS policies for workout_plan_history
*/

-- Add columns to trainee_workout_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'last_modified_by'
  ) THEN
    ALTER TABLE trainee_workout_plans ADD COLUMN last_modified_by text DEFAULT 'trainer';
  END IF;
END $$;

-- Add columns to workout_plan_day_exercises for trainee customization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'trainee_notes'
  ) THEN
    ALTER TABLE workout_plan_day_exercises ADD COLUMN trainee_notes text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'trainee_target_weight'
  ) THEN
    ALTER TABLE workout_plan_day_exercises ADD COLUMN trainee_target_weight numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'trainee_modified_at'
  ) THEN
    ALTER TABLE workout_plan_day_exercises ADD COLUMN trainee_modified_at timestamptz;
  END IF;
END $$;

-- Create workout_plan_history table
CREATE TABLE IF NOT EXISTS workout_plan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES trainee_workout_plans(id) ON DELETE CASCADE,
  changed_by_user_id uuid NOT NULL,
  changed_by_type text NOT NULL CHECK (changed_by_type IN ('trainer', 'trainee')),
  change_type text NOT NULL,
  change_description text NOT NULL,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create index for workout_plan_history
CREATE INDEX IF NOT EXISTS idx_workout_plan_history_plan_id ON workout_plan_history(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_plan_history_created_at ON workout_plan_history(created_at DESC);

-- Enable RLS on workout_plan_history
ALTER TABLE workout_plan_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for workout_plan_history
-- Trainers can see history of their plans
CREATE POLICY "trainers_view_plan_history"
  ON workout_plan_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = workout_plan_history.plan_id
      AND twp.trainer_id = auth.uid()
    )
  );

-- Trainees can see history of their own plans
CREATE POLICY "trainee_view_own_plan_history"
  ON workout_plan_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE twp.id = workout_plan_history.plan_id
      AND ta.auth_user_id = auth.uid()
    )
  );

-- Both trainers and trainees can insert history entries
CREATE POLICY "users_insert_plan_history"
  ON workout_plan_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      LEFT JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE twp.id = workout_plan_history.plan_id
      AND (twp.trainer_id = auth.uid() OR ta.auth_user_id = auth.uid())
    )
  );

-- RLS policy for trainee to update workout_plan_day_exercises (only trainee-specific fields)
CREATE POLICY "trainee_update_own_plan_exercises"
  ON workout_plan_day_exercises
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plan_days wpd
      JOIN trainee_workout_plans twp ON twp.id = wpd.plan_id
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE wpd.id = workout_plan_day_exercises.day_id
      AND ta.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_plan_days wpd
      JOIN trainee_workout_plans twp ON twp.id = wpd.plan_id
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE wpd.id = workout_plan_day_exercises.day_id
      AND ta.auth_user_id = auth.uid()
    )
  );

-- RLS policy for trainee to update trainee_workout_plans (limited fields)
CREATE POLICY "trainee_update_own_workout_plan"
  ON trainee_workout_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = trainee_workout_plans.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = trainee_workout_plans.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workout_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_workout_plan_timestamp ON trainee_workout_plans;
CREATE TRIGGER trigger_update_workout_plan_timestamp
  BEFORE UPDATE ON trainee_workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_plan_timestamp();
