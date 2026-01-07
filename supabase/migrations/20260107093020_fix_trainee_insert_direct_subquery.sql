/*
  # Fix trainee workout insert - use direct subquery instead of function
  
  1. Problem
    - SECURITY DEFINER function may have issues with auth context
    
  2. Solution
    - Use direct subquery in policy instead of function
    - This avoids any potential function context issues
*/

-- Drop existing policy
DROP POLICY IF EXISTS "trainee_can_insert_self_workouts" ON workouts;

-- Create policy with direct subquery
CREATE POLICY "trainee_can_insert_self_workouts"
  ON workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth 
      WHERE trainee_auth.auth_user_id = auth.uid()
    )
  );
