/*
  # Fix Infinite Recursion with Security Definer Functions

  1. Changes
    - Create security definer functions that bypass RLS
    - Update all policies that reference trainees to use these functions
    - This prevents recursive policy checks
    
  2. Security
    - Functions are SECURITY DEFINER so they bypass RLS
    - They only check specific conditions without triggering recursive policies
*/

-- Create security definer function to check if user is trainer of trainee
CREATE OR REPLACE FUNCTION is_trainer_of_trainee(trainee_uuid uuid)
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

-- Drop old policies on measurements that cause recursion
DROP POLICY IF EXISTS "מאמנים יכולים לראות מדידות של המתא" ON measurements;
DROP POLICY IF EXISTS "מאמנים יכולים להוסיף מדידות" ON measurements;
DROP POLICY IF EXISTS "מאמנים יכולים לעדכן מדידות" ON measurements;
DROP POLICY IF EXISTS "מאמנים יכולים למחוק מדידות" ON measurements;

-- Recreate trainer policies on measurements without recursion
CREATE POLICY "trainer_select_measurements"
  ON measurements
  FOR SELECT
  TO authenticated
  USING (is_trainer_of_trainee(trainee_id));

CREATE POLICY "trainer_insert_measurements"
  ON measurements
  FOR INSERT
  TO authenticated
  WITH CHECK (is_trainer_of_trainee(trainee_id));

CREATE POLICY "trainer_update_measurements"
  ON measurements
  FOR UPDATE
  TO authenticated
  USING (is_trainer_of_trainee(trainee_id))
  WITH CHECK (is_trainer_of_trainee(trainee_id));

CREATE POLICY "trainer_delete_measurements"
  ON measurements
  FOR DELETE
  TO authenticated
  USING (is_trainer_of_trainee(trainee_id));

-- Drop old trainee policies from measurements that conflict
DROP POLICY IF EXISTS "Trainees can view their measurements" ON measurements;
DROP POLICY IF EXISTS "Trainees can insert their measurements" ON measurements;

-- Recreate clean trainee policies
CREATE POLICY "trainee_select_measurements"
  ON measurements
  FOR SELECT
  TO authenticated
  USING (
    trainee_id IN (
      SELECT trainee_id 
      FROM trainee_auth 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "trainee_insert_measurements"
  ON measurements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trainee_id IN (
      SELECT trainee_id 
      FROM trainee_auth 
      WHERE auth_user_id = auth.uid()
    )
  );