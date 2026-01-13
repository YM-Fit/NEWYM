/*
  # Add Trainee SELECT Policies - Final Version

  1. Overview
    - Allow trainees to view their own data across all tables
    - Uses get_current_trainee_id() helper function to avoid circular recursion
    
  2. Tables Covered
    - workouts (via workout_trainees)
    - workout_exercises
    - exercise_sets
    - trainee_workout_plans
    - workout_plan_days
    - workout_plan_day_exercises
    - meal_plans
    - meal_plan_meals
    - measurements
    - trainee_self_weights
    - food_diary
    - food_diary_meals
    - mental_tools
    - exercises (global)
    - muscle_groups (global)
    - equipment (trainer's equipment)
    - trainers (own trainer)
    
  3. Security
    - All policies use get_current_trainee_id() which is SECURITY DEFINER
    - Trainees can only view their own data
*/

-- Workouts (trainee can see workouts they participated in)
CREATE POLICY "trainee_can_view_own_workouts"
  ON workouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_trainees
      WHERE workout_trainees.workout_id = workouts.id
      AND workout_trainees.trainee_id = get_current_trainee_id()
    )
  );

-- Workout trainees
CREATE POLICY "trainee_can_view_own_workout_trainees"
  ON workout_trainees
  FOR SELECT
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Workout exercises
CREATE POLICY "trainee_can_view_own_workout_exercises"
  ON workout_exercises
  FOR SELECT
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Exercise sets
CREATE POLICY "trainee_can_view_own_exercise_sets"
  ON exercise_sets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      WHERE we.id = exercise_sets.workout_exercise_id
      AND we.trainee_id = get_current_trainee_id()
    )
  );

-- Trainee workout plans
CREATE POLICY "trainee_can_view_own_workout_plans"
  ON trainee_workout_plans
  FOR SELECT
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Workout plan days
CREATE POLICY "trainee_can_view_own_workout_plan_days"
  ON workout_plan_days
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans
      WHERE trainee_workout_plans.id = workout_plan_days.plan_id
      AND trainee_workout_plans.trainee_id = get_current_trainee_id()
    )
  );

-- Workout plan day exercises
CREATE POLICY "trainee_can_view_own_workout_plan_day_exercises"
  ON workout_plan_day_exercises
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plan_days wpd
      JOIN trainee_workout_plans twp ON twp.id = wpd.plan_id
      WHERE wpd.id = workout_plan_day_exercises.day_id
      AND twp.trainee_id = get_current_trainee_id()
    )
  );

-- Meal plans
CREATE POLICY "trainee_can_view_own_meal_plans"
  ON meal_plans
  FOR SELECT
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Meal plan meals
CREATE POLICY "trainee_can_view_own_meal_plan_meals"
  ON meal_plan_meals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meal_plan_meals.plan_id
      AND meal_plans.trainee_id = get_current_trainee_id()
    )
  );

-- Measurements
CREATE POLICY "trainee_can_view_own_measurements"
  ON measurements
  FOR SELECT
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Trainee self weights
CREATE POLICY "trainee_can_view_own_self_weights"
  ON trainee_self_weights
  FOR SELECT
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Food diary
CREATE POLICY "trainee_can_view_own_food_diary"
  ON food_diary
  FOR SELECT
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Food diary meals
CREATE POLICY "trainee_can_view_own_food_diary_meals"
  ON food_diary_meals
  FOR SELECT
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Mental tools
CREATE POLICY "trainee_can_view_own_mental_tools"
  ON mental_tools
  FOR SELECT
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Exercises (global - all authenticated users can view)
CREATE POLICY "trainee_can_view_exercises"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

-- Muscle groups (global - all authenticated users can view)
CREATE POLICY "trainee_can_view_muscle_groups"
  ON muscle_groups
  FOR SELECT
  TO authenticated
  USING (true);

-- Equipment (trainee can see equipment of their trainer)
CREATE POLICY "trainee_can_view_trainer_equipment"
  ON equipment
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = get_current_trainee_id()
      AND trainees.trainer_id = equipment.trainer_id
    )
  );

-- Trainers (trainee can view their own trainer)
CREATE POLICY "trainee_can_view_own_trainer"
  ON trainers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = get_current_trainee_id()
      AND trainees.trainer_id = trainers.id
    )
  );
