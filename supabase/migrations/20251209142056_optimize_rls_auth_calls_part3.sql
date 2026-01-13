/*
  # Optimize RLS Auth Calls - Part 3

  1. Tables Updated
    - workout_plans, workout_plan_exercises, meal_plans, meal_plan_items
    - daily_log, meals, plan_executions, plan_execution_exercises
    - meal_plan_meals, meal_plan_templates, meal_plan_history, meal_note_templates
*/

-- WORKOUT_PLANS
DROP POLICY IF EXISTS "Trainers can view own workout plans" ON workout_plans;
CREATE POLICY "Trainers can view own workout plans"
  ON workout_plans FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can insert own workout plans" ON workout_plans;
CREATE POLICY "Trainers can insert own workout plans"
  ON workout_plans FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can update own workout plans" ON workout_plans;
CREATE POLICY "Trainers can update own workout plans"
  ON workout_plans FOR UPDATE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can delete own workout plans" ON workout_plans;
CREATE POLICY "Trainers can delete own workout plans"
  ON workout_plans FOR DELETE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "trainee_select_own_workout_plans" ON workout_plans;
CREATE POLICY "trainee_select_own_workout_plans"
  ON workout_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = workout_plans.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- WORKOUT_PLAN_EXERCISES
DROP POLICY IF EXISTS "Trainers can view workout plan exercises" ON workout_plan_exercises;
CREATE POLICY "Trainers can view workout plan exercises"
  ON workout_plan_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plans
      WHERE workout_plans.id = workout_plan_exercises.plan_id
        AND workout_plans.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can insert workout plan exercises" ON workout_plan_exercises;
CREATE POLICY "Trainers can insert workout plan exercises"
  ON workout_plan_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_plans
      WHERE workout_plans.id = workout_plan_exercises.plan_id
        AND workout_plans.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can update workout plan exercises" ON workout_plan_exercises;
CREATE POLICY "Trainers can update workout plan exercises"
  ON workout_plan_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plans
      WHERE workout_plans.id = workout_plan_exercises.plan_id
        AND workout_plans.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can delete workout plan exercises" ON workout_plan_exercises;
CREATE POLICY "Trainers can delete workout plan exercises"
  ON workout_plan_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plans
      WHERE workout_plans.id = workout_plan_exercises.plan_id
        AND workout_plans.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_select_own_workout_plan_exercises" ON workout_plan_exercises;
CREATE POLICY "trainee_select_own_workout_plan_exercises"
  ON workout_plan_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plans wp
      JOIN trainee_auth ta ON ta.trainee_id = wp.trainee_id
      WHERE wp.id = workout_plan_exercises.plan_id
        AND ta.auth_user_id = (select auth.uid())
    )
  );

-- MEAL_PLANS
DROP POLICY IF EXISTS "Trainers can view own meal plans" ON meal_plans;
CREATE POLICY "Trainers can view own meal plans"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meal_plans.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can insert own meal plans" ON meal_plans;
CREATE POLICY "Trainers can insert own meal plans"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meal_plans.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can update own meal plans" ON meal_plans;
CREATE POLICY "Trainers can update own meal plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meal_plans.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can delete own meal plans" ON meal_plans;
CREATE POLICY "Trainers can delete own meal plans"
  ON meal_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meal_plans.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainers_manage_meal_plans" ON meal_plans;
CREATE POLICY "trainers_manage_meal_plans"
  ON meal_plans
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meal_plans.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meal_plans.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_select_own_meal_plans" ON meal_plans;
CREATE POLICY "trainee_select_own_meal_plans"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = meal_plans.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- MEAL_PLAN_ITEMS
DROP POLICY IF EXISTS "Trainers can view meal plan items" ON meal_plan_items;
CREATE POLICY "Trainers can view meal plan items"
  ON meal_plan_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN trainees t ON t.id = mp.trainee_id
      WHERE mp.id = meal_plan_items.plan_id
        AND t.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can insert meal plan items" ON meal_plan_items;
CREATE POLICY "Trainers can insert meal plan items"
  ON meal_plan_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN trainees t ON t.id = mp.trainee_id
      WHERE mp.id = meal_plan_items.plan_id
        AND t.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can update meal plan items" ON meal_plan_items;
CREATE POLICY "Trainers can update meal plan items"
  ON meal_plan_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN trainees t ON t.id = mp.trainee_id
      WHERE mp.id = meal_plan_items.plan_id
        AND t.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can delete meal plan items" ON meal_plan_items;
CREATE POLICY "Trainers can delete meal plan items"
  ON meal_plan_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN trainees t ON t.id = mp.trainee_id
      WHERE mp.id = meal_plan_items.plan_id
        AND t.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_select_own_meal_plan_items" ON meal_plan_items;
CREATE POLICY "trainee_select_own_meal_plan_items"
  ON meal_plan_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN trainee_auth ta ON ta.trainee_id = mp.trainee_id
      WHERE mp.id = meal_plan_items.plan_id
        AND ta.auth_user_id = (select auth.uid())
    )
  );

-- DAILY_LOG
DROP POLICY IF EXISTS "Trainers can view trainee logs" ON daily_log;
CREATE POLICY "Trainers can view trainee logs"
  ON daily_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can insert trainee logs" ON daily_log;
CREATE POLICY "Trainers can insert trainee logs"
  ON daily_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can update trainee logs" ON daily_log;
CREATE POLICY "Trainers can update trainee logs"
  ON daily_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can delete trainee logs" ON daily_log;
CREATE POLICY "Trainers can delete trainee logs"
  ON daily_log FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_select_own_daily_log" ON daily_log;
CREATE POLICY "trainee_select_own_daily_log"
  ON daily_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = daily_log.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- MEALS
DROP POLICY IF EXISTS "Trainers can view trainee meals" ON meals;
CREATE POLICY "Trainers can view trainee meals"
  ON meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can insert trainee meals" ON meals;
CREATE POLICY "Trainers can insert trainee meals"
  ON meals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can update trainee meals" ON meals;
CREATE POLICY "Trainers can update trainee meals"
  ON meals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can delete trainee meals" ON meals;
CREATE POLICY "Trainers can delete trainee meals"
  ON meals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_select_own_meals" ON meals;
CREATE POLICY "trainee_select_own_meals"
  ON meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = meals.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- PLAN_EXECUTIONS
DROP POLICY IF EXISTS "Trainers can view plan executions" ON plan_executions;
CREATE POLICY "Trainers can view plan executions"
  ON plan_executions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can insert plan executions" ON plan_executions;
CREATE POLICY "Trainers can insert plan executions"
  ON plan_executions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can update plan executions" ON plan_executions;
CREATE POLICY "Trainers can update plan executions"
  ON plan_executions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can delete plan executions" ON plan_executions;
CREATE POLICY "Trainers can delete plan executions"
  ON plan_executions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_select_own_plan_executions" ON plan_executions;
CREATE POLICY "trainee_select_own_plan_executions"
  ON plan_executions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = plan_executions.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- PLAN_EXECUTION_EXERCISES
DROP POLICY IF EXISTS "Trainers can view execution exercises" ON plan_execution_exercises;
CREATE POLICY "Trainers can view execution exercises"
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

DROP POLICY IF EXISTS "Trainers can insert execution exercises" ON plan_execution_exercises;
CREATE POLICY "Trainers can insert execution exercises"
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

DROP POLICY IF EXISTS "Trainers can update execution exercises" ON plan_execution_exercises;
CREATE POLICY "Trainers can update execution exercises"
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

DROP POLICY IF EXISTS "Trainers can delete execution exercises" ON plan_execution_exercises;
CREATE POLICY "Trainers can delete execution exercises"
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

DROP POLICY IF EXISTS "trainee_select_own_plan_execution_exercises" ON plan_execution_exercises;
CREATE POLICY "trainee_select_own_plan_execution_exercises"
  ON plan_execution_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plan_executions pe
      JOIN trainee_auth ta ON ta.trainee_id = pe.trainee_id
      WHERE pe.id = plan_execution_exercises.execution_id
        AND ta.auth_user_id = (select auth.uid())
    )
  );

-- MEAL_PLAN_MEALS
DROP POLICY IF EXISTS "trainees_view_own_meals" ON meal_plan_meals;
CREATE POLICY "trainees_view_own_meals"
  ON meal_plan_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN trainee_auth ta ON ta.trainee_id = mp.trainee_id
      WHERE mp.id = meal_plan_meals.plan_id
        AND ta.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainers_manage_meal_plan_meals" ON meal_plan_meals;
CREATE POLICY "trainers_manage_meal_plan_meals"
  ON meal_plan_meals
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN trainees t ON t.id = mp.trainee_id
      WHERE mp.id = meal_plan_meals.plan_id
        AND t.trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN trainees t ON t.id = mp.trainee_id
      WHERE mp.id = meal_plan_meals.plan_id
        AND t.trainer_id = (select auth.uid())
    )
  );

-- MEAL_PLAN_TEMPLATES
DROP POLICY IF EXISTS "trainers_manage_templates" ON meal_plan_templates;
CREATE POLICY "trainers_manage_templates"
  ON meal_plan_templates
  TO authenticated
  USING (trainer_id = (select auth.uid()))
  WITH CHECK (trainer_id = (select auth.uid()));

-- MEAL_PLAN_HISTORY
DROP POLICY IF EXISTS "trainers_manage_history" ON meal_plan_history;
CREATE POLICY "trainers_manage_history"
  ON meal_plan_history
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN trainees t ON t.id = mp.trainee_id
      WHERE mp.id = meal_plan_history.plan_id
        AND t.trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN trainees t ON t.id = mp.trainee_id
      WHERE mp.id = meal_plan_history.plan_id
        AND t.trainer_id = (select auth.uid())
    )
  );

-- MEAL_NOTE_TEMPLATES
DROP POLICY IF EXISTS "trainers_manage_note_templates" ON meal_note_templates;
CREATE POLICY "trainers_manage_note_templates"
  ON meal_note_templates
  TO authenticated
  USING (trainer_id = (select auth.uid()))
  WITH CHECK (trainer_id = (select auth.uid()));
