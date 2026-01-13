/*
  # Create helper function for trainee-trainer relationship check
  
  1. Problem
    - RLS policies have circular dependencies
    
  2. Solution
    - Create SECURITY DEFINER function to check trainee-trainer relationship
*/

-- Drop and recreate with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_trainee_of_trainer(p_trainer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
DECLARE
  v_current_uid uuid;
  v_result boolean;
BEGIN
  v_current_uid := auth.uid();
  
  SELECT EXISTS (
    SELECT 1 
    FROM trainee_auth ta
    JOIN trainees t ON t.id = ta.trainee_id
    WHERE ta.auth_user_id = v_current_uid
    AND t.trainer_id = p_trainer_id
  ) INTO v_result;
  
  RETURN COALESCE(v_result, false);
END;
$$;

-- Update trainers policy to use this function
DROP POLICY IF EXISTS "trainee_can_view_own_trainer" ON trainers;

CREATE POLICY "trainee_can_view_own_trainer"
  ON trainers
  FOR SELECT
  TO authenticated
  USING (is_trainee_of_trainer(id));
