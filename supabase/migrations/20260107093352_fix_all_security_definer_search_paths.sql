/*
  # Fix all SECURITY DEFINER functions search paths
  
  1. Problem
    - Multiple functions missing auth in search_path
    - auth.uid() may not resolve correctly
    
  2. Solution
    - Add auth to search_path for all functions using auth.uid()
*/

-- Fix can_trainee_create_notification
CREATE OR REPLACE FUNCTION public.can_trainee_create_notification(p_trainee_id uuid, p_trainer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM trainee_auth ta
    JOIN trainees t ON t.id = ta.trainee_id
    WHERE ta.auth_user_id = auth.uid()
    AND t.id = p_trainee_id
    AND t.trainer_id = p_trainer_id
  );
END;
$$;

-- Fix get_current_trainee_id
CREATE OR REPLACE FUNCTION public.get_current_trainee_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_trainee_id uuid;
BEGIN
  SELECT trainee_id INTO v_trainee_id
  FROM trainee_auth
  WHERE auth_user_id = auth.uid();
  RETURN v_trainee_id;
END;
$$;

-- Fix is_trainee_owner
CREATE OR REPLACE FUNCTION public.is_trainee_owner(check_trainee_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM trainee_auth 
    WHERE trainee_id = check_trainee_id 
    AND auth_user_id = auth.uid()
  );
END;
$$;

-- Fix is_trainee_user
CREATE OR REPLACE FUNCTION public.is_trainee_user(trainee_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM trainee_auth 
    WHERE trainee_id = trainee_uuid 
    AND auth_user_id = auth.uid()
  );
$$;

-- Fix is_trainer_of_exercise_set
CREATE OR REPLACE FUNCTION public.is_trainer_of_exercise_set(exercise_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM exercise_sets es
    JOIN workout_exercises we ON we.id = es.workout_exercise_id
    JOIN workouts w ON w.id = we.workout_id
    WHERE es.id = exercise_uuid 
    AND w.trainer_id = auth.uid()
  );
$$;

-- Fix is_trainer_of_trainee
CREATE OR REPLACE FUNCTION public.is_trainer_of_trainee(trainee_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM trainees 
    WHERE id = trainee_uuid 
    AND trainer_id = auth.uid()
  );
$$;

-- Fix is_trainer_of_trainee_auth
CREATE OR REPLACE FUNCTION public.is_trainer_of_trainee_auth(trainee_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM trainees 
    WHERE id = trainee_uuid 
    AND trainer_id = auth.uid()
  );
$$;

-- Fix is_trainer_of_workout
CREATE OR REPLACE FUNCTION public.is_trainer_of_workout(workout_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM workouts 
    WHERE id = workout_uuid 
    AND trainer_id = auth.uid()
  );
$$;
