/*
  # Add Missing Trainer SELECT Policies - Final

  1. Changes
    - Add only the policies that don't already exist
    - Focus on tables where trainers need to view trainee data
*/

-- WORKOUT_EXERCISES
CREATE POLICY "trainer_select_workout_exercises"
  ON workout_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.trainer_id = (select auth.uid())
    )
  );

-- DAILY_LOG
CREATE POLICY "trainer_select_daily_log"
  ON daily_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

-- MEALS
CREATE POLICY "trainer_select_meals"
  ON meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

-- PLAN_EXECUTIONS
CREATE POLICY "trainer_select_plan_executions"
  ON plan_executions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

-- PLAN_EXECUTION_EXERCISES
CREATE POLICY "trainer_select_execution_exercises"
  ON plan_execution_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plan_executions pe
      JOIN trainees t ON t.id = pe.trainee_id
      WHERE pe.id = plan_execution_exercises.execution_id
        AND t.trainer_id = (select auth.uid())
    )
  );

-- FOOD_DIARY
CREATE POLICY "trainer_select_food_diary"
  ON food_diary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = food_diary.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

-- FOOD_DIARY_MEALS
CREATE POLICY "trainer_select_food_diary_meals"
  ON food_diary_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = food_diary_meals.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

-- TRAINEE_SELF_WEIGHTS
CREATE POLICY "trainer_select_trainee_weights"
  ON trainee_self_weights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_self_weights.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

-- DAILY_WATER_INTAKE
CREATE POLICY "trainer_select_water_intake"
  ON daily_water_intake FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_water_intake.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

-- WORKOUT_TRAINEES
CREATE POLICY "trainer_select_workout_trainees"
  ON workout_trainees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_trainees.workout_id
        AND workouts.trainer_id = (select auth.uid())
    )
  );

-- WORKOUT_PLANS (old table)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'workout_plans' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workout_plans' AND policyname = 'trainer_select_old_workout_plans') THEN
      EXECUTE 'CREATE POLICY "trainer_select_old_workout_plans"
        ON workout_plans FOR SELECT
        TO authenticated
        USING (trainer_id = (select auth.uid()))';
    END IF;
  END IF;
END $$;

-- WORKOUT_PLAN_EXERCISES (old table)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'workout_plan_exercises' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workout_plan_exercises' AND policyname = 'trainer_select_old_plan_exercises') THEN
      EXECUTE 'CREATE POLICY "trainer_select_old_plan_exercises"
        ON workout_plan_exercises FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM workout_plans
            WHERE workout_plans.id = workout_plan_exercises.plan_id
              AND workout_plans.trainer_id = (select auth.uid())
          )
        )';
    END IF;
  END IF;
END $$;

-- MEAL_PLAN_ITEMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_plan_items' AND policyname = 'trainer_select_meal_plan_items') THEN
    EXECUTE 'CREATE POLICY "trainer_select_meal_plan_items"
      ON meal_plan_items FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM meal_plans mp
          JOIN trainees t ON t.id = mp.trainee_id
          WHERE mp.id = meal_plan_items.plan_id
            AND t.trainer_id = (select auth.uid())
        )
      )';
  END IF;
END $$;
