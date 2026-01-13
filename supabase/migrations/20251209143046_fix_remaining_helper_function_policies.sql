/*
  # Fix Remaining Helper Function Policies

  1. Changes
    - Replace is_trainer_of_workout() calls with direct EXISTS queries
    - Ensures consistency across all policies
*/

-- Fix trainer_insert_workout_trainees
DROP POLICY IF EXISTS "trainer_insert_workout_trainees" ON workout_trainees;

CREATE POLICY "trainer_insert_workout_trainees"
  ON workout_trainees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_trainees.workout_id
        AND workouts.trainer_id = auth.uid()
    )
  );

-- Make sure trainer_update_workout_trainees exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workout_trainees' 
      AND policyname = 'trainer_update_workout_trainees'
  ) THEN
    CREATE POLICY "trainer_update_workout_trainees"
      ON workout_trainees FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM workouts
          WHERE workouts.id = workout_trainees.workout_id
            AND workouts.trainer_id = auth.uid()
        )
      );
  END IF;
END $$;
