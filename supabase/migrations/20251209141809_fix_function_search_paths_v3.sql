/*
  # Fix Function Search Paths

  1. Changes
    - Set immutable search_path for all functions to prevent security issues
    
  2. Security Impact
    - Prevents search path manipulation attacks
    - Ensures functions execute with correct schema resolution
*/

-- Fix cleanup_old_scale_readings
CREATE OR REPLACE FUNCTION cleanup_old_scale_readings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM scale_readings
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Fix update_workout_templates_updated_at (need to drop trigger first)
DROP TRIGGER IF EXISTS update_workout_templates_timestamp ON workout_templates;

CREATE OR REPLACE FUNCTION update_workout_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_workout_templates_timestamp
  BEFORE UPDATE ON workout_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_templates_updated_at();

-- Fix is_trainer_of_trainee
CREATE OR REPLACE FUNCTION is_trainer_of_trainee(trainee_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT EXISTS (
  SELECT 1 
  FROM trainees 
  WHERE id = trainee_uuid 
    AND trainer_id = auth.uid()
);
$$;

-- Fix is_trainer_of_workout
CREATE OR REPLACE FUNCTION is_trainer_of_workout(workout_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT EXISTS (
  SELECT 1 
  FROM workouts 
  WHERE id = workout_uuid 
    AND trainer_id = auth.uid()
);
$$;

-- Fix is_trainer_of_exercise_set
CREATE OR REPLACE FUNCTION is_trainer_of_exercise_set(exercise_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Fix is_trainee_user
CREATE OR REPLACE FUNCTION is_trainee_user(trainee_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT EXISTS (
  SELECT 1 
  FROM trainee_auth 
  WHERE trainee_id = trainee_uuid 
    AND auth_user_id = auth.uid()
);
$$;

-- Fix is_trainer_of_trainee_auth
CREATE OR REPLACE FUNCTION is_trainer_of_trainee_auth(trainee_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT EXISTS (
  SELECT 1 
  FROM trainees 
  WHERE id = trainee_uuid 
    AND trainer_id = auth.uid()
);
$$;

-- Fix is_trainee_owner
CREATE OR REPLACE FUNCTION is_trainee_owner(check_trainee_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Fix get_trainer_id_for_trainee
CREATE OR REPLACE FUNCTION get_trainer_id_for_trainee(check_trainee_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
SELECT trainer_id FROM trainees WHERE id = check_trainee_id LIMIT 1;
$$;
