/*
  # Remove Circular RLS Policies on Trainees Table

  1. Problem
    - trainee_select_own_data and trainee_update_own_data on trainees table
    - These policies query trainee_auth table
    - trainee_auth policies query trainees table back
    - Creates infinite recursion loop
    
  2. Solution
    - Remove trainee policies from trainees table
    - Trainees don't need direct access to trainees table
    - They access their data through other tables (workouts, measurements, etc.)
    - Trainers access trainees through simple trainer_id = auth.uid() check
    
  3. Security
    - Trainers can only see their own trainees (trainer_id = auth.uid())
    - Trainees access their data through workout_trainees, measurements, etc.
    - Each of those tables has proper RLS without circular dependencies
*/

-- Remove the circular policies from trainees table
DROP POLICY IF EXISTS "trainee_select_own_data" ON trainees;
DROP POLICY IF EXISTS "trainee_update_own_data" ON trainees;

-- Verify trainer policies are simple and don't cause recursion
-- These should already exist and be correct:
-- מאמנים יכולים לראות את המתאמנים של - uses trainer_id = auth.uid()
-- מאמנים יכולים להוסיף מתאמנים - uses trainer_id = auth.uid()
-- מאמנים יכולים למחוק את המתאמנים של - uses trainer_id = auth.uid()

-- Also simplify trainee_auth policies to avoid recursion
DROP POLICY IF EXISTS "trainers_manage_trainee_auth" ON trainee_auth;

-- Split into separate policies with direct trainer_id check
CREATE POLICY "trainer_select_trainee_auth"
  ON trainee_auth FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
        AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_insert_trainee_auth"
  ON trainee_auth FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
        AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_update_trainee_auth"
  ON trainee_auth FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
        AND trainees.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
        AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_delete_trainee_auth"
  ON trainee_auth FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
        AND trainees.trainer_id = auth.uid()
    )
  );
