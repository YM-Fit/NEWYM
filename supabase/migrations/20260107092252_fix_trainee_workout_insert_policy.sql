/*
  # Fix trainee workout insert policy

  1. Problem
    - The trainee INSERT policy on workouts uses a subquery on trainee_auth
    - Even with RLS policy allowing trainees to read their own record,
      the subquery context may still be affected
    
  2. Solution
    - Create a SECURITY DEFINER function to check if current user is a trainee
    - Update the policy to use this function
*/

-- Create a function that checks if current auth user is a trainee (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_current_user_trainee()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trainee_auth 
    WHERE auth_user_id = auth.uid()
  );
$$;

-- Drop the old policy
DROP POLICY IF EXISTS "trainee_can_insert_self_workouts" ON workouts;

-- Create new policy using the SECURITY DEFINER function
CREATE POLICY "trainee_can_insert_self_workouts"
  ON workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_trainee());
