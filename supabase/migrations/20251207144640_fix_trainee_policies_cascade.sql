/*
  # Fix Infinite Recursion - Drop Everything with CASCADE

  1. Changes
    - Drop problematic helper function with CASCADE
    - This will drop all dependent policies
    - Recreate clean policies without recursion
    
  2. Security
    - Trainers can access their trainees' data
    - Trainees can access their own data
    - No recursive policy checks
*/

-- Drop the problematic helper function with CASCADE (removes all dependent policies)
DROP FUNCTION IF EXISTS is_trainee_owner(uuid) CASCADE;

-- Drop remaining trainee policies from trainees table if they exist
DROP POLICY IF EXISTS "מתאמנים יכולים לראות את הנתונים שלהם" ON trainees;
DROP POLICY IF EXISTS "מתאמנים יכולים לעדכן את הנתונים שלהם" ON trainees;

-- Recreate trainee policies for trainees table (without recursion)
CREATE POLICY "trainee_select_own_data"
  ON trainees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = trainees.id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "trainee_update_own_data"
  ON trainees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = trainees.id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = trainees.id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );

-- Recreate policies for other tables (simple, no recursion)

-- Measurements
CREATE POLICY "trainee_select_own_measurements"
  ON measurements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = measurements.trainee_id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );

-- Workout Trainees
CREATE POLICY "trainee_select_own_workout_trainees"
  ON workout_trainees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = workout_trainees.trainee_id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );

-- Workout Exercises
CREATE POLICY "trainee_select_own_workout_exercises"
  ON workout_exercises
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = workout_exercises.trainee_id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );

-- Exercise Sets
CREATE POLICY "trainee_select_own_exercise_sets"
  ON exercise_sets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM workout_exercises we
      JOIN trainee_auth ta ON ta.trainee_id = we.trainee_id
      WHERE we.id = exercise_sets.workout_exercise_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- Workout Plans
CREATE POLICY "trainee_select_own_workout_plans"
  ON workout_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = workout_plans.trainee_id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );

-- Workout Plan Exercises
CREATE POLICY "trainee_select_own_workout_plan_exercises"
  ON workout_plan_exercises
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM workout_plans wp
      JOIN trainee_auth ta ON ta.trainee_id = wp.trainee_id
      WHERE wp.id = workout_plan_exercises.plan_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- Meal Plans
CREATE POLICY "trainee_select_own_meal_plans"
  ON meal_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = meal_plans.trainee_id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );

-- Meal Plan Items
CREATE POLICY "trainee_select_own_meal_plan_items"
  ON meal_plan_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM meal_plans mp
      JOIN trainee_auth ta ON ta.trainee_id = mp.trainee_id
      WHERE mp.id = meal_plan_items.plan_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- Daily Log
CREATE POLICY "trainee_select_own_daily_log"
  ON daily_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = daily_log.trainee_id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );

-- Meals
CREATE POLICY "trainee_select_own_meals"
  ON meals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = meals.trainee_id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );

-- Plan Executions
CREATE POLICY "trainee_select_own_plan_executions"
  ON plan_executions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.trainee_id = plan_executions.trainee_id 
        AND trainee_auth.auth_user_id = auth.uid()
    )
  );

-- Plan Execution Exercises
CREATE POLICY "trainee_select_own_plan_execution_exercises"
  ON plan_execution_exercises
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM plan_executions pe
      JOIN trainee_auth ta ON ta.trainee_id = pe.trainee_id
      WHERE pe.id = plan_execution_exercises.execution_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- Exercises (public read for trainees)
CREATE POLICY "trainee_select_all_exercises"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.auth_user_id = auth.uid()
    )
  );

-- Muscle Groups (public read for trainees)
CREATE POLICY "trainee_select_all_muscle_groups"
  ON muscle_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.auth_user_id = auth.uid()
    )
  );

-- Equipment (public read for trainees)
CREATE POLICY "trainee_select_all_equipment"
  ON equipment
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trainee_auth 
      WHERE trainee_auth.auth_user_id = auth.uid()
    )
  );