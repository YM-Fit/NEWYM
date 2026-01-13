/*
  # Add Helper Function for Trainee Access

  1. Problem
    - Trainee cannot access their own data in trainees table
    - Direct policy creates circular recursion with trainee_auth table
    
  2. Solution
    - Create SECURITY DEFINER function that returns trainee_id for current auth user
    - Use this function in policies to avoid circular dependencies
    - Function bypasses RLS to break the circular chain
    
  3. Security
    - Function is SECURITY DEFINER (runs with creator's permissions)
    - Only returns trainee_id for the authenticated user
    - No risk of data leakage as it only accesses trainee_auth by auth.uid()
*/

-- Create helper function to get trainee_id for current user
CREATE OR REPLACE FUNCTION get_current_trainee_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_trainee_id uuid;
BEGIN
  -- Get trainee_id from trainee_auth without checking trainees table
  SELECT trainee_id INTO v_trainee_id
  FROM trainee_auth
  WHERE auth_user_id = auth.uid();
  
  RETURN v_trainee_id;
END;
$$;

-- Add policy for trainee to select their own data
CREATE POLICY "trainee_can_view_own_profile"
  ON trainees
  FOR SELECT
  TO authenticated
  USING (id = get_current_trainee_id());
