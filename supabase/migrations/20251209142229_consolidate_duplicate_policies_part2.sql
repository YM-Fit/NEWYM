/*
  # Consolidate Duplicate RLS Policies - Part 2

  1. Tables Cleaned
    - plan_execution_exercises, plan_executions, trainee_auth
    - trainee_self_weights, trainees, trainer_notifications
    - workout_exercises, workout_plan_day_exercises, workout_plan_days
    - workout_plan_exercises, workout_plans
*/

-- PLAN_EXECUTION_EXERCISES
DROP POLICY IF EXISTS "Trainers can view execution exercises" ON plan_execution_exercises;
DROP POLICY IF EXISTS "Trainers can insert execution exercises" ON plan_execution_exercises;
DROP POLICY IF EXISTS "Trainers can update execution exercises" ON plan_execution_exercises;
DROP POLICY IF EXISTS "Trainers can delete execution exercises" ON plan_execution_exercises;

-- PLAN_EXECUTIONS
DROP POLICY IF EXISTS "Trainers can view plan executions" ON plan_executions;
DROP POLICY IF EXISTS "Trainers can insert plan executions" ON plan_executions;
DROP POLICY IF EXISTS "Trainers can update plan executions" ON plan_executions;
DROP POLICY IF EXISTS "Trainers can delete plan executions" ON plan_executions;

-- TRAINEE_AUTH - Keep consolidated
DROP POLICY IF EXISTS "trainer_delete_trainee_auth" ON trainee_auth;
DROP POLICY IF EXISTS "trainer_insert_trainee_auth" ON trainee_auth;
DROP POLICY IF EXISTS "Allow public login" ON trainee_auth;
DROP POLICY IF EXISTS "trainer_select_trainee_auth" ON trainee_auth;
DROP POLICY IF EXISTS "Allow update last_login" ON trainee_auth;
DROP POLICY IF EXISTS "trainer_update_trainee_auth" ON trainee_auth;

-- TRAINEE_SELF_WEIGHTS - Keep consolidated
DROP POLICY IF EXISTS "Trainees can insert own weights" ON trainee_self_weights;
DROP POLICY IF EXISTS "Trainees can view own weights" ON trainee_self_weights;
DROP POLICY IF EXISTS "Trainers can view trainees weights" ON trainee_self_weights;
DROP POLICY IF EXISTS "Trainers can update seen status" ON trainee_self_weights;

-- TRAINEES - Keep consolidated
DROP POLICY IF EXISTS "מאמנים יכולים לראות את המתאמנים של" ON trainees;
DROP POLICY IF EXISTS "מאמנים יכולים לעדכן את המתאמנים של" ON trainees;

-- TRAINER_NOTIFICATIONS - Keep consolidated
DROP POLICY IF EXISTS "Trainers can insert own notifications" ON trainer_notifications;
DROP POLICY IF EXISTS "Trainers can view own notifications" ON trainer_notifications;
DROP POLICY IF EXISTS "Trainers can update own notifications" ON trainer_notifications;
DROP POLICY IF EXISTS "Trainers can delete own notifications" ON trainer_notifications;

-- WORKOUT_EXERCISES - Keep consolidated
DROP POLICY IF EXISTS "trainer_delete_workout_exercises" ON workout_exercises;
DROP POLICY IF EXISTS "מאמנים יכולים למחוק תרגילים מאימו" ON workout_exercises;
DROP POLICY IF EXISTS "trainer_insert_workout_exercises" ON workout_exercises;
DROP POLICY IF EXISTS "מאמנים יכולים להוסיף תרגילים לאימ" ON workout_exercises;
DROP POLICY IF EXISTS "Trainees can view their workout_exercises" ON workout_exercises;
DROP POLICY IF EXISTS "trainer_select_workout_exercises" ON workout_exercises;
DROP POLICY IF EXISTS "מאמנים יכולים לראות תרגילים באימו" ON workout_exercises;
DROP POLICY IF EXISTS "trainer_update_workout_exercises" ON workout_exercises;
DROP POLICY IF EXISTS "מאמנים יכולים לעדכן תרגילים באימו" ON workout_exercises;

-- WORKOUT_PLAN_EXERCISES - Keep consolidated
DROP POLICY IF EXISTS "Trainees can view their plan exercises" ON workout_plan_exercises;
DROP POLICY IF EXISTS "Trainers can view workout plan exercises" ON workout_plan_exercises;
DROP POLICY IF EXISTS "Trainers can insert workout plan exercises" ON workout_plan_exercises;
DROP POLICY IF EXISTS "Trainers can update workout plan exercises" ON workout_plan_exercises;
DROP POLICY IF EXISTS "Trainers can delete workout plan exercises" ON workout_plan_exercises;

-- WORKOUT_PLANS - Keep consolidated
DROP POLICY IF EXISTS "Trainees can view their workout_plans" ON workout_plans;
DROP POLICY IF EXISTS "Trainers can view own workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Trainers can insert own workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Trainers can update own workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Trainers can delete own workout plans" ON workout_plans;

-- WORKOUT_TRAINEES
DROP POLICY IF EXISTS "trainer_select_workout_trainees" ON workout_trainees;

-- WORKOUTS
DROP POLICY IF EXISTS "מאמנים יכולים לראות את האימונים של" ON workouts;
