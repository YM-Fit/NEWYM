/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - Helper functions like is_trainer_of_trainee() cause infinite recursion
    - They query the trainees table which triggers RLS policies again
    
  2. Solution
    - Replace all function calls with direct EXISTS queries
    - This avoids recursion by using standard SQL joins
    
  3. Tables Fixed
    - measurements - all trainer policies
    - Any other tables using these helper functions
*/

-- MEASUREMENTS - Replace all policies that use is_trainer_of_trainee
DROP POLICY IF EXISTS "trainer_select_measurements" ON measurements;
DROP POLICY IF EXISTS "trainer_insert_measurements" ON measurements;
DROP POLICY IF EXISTS "trainer_update_measurements" ON measurements;
DROP POLICY IF EXISTS "trainer_delete_measurements" ON measurements;

CREATE POLICY "trainer_select_measurements"
  ON measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = measurements.trainee_id
        AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_insert_measurements"
  ON measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = measurements.trainee_id
        AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_update_measurements"
  ON measurements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = measurements.trainee_id
        AND trainees.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = measurements.trainee_id
        AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_delete_measurements"
  ON measurements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = measurements.trainee_id
        AND trainees.trainer_id = auth.uid()
    )
  );

-- Fix workout_trainees DELETE policy
DROP POLICY IF EXISTS "trainer_delete_workout_trainees" ON workout_trainees;

CREATE POLICY "trainer_delete_workout_trainees"
  ON workout_trainees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_trainees.workout_id
        AND workouts.trainer_id = auth.uid()
    )
  );

-- Check and fix any other policies using helper functions
-- TRAINEE_AUTH
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trainee_auth' 
      AND (qual::text LIKE '%is_trainer_of_trainee%' 
           OR with_check::text LIKE '%is_trainer_of_trainee%')
  ) THEN
    DROP POLICY IF EXISTS "trainers_manage_trainee_auth" ON trainee_auth;
    
    CREATE POLICY "trainers_manage_trainee_auth"
      ON trainee_auth FOR ALL
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
  END IF;
END $$;
