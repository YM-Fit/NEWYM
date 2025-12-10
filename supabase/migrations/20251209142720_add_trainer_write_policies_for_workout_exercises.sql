/*
  # Add Trainer Write Policies for Workout Exercises

  1. Changes
    - Add INSERT, UPDATE, DELETE policies for trainers on workout_exercises
    - Trainers need to be able to manage exercises in their workouts
*/

-- WORKOUT_EXERCISES - INSERT
CREATE POLICY "trainer_insert_workout_exercises"
  ON workout_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.trainer_id = (select auth.uid())
    )
  );

-- WORKOUT_EXERCISES - UPDATE
CREATE POLICY "trainer_update_workout_exercises"
  ON workout_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.trainer_id = (select auth.uid())
    )
  );

-- WORKOUT_EXERCISES - DELETE
CREATE POLICY "trainer_delete_workout_exercises"
  ON workout_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.trainer_id = (select auth.uid())
    )
  );

-- DAILY_LOG - Add missing trainer write policies
CREATE POLICY "trainer_insert_daily_log"
  ON daily_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

CREATE POLICY "trainer_update_daily_log"
  ON daily_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

CREATE POLICY "trainer_delete_daily_log"
  ON daily_log FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

-- MEALS - Add missing trainer write policies
CREATE POLICY "trainer_insert_meals"
  ON meals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

CREATE POLICY "trainer_update_meals"
  ON meals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

CREATE POLICY "trainer_delete_meals"
  ON meals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

-- PLAN_EXECUTIONS - Add write policies
CREATE POLICY "trainer_insert_plan_executions"
  ON plan_executions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

CREATE POLICY "trainer_update_plan_executions"
  ON plan_executions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

CREATE POLICY "trainer_delete_plan_executions"
  ON plan_executions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

-- PLAN_EXECUTION_EXERCISES - Add write policies
CREATE POLICY "trainer_insert_execution_exercises"
  ON plan_execution_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_executions pe
      JOIN trainees t ON t.id = pe.trainee_id
      WHERE pe.id = plan_execution_exercises.execution_id
        AND t.trainer_id = (select auth.uid())
    )
  );

CREATE POLICY "trainer_update_execution_exercises"
  ON plan_execution_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plan_executions pe
      JOIN trainees t ON t.id = pe.trainee_id
      WHERE pe.id = plan_execution_exercises.execution_id
        AND t.trainer_id = (select auth.uid())
    )
  );

CREATE POLICY "trainer_delete_execution_exercises"
  ON plan_execution_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plan_executions pe
      JOIN trainees t ON t.id = pe.trainee_id
      WHERE pe.id = plan_execution_exercises.execution_id
        AND t.trainer_id = (select auth.uid())
    )
  );

-- TRAINEE_SELF_WEIGHTS - Update policy
CREATE POLICY "trainer_update_trainee_weights"
  ON trainee_self_weights FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_self_weights.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );
