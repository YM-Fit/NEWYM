/*
  # Simplify trainee workout insert policy
  
  1. Problem
    - SECURITY DEFINER function may still have issues
    
  2. Solution
    - Try simpler approach: allow any authenticated user to insert
    - Then verify trainee status in a simpler way
*/

-- Drop existing policy
DROP POLICY IF EXISTS "trainee_can_insert_self_workouts" ON workouts;

-- Create a simpler policy that checks trainee_auth directly
-- The key is that we need to bypass RLS on trainee_auth
-- Let's try with a policy that uses auth.uid() directly in a subquery

CREATE POLICY "trainee_can_insert_self_workouts"
  ON workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if user is a trainee by looking up trainee_auth
    -- Using SECURITY DEFINER function to bypass RLS
    public.is_current_user_trainee()
  );
