/*
  # Add Trainee Self-Read Policy to Trainees Table

  1. Problem
    - trainees table only has policies for trainers (trainer_id = auth.uid())
    - When trainee logs in via edge function, they need to read their own data
    - trainee_login function queries: SELECT ... FROM trainees WHERE id = traineeId
    - RLS blocks this because no policy allows trainee to read their own data
    
  2. Solution
    - Add SELECT policy for trainees to read their own data
    - Policy checks trainee_auth table to verify auth.uid() matches their trainee_id
    - This is safe - trainee can only see their own record
    
  3. Security
    - Trainers: Can see all their trainees (trainer_id = auth.uid())
    - Trainees: Can only see their own data (via trainee_auth.auth_user_id = auth.uid())
*/

-- Add policy for trainees to read their own data
CREATE POLICY "trainee_select_own_data"
  ON trainees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = trainees.id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );
