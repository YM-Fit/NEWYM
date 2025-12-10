/*
  # Fix Trainees and Trainee Auth Recursion

  1. Problem
    - trainees policies check trainee_auth
    - trainee_auth policies check trainees
    - This creates infinite recursion
    
  2. Solution
    - Create security definer functions that bypass RLS
    - Update all policies to use these functions
    - This breaks the circular dependency
    
  3. Security
    - Functions are SECURITY DEFINER so they bypass RLS
    - They only check specific conditions without triggering recursive policies
*/

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "trainee_select_own_data" ON trainees;
DROP POLICY IF EXISTS "trainee_update_own_data" ON trainees;
DROP POLICY IF EXISTS "Trainers can view trainee auth" ON trainee_auth;
DROP POLICY IF EXISTS "Trainers can insert trainee auth" ON trainee_auth;
DROP POLICY IF EXISTS "Trainers can update trainee auth" ON trainee_auth;
DROP POLICY IF EXISTS "Trainers can delete trainee auth" ON trainee_auth;

-- Create security definer function to check if user is the trainee
CREATE OR REPLACE FUNCTION is_trainee_user(trainee_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM trainee_auth 
    WHERE trainee_id = trainee_uuid 
      AND auth_user_id = auth.uid()
  );
$$;

-- Create security definer function to check if user is trainer of trainee (for trainee_auth)
CREATE OR REPLACE FUNCTION is_trainer_of_trainee_auth(trainee_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM trainees 
    WHERE id = trainee_uuid 
      AND trainer_id = auth.uid()
  );
$$;

-- Recreate trainees policies without recursion
CREATE POLICY "trainee_select_own_data"
  ON trainees
  FOR SELECT
  TO authenticated
  USING (is_trainee_user(id));

CREATE POLICY "trainee_update_own_data"
  ON trainees
  FOR UPDATE
  TO authenticated
  USING (is_trainee_user(id))
  WITH CHECK (is_trainee_user(id));

-- Recreate trainee_auth policies without recursion
CREATE POLICY "trainer_select_trainee_auth"
  ON trainee_auth
  FOR SELECT
  TO authenticated
  USING (is_trainer_of_trainee_auth(trainee_id));

CREATE POLICY "trainer_insert_trainee_auth"
  ON trainee_auth
  FOR INSERT
  TO authenticated
  WITH CHECK (is_trainer_of_trainee_auth(trainee_id));

CREATE POLICY "trainer_update_trainee_auth"
  ON trainee_auth
  FOR UPDATE
  TO authenticated
  USING (is_trainer_of_trainee_auth(trainee_id))
  WITH CHECK (is_trainer_of_trainee_auth(trainee_id));

CREATE POLICY "trainer_delete_trainee_auth"
  ON trainee_auth
  FOR DELETE
  TO authenticated
  USING (is_trainer_of_trainee_auth(trainee_id));