/*
  # Optimize RLS Auth Calls - Part 4

  1. Tables Updated
    - trainee_workout_plans, workout_plan_days, workout_plan_day_exercises
    - measurements, trainees, workout_trainees, workouts
    - workout_exercises, exercise_sets
*/

-- TRAINEE_WORKOUT_PLANS
DROP POLICY IF EXISTS "trainers_manage_workout_plans" ON trainee_workout_plans;
CREATE POLICY "trainers_manage_workout_plans"
  ON trainee_workout_plans
  TO authenticated
  USING (trainer_id = (select auth.uid()))
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "trainee_select_own_workout_plans" ON trainee_workout_plans;
CREATE POLICY "trainee_select_own_workout_plans"
  ON trainee_workout_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = trainee_workout_plans.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- WORKOUT_PLAN_DAYS
DROP POLICY IF EXISTS "trainers_manage_plan_days" ON workout_plan_days;
CREATE POLICY "trainers_manage_plan_days"
  ON workout_plan_days
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = workout_plan_days.plan_id
        AND twp.trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = workout_plan_days.plan_id
        AND twp.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_select_own_plan_days" ON workout_plan_days;
CREATE POLICY "trainee_select_own_plan_days"
  ON workout_plan_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE twp.id = workout_plan_days.plan_id
        AND ta.auth_user_id = (select auth.uid())
    )
  );

-- WORKOUT_PLAN_DAY_EXERCISES
DROP POLICY IF EXISTS "trainers_manage_plan_exercises" ON workout_plan_day_exercises;
CREATE POLICY "trainers_manage_plan_exercises"
  ON workout_plan_day_exercises
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plan_days wpd
      JOIN trainee_workout_plans twp ON twp.id = wpd.plan_id
      WHERE wpd.id = workout_plan_day_exercises.day_id
        AND twp.trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_plan_days wpd
      JOIN trainee_workout_plans twp ON twp.id = wpd.plan_id
      WHERE wpd.id = workout_plan_day_exercises.day_id
        AND twp.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_select_own_plan_exercises" ON workout_plan_day_exercises;
CREATE POLICY "trainee_select_own_plan_exercises"
  ON workout_plan_day_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plan_days wpd
      JOIN trainee_workout_plans twp ON twp.id = wpd.plan_id
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE wpd.id = workout_plan_day_exercises.day_id
        AND ta.auth_user_id = (select auth.uid())
    )
  );

-- MEASUREMENTS
DROP POLICY IF EXISTS "trainees_view_own_measurements" ON measurements;
CREATE POLICY "trainees_view_own_measurements"
  ON measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = measurements.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_select_own_measurements" ON measurements;
CREATE POLICY "trainee_select_own_measurements"
  ON measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = measurements.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_select_measurements" ON measurements;
CREATE POLICY "trainee_select_measurements"
  ON measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = measurements.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_insert_measurements" ON measurements;
CREATE POLICY "trainee_insert_measurements"
  ON measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = measurements.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- TRAINEES
DROP POLICY IF EXISTS "trainee_select_own_data" ON trainees;
CREATE POLICY "trainee_select_own_data"
  ON trainees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = trainees.id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_update_own_data" ON trainees;
CREATE POLICY "trainee_update_own_data"
  ON trainees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = trainees.id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- WORKOUT_TRAINEES
DROP POLICY IF EXISTS "trainee_select_workout_trainees" ON workout_trainees;
CREATE POLICY "trainee_select_workout_trainees"
  ON workout_trainees FOR SELECT
  TO authenticated
  USING (
    trainee_id IN (
      SELECT trainee_auth.trainee_id
      FROM trainee_auth
      WHERE trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- WORKOUTS
DROP POLICY IF EXISTS "trainees_view_own_workouts" ON workouts;
CREATE POLICY "trainees_view_own_workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING (
    trainer_id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1
      FROM workout_trainees wt
      JOIN trainee_auth ta ON ta.trainee_id = wt.trainee_id
      WHERE wt.workout_id = workouts.id
        AND ta.auth_user_id = (select auth.uid())
    )
  );

-- WORKOUT_EXERCISES
DROP POLICY IF EXISTS "trainee_select_own_workout_exercises" ON workout_exercises;
CREATE POLICY "trainee_select_own_workout_exercises"
  ON workout_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = workout_exercises.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- EXERCISE_SETS
DROP POLICY IF EXISTS "trainee_select_own_exercise_sets" ON exercise_sets;
CREATE POLICY "trainee_select_own_exercise_sets"
  ON exercise_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM workout_exercises we
      JOIN trainee_auth ta ON ta.trainee_id = we.trainee_id
      WHERE we.id = exercise_sets.workout_exercise_id
        AND ta.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainer_select_exercise_sets" ON exercise_sets;
CREATE POLICY "trainer_select_exercise_sets"
  ON exercise_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = exercise_sets.workout_exercise_id
        AND w.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainer_insert_exercise_sets" ON exercise_sets;
CREATE POLICY "trainer_insert_exercise_sets"
  ON exercise_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = exercise_sets.workout_exercise_id
        AND w.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainer_update_exercise_sets" ON exercise_sets;
CREATE POLICY "trainer_update_exercise_sets"
  ON exercise_sets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = exercise_sets.workout_exercise_id
        AND w.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainer_delete_exercise_sets" ON exercise_sets;
CREATE POLICY "trainer_delete_exercise_sets"
  ON exercise_sets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = exercise_sets.workout_exercise_id
        AND w.trainer_id = (select auth.uid())
    )
  );
