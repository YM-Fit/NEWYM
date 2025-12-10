/*
  # Fix All Workout Plan Tables RLS Policies
  
  1. Changes
    - Fix workout_plan_days policies to use trainee_auth
    - Fix workout_plan_day_exercises policies to use trainee_auth
  
  2. Security
    - Trainees can only view their own workout plan data via trainee_auth lookup
    - Trainers can still manage all plans for their trainees
*/

-- Fix workout_plan_days policies
DROP POLICY IF EXISTS "trainees_view_own_plan_days" ON workout_plan_days;

CREATE POLICY "trainee_select_own_plan_days"
  ON workout_plan_days
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_workout_plans twp
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE twp.id = workout_plan_days.plan_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- Fix workout_plan_day_exercises policies
DROP POLICY IF EXISTS "trainees_manage_own_plan_exercises" ON workout_plan_day_exercises;

CREATE POLICY "trainee_select_own_plan_exercises"
  ON workout_plan_day_exercises
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM workout_plan_days wpd
      JOIN trainee_workout_plans twp ON twp.id = wpd.plan_id
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE wpd.id = workout_plan_day_exercises.day_id
        AND ta.auth_user_id = auth.uid()
    )
  );
