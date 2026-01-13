/*
  # Fix trainee workout insert - bypass RLS with SECURITY DEFINER function
  
  1. Problem
    - Direct subquery in policy is subject to RLS on trainee_auth table
    - This creates circular dependency issues
    
  2. Solution
    - Create SECURITY DEFINER function that bypasses RLS
    - Use this function in the policy
*/

-- Drop existing policy first
DROP POLICY IF EXISTS "trainee_can_insert_self_workouts" ON workouts;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.check_is_trainee_for_insert();

-- Create function that bypasses RLS (SECURITY DEFINER runs as function owner)
CREATE OR REPLACE FUNCTION public.check_is_trainee_for_insert()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainee_auth 
    WHERE auth_user_id = (SELECT auth.uid())
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_is_trainee_for_insert() TO authenticated;

-- Create policy using the function
CREATE POLICY "trainee_can_insert_self_workouts"
  ON workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_trainee_for_insert());
