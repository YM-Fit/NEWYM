/*
  # Fix trainee workout insert - recreate function with plpgsql
  
  1. Problem
    - The SQL function may not properly access auth.uid() in SECURITY DEFINER context
    
  2. Solution
    - Drop policy first, then recreate function using plpgsql
    - Recreate policy with new function
*/

-- Drop policy first
DROP POLICY IF EXISTS "trainee_can_insert_self_workouts" ON workouts;

-- Drop and recreate function with plpgsql
DROP FUNCTION IF EXISTS public.is_current_user_trainee();

CREATE OR REPLACE FUNCTION public.is_current_user_trainee()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'auth', 'pg_temp'
AS $$
DECLARE
  current_uid uuid;
  result boolean;
BEGIN
  current_uid := auth.uid();
  
  SELECT EXISTS (
    SELECT 1 FROM public.trainee_auth 
    WHERE auth_user_id = current_uid
  ) INTO result;
  
  RETURN COALESCE(result, false);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_current_user_trainee() TO authenticated;

-- Recreate policy
CREATE POLICY "trainee_can_insert_self_workouts"
  ON workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_trainee());
