/*
  # Allow trainees to read trainers for FK validation
  
  1. Problem
    - FK constraint on workouts.trainer_id requires SELECT on trainers
    - Current RLS policy may not work correctly
    
  2. Solution
    - Add simpler policy allowing trainees to read their trainer
*/

-- Drop existing policy if it's not working
DROP POLICY IF EXISTS "trainee_can_view_own_trainer" ON trainers;

-- Create simpler policy using is_current_user_trainee
CREATE POLICY "trainee_can_view_own_trainer"
  ON trainers
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is a trainee connected to this trainer
    EXISTS (
      SELECT 1 FROM trainees t
      JOIN trainee_auth ta ON ta.trainee_id = t.id
      WHERE ta.auth_user_id = auth.uid()
      AND t.trainer_id = trainers.id
    )
  );
