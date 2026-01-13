/*
  # Add RLS Policies for Trainees on Related Tables

  1. Changes
    - Add SELECT policies for trainees on measurements, workouts, exercises, etc.
    - Allow trainees to view their own data across all tables
    
  2. Security
    - Trainees can only access their own data
    - Uses trainee_auth to verify trainee identity via auth.uid()
    - No write access for trainees (read-only)
*/

-- Helper function to check if user is trainee with given trainee_id
CREATE OR REPLACE FUNCTION is_trainee_owner(check_trainee_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM trainee_auth 
    WHERE trainee_id = check_trainee_id 
      AND auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Measurements: Trainees can view their own measurements
CREATE POLICY "מתאמנים יכולים לראות את המדידות שלהם"
  ON measurements
  FOR SELECT
  TO authenticated
  USING (is_trainee_owner(trainee_id));

-- Workouts: Trainees can view workouts they participated in
CREATE POLICY "מתאמנים יכולים לראות את האימונים שלהם"
  ON workouts
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT workout_id 
      FROM workout_trainees wt
      WHERE is_trainee_owner(wt.trainee_id)
    )
  );

-- Workout Trainees: Trainees can view their workout associations
CREATE POLICY "מתאמנים יכולים לראות את הקישורים לאימונים שלהם"
  ON workout_trainees
  FOR SELECT
  TO authenticated
  USING (is_trainee_owner(trainee_id));

-- Workout Exercises: Trainees can view their exercises
CREATE POLICY "מתאמנים יכולים לראות את התרגילים באימונים שלהם"
  ON workout_exercises
  FOR SELECT
  TO authenticated
  USING (is_trainee_owner(trainee_id));

-- Exercise Sets: Trainees can view their sets
CREATE POLICY "מתאמנים יכולים לראות את הסטים שלהם"
  ON exercise_sets
  FOR SELECT
  TO authenticated
  USING (
    workout_exercise_id IN (
      SELECT id 
      FROM workout_exercises we
      WHERE is_trainee_owner(we.trainee_id)
    )
  );

-- Workout Plans: Trainees can view their workout plans
CREATE POLICY "מתאמנים יכולים לראות את תוכניות האימון שלהם"
  ON workout_plans
  FOR SELECT
  TO authenticated
  USING (is_trainee_owner(trainee_id));

-- Workout Plan Exercises: Trainees can view exercises in their plans
CREATE POLICY "מתאמנים יכולים לראות תרגילים בתוכניות האימון שלהם"
  ON workout_plan_exercises
  FOR SELECT
  TO authenticated
  USING (
    plan_id IN (
      SELECT id 
      FROM workout_plans wp
      WHERE is_trainee_owner(wp.trainee_id)
    )
  );

-- Meal Plans: Trainees can view their meal plans
CREATE POLICY "מתאמנים יכולים לראות את תוכניות התזונה שלהם"
  ON meal_plans
  FOR SELECT
  TO authenticated
  USING (is_trainee_owner(trainee_id));

-- Meal Plan Items: Trainees can view items in their meal plans
CREATE POLICY "מתאמנים יכולים לראות פריטים בתוכניות התזונה שלהם"
  ON meal_plan_items
  FOR SELECT
  TO authenticated
  USING (
    plan_id IN (
      SELECT id 
      FROM meal_plans mp
      WHERE is_trainee_owner(mp.trainee_id)
    )
  );

-- Daily Log: Trainees can view their daily logs
CREATE POLICY "מתאמנים יכולים לראות את היומנים היומיים שלהם"
  ON daily_log
  FOR SELECT
  TO authenticated
  USING (is_trainee_owner(trainee_id));

-- Meals: Trainees can view their meals
CREATE POLICY "מתאמנים יכולים לראות את הארוחות שלהם"
  ON meals
  FOR SELECT
  TO authenticated
  USING (is_trainee_owner(trainee_id));

-- Plan Executions: Trainees can view their plan executions
CREATE POLICY "מתאמנים יכולים לראות את ביצועי התוכניות שלהם"
  ON plan_executions
  FOR SELECT
  TO authenticated
  USING (is_trainee_owner(trainee_id));

-- Plan Execution Exercises: Trainees can view their execution exercises
CREATE POLICY "מתאמנים יכולים לראות תרגילים בביצועי התוכניות שלהם"
  ON plan_execution_exercises
  FOR SELECT
  TO authenticated
  USING (
    execution_id IN (
      SELECT id 
      FROM plan_executions pe
      WHERE is_trainee_owner(pe.trainee_id)
    )
  );

-- Exercises: Trainees can view all exercises (they need this to see exercise names)
CREATE POLICY "מתאמנים יכולים לראות את כל התרגילים"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

-- Muscle Groups: Trainees can view all muscle groups
CREATE POLICY "מתאמנים יכולים לראות את כל קבוצות השרירים"
  ON muscle_groups
  FOR SELECT
  TO authenticated
  USING (true);

-- Equipment: Trainees can view all equipment
CREATE POLICY "מתאמנים יכולים לראות את כל הציוד"
  ON equipment
  FOR SELECT
  TO authenticated
  USING (true);