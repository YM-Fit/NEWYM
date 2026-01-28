/*
  # Fix exercises INSERT policy to ensure it works correctly
  
  1. Problem
    - The current policy might not work correctly due to RLS on muscle_groups
    - Need to ensure trainers can add exercises to both global and their own muscle groups
    
  2. Solution
    - Use SECURITY DEFINER function to bypass RLS checks
    - Ensure the policy works for both global (trainer_id IS NULL) and trainer-specific groups
*/

-- Drop existing policy
DROP POLICY IF EXISTS "מאמנים יכולים להוסיף תרגילים" ON exercises;

-- Create helper function to check if user is trainer and muscle group exists
CREATE OR REPLACE FUNCTION public.check_trainer_can_insert_exercise(p_muscle_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_id uuid;
  is_trainer boolean;
  group_exists boolean;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is a trainer
  SELECT EXISTS (
    SELECT 1 FROM public.trainers
    WHERE trainers.id = user_id
  ) INTO is_trainer;
  
  IF NOT is_trainer THEN
    RETURN false;
  END IF;
  
  -- Check if muscle group exists (can be global or trainer-specific)
  SELECT EXISTS (
    SELECT 1 FROM public.muscle_groups
    WHERE muscle_groups.id = p_muscle_group_id
  ) INTO group_exists;
  
  RETURN group_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_trainer_can_insert_exercise(uuid) TO authenticated;

-- Create new policy using the function
CREATE POLICY "מאמנים יכולים להוסיף תרגילים"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (public.check_trainer_can_insert_exercise(exercises.muscle_group_id));
