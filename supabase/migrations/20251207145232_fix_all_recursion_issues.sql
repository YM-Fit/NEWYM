/*
  # Fix All Recursion Issues with Security Definer

  1. Changes
    - Create security definer function to check workout ownership
    - Update all workout-related policies to use security definer functions
    - This prevents recursive policy checks when JOINing with trainees
    
  2. Security
    - Functions are SECURITY DEFINER so they bypass RLS
    - They only check specific conditions without triggering recursive policies
*/

-- Create security definer function to check if user is trainer of workout
CREATE OR REPLACE FUNCTION is_trainer_of_workout(workout_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM workouts 
    WHERE id = workout_uuid 
      AND trainer_id = auth.uid()
  );
$$;

-- Drop and recreate workout_trainees policies without recursion
DROP POLICY IF EXISTS "מאמנים יכולים לראות קישורי מתאמני" ON workout_trainees;
DROP POLICY IF EXISTS "מאמנים יכולים להוסיף קישורי מתאמנ" ON workout_trainees;
DROP POLICY IF EXISTS "מאמנים יכולים למחוק קישורי מתאמני" ON workout_trainees;

CREATE POLICY "trainer_select_workout_trainees"
  ON workout_trainees
  FOR SELECT
  TO authenticated
  USING (is_trainer_of_workout(workout_id));

CREATE POLICY "trainer_insert_workout_trainees"
  ON workout_trainees
  FOR INSERT
  TO authenticated
  WITH CHECK (is_trainer_of_workout(workout_id));

CREATE POLICY "trainer_delete_workout_trainees"
  ON workout_trainees
  FOR DELETE
  TO authenticated
  USING (is_trainer_of_workout(workout_id));

-- Also update trainee policies for workout_trainees
DROP POLICY IF EXISTS "trainee_select_own_workout_trainees" ON workout_trainees;

CREATE POLICY "trainee_select_workout_trainees"
  ON workout_trainees
  FOR SELECT
  TO authenticated
  USING (
    trainee_id IN (
      SELECT trainee_id 
      FROM trainee_auth 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Update workout_exercises policies
DROP POLICY IF EXISTS "מאמנים יכולים לראות תרגילי אימון" ON workout_exercises;
DROP POLICY IF EXISTS "מאמנים יכולים להוסיף תרגילי אימון" ON workout_exercises;
DROP POLICY IF EXISTS "מאמנים יכולים לעדכן תרגילי אימו" ON workout_exercises;
DROP POLICY IF EXISTS "מאמנים יכולים למחוק תרגילי אימון" ON workout_exercises;

CREATE POLICY "trainer_select_workout_exercises"
  ON workout_exercises
  FOR SELECT
  TO authenticated
  USING (is_trainer_of_workout(workout_id));

CREATE POLICY "trainer_insert_workout_exercises"
  ON workout_exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (is_trainer_of_workout(workout_id));

CREATE POLICY "trainer_update_workout_exercises"
  ON workout_exercises
  FOR UPDATE
  TO authenticated
  USING (is_trainer_of_workout(workout_id))
  WITH CHECK (is_trainer_of_workout(workout_id));

CREATE POLICY "trainer_delete_workout_exercises"
  ON workout_exercises
  FOR DELETE
  TO authenticated
  USING (is_trainer_of_workout(workout_id));

-- Update exercise_sets policies
DROP POLICY IF EXISTS "מאמנים יכולים לראות סטים" ON exercise_sets;
DROP POLICY IF EXISTS "מאמנים יכולים להוסיף סטים" ON exercise_sets;
DROP POLICY IF EXISTS "מאמנים יכולים לעדכן סטים" ON exercise_sets;
DROP POLICY IF EXISTS "מאמנים יכולים למחוק סטים" ON exercise_sets;

-- Create function to check if user owns the exercise set
CREATE OR REPLACE FUNCTION is_trainer_of_exercise_set(exercise_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM exercise_sets es
    JOIN workout_exercises we ON we.id = es.workout_exercise_id
    JOIN workouts w ON w.id = we.workout_id
    WHERE es.id = exercise_uuid 
      AND w.trainer_id = auth.uid()
  );
$$;

CREATE POLICY "trainer_select_exercise_sets"
  ON exercise_sets
  FOR SELECT
  TO authenticated
  USING (
    workout_exercise_id IN (
      SELECT we.id 
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_insert_exercise_sets"
  ON exercise_sets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workout_exercise_id IN (
      SELECT we.id 
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_update_exercise_sets"
  ON exercise_sets
  FOR UPDATE
  TO authenticated
  USING (
    workout_exercise_id IN (
      SELECT we.id 
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    workout_exercise_id IN (
      SELECT we.id 
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_delete_exercise_sets"
  ON exercise_sets
  FOR DELETE
  TO authenticated
  USING (
    workout_exercise_id IN (
      SELECT we.id 
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.trainer_id = auth.uid()
    )
  );