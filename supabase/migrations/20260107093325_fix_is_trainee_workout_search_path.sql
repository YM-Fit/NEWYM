/*
  # Fix is_trainee_workout function search path
  
  1. Problem
    - Function missing auth in search_path, auth.uid() may not resolve
    
  2. Solution
    - Add auth to search_path
*/

CREATE OR REPLACE FUNCTION public.is_trainee_workout(workout_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_trainee_id uuid;
  v_count integer;
BEGIN
  SELECT trainee_id INTO v_trainee_id
  FROM trainee_auth
  WHERE auth_user_id = auth.uid();

  IF v_trainee_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM workout_trainees
  WHERE workout_id = workout_id_param
  AND trainee_id = v_trainee_id;

  RETURN v_count > 0;
END;
$$;
