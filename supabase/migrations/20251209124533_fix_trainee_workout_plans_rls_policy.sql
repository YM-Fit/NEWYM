/*
  # Fix Trainee Workout Plans RLS Policy
  
  1. Changes
    - Drop incorrect trainee policy that checks trainee_id = auth.uid()
    - Create correct policy that uses trainee_auth table to match auth_user_id
  
  2. Security
    - Trainees can only view their own workout plans via trainee_auth lookup
    - Trainers can still manage all plans for their trainees
*/

-- Drop the incorrect policy
DROP POLICY IF EXISTS "trainees_view_own_workout_plans" ON trainee_workout_plans;

-- Create correct policy for trainees
CREATE POLICY "trainee_select_own_workout_plans"
  ON trainee_workout_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = trainee_workout_plans.trainee_id
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );
