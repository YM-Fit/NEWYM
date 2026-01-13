/*
  # Allow trainees to access their own trainee_auth record

  1. Problem
    - The RLS policy on workouts checks: EXISTS (SELECT 1 FROM trainee_auth WHERE auth_user_id = auth.uid())
    - But trainee_auth RLS only allows trainers to read, not trainees themselves
    - This causes the workouts INSERT policy to fail

  2. Solution
    - Add SELECT policy for trainees to see their own trainee_auth record
    - This allows the workouts policy subquery to work correctly
*/

-- Allow trainees to read their own trainee_auth record
CREATE POLICY "trainee_select_own_auth"
  ON trainee_auth
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());
