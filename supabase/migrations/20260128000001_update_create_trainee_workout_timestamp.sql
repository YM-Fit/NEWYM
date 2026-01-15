/*
  # Update create_trainee_workout to use timestamptz with current time
  
  After changing workout_date to timestamptz, we need to update the function
  to accept timestamptz and always use current time when saving.
*/

DROP FUNCTION IF EXISTS create_trainee_workout(uuid, text, text, date, boolean, boolean);

CREATE OR REPLACE FUNCTION create_trainee_workout(
  p_trainer_id uuid,
  p_workout_type text DEFAULT 'personal',
  p_notes text DEFAULT '',
  p_workout_date date DEFAULT CURRENT_DATE, -- Still accept date from frontend
  p_is_completed boolean DEFAULT false,
  p_is_self_recorded boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
DECLARE
  v_current_uid uuid;
  v_trainee_id uuid;
  v_workout_id uuid;
  v_workout_date_with_time timestamptz;
BEGIN
  v_current_uid := auth.uid();
  
  SELECT ta.trainee_id INTO v_trainee_id
  FROM trainee_auth ta
  WHERE ta.auth_user_id = v_current_uid;
  
  IF v_trainee_id IS NULL THEN
    RAISE EXCEPTION 'User is not a trainee';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM trainees t
    WHERE t.id = v_trainee_id
    AND t.trainer_id = p_trainer_id
  ) THEN
    RAISE EXCEPTION 'Trainee does not belong to this trainer';
  END IF;
  
  -- Convert date to timestamptz with current time
  -- Preserve the date from input, but use current time (NOW()) for the timestamp
  -- This ensures workout_date reflects when it was actually saved
  v_workout_date_with_time := (p_workout_date::date::text || ' ' || NOW()::time::text)::timestamptz;
  
  -- Insert the workout with timestamptz
  INSERT INTO workouts (trainer_id, workout_type, notes, workout_date, is_completed, is_self_recorded)
  VALUES (p_trainer_id, p_workout_type, p_notes, v_workout_date_with_time, p_is_completed, p_is_self_recorded)
  RETURNING id INTO v_workout_id;
  
  RETURN v_workout_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_trainee_workout TO authenticated;
