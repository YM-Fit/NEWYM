/*
  # Fix Workouts Infinite Recursion

  1. Problem
    - trainee_can_view_own_workouts policy creates infinite recursion
    - When querying workouts through workout_trainees, the policy checks workout_trainees again
    
  2. Solution
    - Create SECURITY DEFINER function to check if workout belongs to trainee
    - This breaks the circular dependency by bypassing RLS
    
  3. Security
    - Function only returns true if user is the trainee assigned to the workout
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "trainee_can_view_own_workouts" ON workouts;

-- Create helper function to check if workout belongs to current trainee
CREATE OR REPLACE FUNCTION is_trainee_workout(workout_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_trainee_id uuid;
  v_count integer;
BEGIN
  -- Get trainee_id for current user
  SELECT trainee_id INTO v_trainee_id
  FROM trainee_auth
  WHERE auth_user_id = auth.uid();
  
  -- If not a trainee, return false
  IF v_trainee_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if this trainee is assigned to this workout
  SELECT COUNT(*) INTO v_count
  FROM workout_trainees
  WHERE workout_id = workout_id_param
  AND trainee_id = v_trainee_id;
  
  RETURN v_count > 0;
END;
$$;

-- Create new policy using the helper function
CREATE POLICY "trainee_can_view_assigned_workouts"
  ON workouts
  FOR SELECT
  TO authenticated
  USING (is_trainee_workout(id));
