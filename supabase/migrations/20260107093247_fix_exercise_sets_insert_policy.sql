/*
  # Fix exercise_sets INSERT policy for trainees
  
  1. Problem
    - Policy accesses trainee_auth with RLS causing issues
    
  2. Solution
    - Create SECURITY DEFINER function
    - Use function in policy
*/

-- Drop existing trainee policy
DROP POLICY IF EXISTS "trainee_can_insert_exercise_sets" ON exercise_sets;

-- Create helper function
CREATE OR REPLACE FUNCTION public.check_trainee_can_insert_exercise_set(p_workout_exercise_id uuid)
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
    SELECT 1 
    FROM public.workout_exercises we
    JOIN public.workouts w ON w.id = we.workout_id
    JOIN public.workout_trainees wt ON wt.workout_id = w.id
    JOIN public.trainee_auth ta ON ta.trainee_id = wt.trainee_id
    WHERE we.id = p_workout_exercise_id 
    AND ta.auth_user_id = user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_trainee_can_insert_exercise_set(uuid) TO authenticated;

-- Create new policy
CREATE POLICY "trainee_can_insert_exercise_sets"
  ON exercise_sets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.check_trainee_can_insert_exercise_set(workout_exercise_id));
