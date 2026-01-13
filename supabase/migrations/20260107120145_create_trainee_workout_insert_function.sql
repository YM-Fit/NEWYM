/*
  # Create function for trainee to insert workouts
  
  1. Problem
    - FK validation on trainer_id fails due to RLS on trainers table
    
  2. Solution
    - Create SECURITY DEFINER function that bypasses RLS for the insert
    - Function validates trainee is connected to trainer before inserting
*/

CREATE OR REPLACE FUNCTION create_trainee_workout(
  p_trainer_id uuid,
  p_workout_type text DEFAULT 'personal',
  p_notes text DEFAULT '',
  p_workout_date date DEFAULT CURRENT_DATE,
  p_is_completed boolean DEFAULT false
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
BEGIN
  v_current_uid := auth.uid();
  
  -- Get trainee_id for current user
  SELECT ta.trainee_id INTO v_trainee_id
  FROM trainee_auth ta
  WHERE ta.auth_user_id = v_current_uid;
  
  IF v_trainee_id IS NULL THEN
    RAISE EXCEPTION 'User is not a trainee';
  END IF;
  
  -- Verify trainee belongs to this trainer
  IF NOT EXISTS (
    SELECT 1 FROM trainees t
    WHERE t.id = v_trainee_id
    AND t.trainer_id = p_trainer_id
  ) THEN
    RAISE EXCEPTION 'Trainee does not belong to this trainer';
  END IF;
  
  -- Insert the workout
  INSERT INTO workouts (trainer_id, workout_type, notes, workout_date, is_completed)
  VALUES (p_trainer_id, p_workout_type, p_notes, p_workout_date, p_is_completed)
  RETURNING id INTO v_workout_id;
  
  RETURN v_workout_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_trainee_workout TO authenticated;
