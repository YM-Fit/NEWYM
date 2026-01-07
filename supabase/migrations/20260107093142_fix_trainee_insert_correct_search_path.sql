/*
  # Fix trainee workout insert - correct search path for auth schema
  
  1. Problem
    - Function has empty search_path which prevents finding auth.uid()
    
  2. Solution
    - Set proper search_path including auth schema
*/

-- Drop existing policy and function
DROP POLICY IF EXISTS "trainee_can_insert_self_workouts" ON workouts;
DROP FUNCTION IF EXISTS public.check_is_trainee_for_insert();

-- Create function with correct search path
CREATE OR REPLACE FUNCTION public.check_is_trainee_for_insert()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_id uuid;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.trainee_auth 
    WHERE auth_user_id = user_id
  );
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.check_is_trainee_for_insert() TO authenticated;

-- Create policy
CREATE POLICY "trainee_can_insert_self_workouts"
  ON workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_trainee_for_insert());
