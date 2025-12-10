/*
  # Fix Trainee SELECT Policies for Daily Log and Meals
  
  1. Overview
    - Add missing SELECT policy for daily_log for trainees
    - Fix meals SELECT policy to use get_current_trainee_id() for consistency
    
  2. Security
    - Trainees can only view their own data
    - Uses get_current_trainee_id() to avoid circular dependencies
*/

-- Daily log - trainee can select their own water tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_log' 
    AND policyname = 'trainee_select_own_daily_log_v2'
  ) THEN
    CREATE POLICY "trainee_select_own_daily_log_v2"
      ON daily_log
      FOR SELECT
      TO authenticated
      USING (trainee_id = get_current_trainee_id());
  END IF;
END $$;

-- Drop old inconsistent meals SELECT policy and create new one
DROP POLICY IF EXISTS "trainee_select_own_meals" ON meals;

CREATE POLICY "trainee_select_own_meals_v2"
  ON meals
  FOR SELECT
  TO authenticated
  USING (trainee_id = get_current_trainee_id());
