/*
  # Fix workout_trainees INSERT policy for trainees
  
  1. Problem
    - Policy accesses trainee_auth which has RLS, causing issues
    
  2. Solution
    - Create SECURITY DEFINER function to bypass RLS
    - Use function in policy
*/

-- Drop existing trainee policy
DROP POLICY IF EXISTS "trainee_can_insert_self_to_workout_trainees" ON workout_trainees;

-- Create helper function
CREATE OR REPLACE FUNCTION public.check_trainee_can_insert_workout_trainee(p_trainee_id uuid)
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
    AND trainee_id = p_trainee_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_trainee_can_insert_workout_trainee(uuid) TO authenticated;

-- Create new policy using function
CREATE POLICY "trainee_can_insert_self_to_workout_trainees"
  ON workout_trainees
  FOR INSERT
  TO authenticated
  WITH CHECK (public.check_trainee_can_insert_workout_trainee(trainee_id));
