/*
  # Add Missing Foreign Key Indexes

  1. Changes
    - Add indexes for all unindexed foreign keys to improve query performance
    
  2. Performance Impact
    - Significantly improves JOIN performance
    - Speeds up foreign key constraint checks
    - Reduces query execution time for related table lookups
*/

-- exercise_sets foreign keys
CREATE INDEX IF NOT EXISTS idx_exercise_sets_superset_equipment_id 
ON exercise_sets(superset_equipment_id);

-- exercises foreign keys
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group_id 
ON exercises(muscle_group_id);

-- food_diary_meals foreign keys
CREATE INDEX IF NOT EXISTS idx_food_diary_meals_trainee_id 
ON food_diary_meals(trainee_id);

-- meal_note_templates foreign keys
CREATE INDEX IF NOT EXISTS idx_meal_note_templates_trainer_id 
ON meal_note_templates(trainer_id);

-- meal_plan_history foreign keys
CREATE INDEX IF NOT EXISTS idx_meal_plan_history_plan_id 
ON meal_plan_history(plan_id);

CREATE INDEX IF NOT EXISTS idx_meal_plan_history_trainee_id 
ON meal_plan_history(trainee_id);

-- meal_plan_items foreign keys
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan_id 
ON meal_plan_items(plan_id);

-- meal_plan_templates foreign keys
CREATE INDEX IF NOT EXISTS idx_meal_plan_templates_trainer_id 
ON meal_plan_templates(trainer_id);

-- plan_execution_exercises foreign keys
CREATE INDEX IF NOT EXISTS idx_plan_execution_exercises_actual_exercise_id 
ON plan_execution_exercises(actual_exercise_id);

CREATE INDEX IF NOT EXISTS idx_plan_execution_exercises_execution_id 
ON plan_execution_exercises(execution_id);

CREATE INDEX IF NOT EXISTS idx_plan_execution_exercises_original_exercise_id 
ON plan_execution_exercises(original_exercise_id);

-- plan_executions foreign keys
CREATE INDEX IF NOT EXISTS idx_plan_executions_plan_id 
ON plan_executions(plan_id);

CREATE INDEX IF NOT EXISTS idx_plan_executions_trainee_id 
ON plan_executions(trainee_id);

-- trainee_workout_plans foreign keys
CREATE INDEX IF NOT EXISTS idx_trainee_workout_plans_trainer_id 
ON trainee_workout_plans(trainer_id);

-- trainer_notifications foreign keys
CREATE INDEX IF NOT EXISTS idx_trainer_notifications_trainee_id 
ON trainer_notifications(trainee_id);

-- workout_exercises foreign keys
CREATE INDEX IF NOT EXISTS idx_workout_exercises_trainee_id 
ON workout_exercises(trainee_id);

-- workout_plan_day_exercises foreign keys
CREATE INDEX IF NOT EXISTS idx_workout_plan_day_exercises_exercise_id 
ON workout_plan_day_exercises(exercise_id);

-- workout_plan_exercises foreign keys
CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_exercise_id 
ON workout_plan_exercises(exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_plan_id 
ON workout_plan_exercises(plan_id);

-- workout_plans foreign keys
CREATE INDEX IF NOT EXISTS idx_workout_plans_trainer_id 
ON workout_plans(trainer_id);
