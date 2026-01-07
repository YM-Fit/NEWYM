/*
  # Test: Simple INSERT policy for debugging
  
  Temporary policy to test if the issue is with the function or something else
*/

-- Drop existing policy
DROP POLICY IF EXISTS "trainee_can_insert_self_workouts" ON workouts;

-- Create very simple policy - any authenticated user can insert
CREATE POLICY "trainee_can_insert_self_workouts"
  ON workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
