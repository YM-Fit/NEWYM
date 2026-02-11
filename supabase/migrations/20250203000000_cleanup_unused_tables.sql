/*
  # Cleanup Unused Tables
  
  This migration removes tables that are no longer in use:
  1. trainer_google_tokens - replaced by trainer_google_credentials
  2. workout_plans - replaced by trainee_workout_plans
  
  WARNING: Only run this after confirming the codebase doesn't use these tables!
*/

-- Check if tables are empty before dropping
DO $$
BEGIN
  -- Drop trainer_google_tokens if empty (replaced by trainer_google_credentials)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'trainer_google_tokens'
  ) AND NOT EXISTS (
    SELECT 1 FROM trainer_google_tokens LIMIT 1
  ) THEN
    -- Drop dependent objects first
    DROP POLICY IF EXISTS "מאמנים יכולים לנהל טוקנים" ON trainer_google_tokens;
    DROP TABLE IF EXISTS trainer_google_tokens CASCADE;
    RAISE NOTICE 'Dropped trainer_google_tokens table (replaced by trainer_google_credentials)';
  END IF;

  -- Drop workout_plans if empty (replaced by trainee_workout_plans)
  -- But first check if workout_plan_exercises references it
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'workout_plans'
  ) AND NOT EXISTS (
    SELECT 1 FROM workout_plans LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1 FROM workout_plan_exercises LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1 FROM plan_executions LIMIT 1
  ) THEN
    -- Drop dependent objects first
    DROP POLICY IF EXISTS "Trainers can view own workout plans" ON workout_plans;
    DROP POLICY IF EXISTS "Trainers can insert own workout plans" ON workout_plans;
    DROP POLICY IF EXISTS "Trainers can update own workout plans" ON workout_plans;
    DROP POLICY IF EXISTS "Trainers can delete own workout plans" ON workout_plans;
    DROP POLICY IF EXISTS "trainee_select_own_workout_plans" ON workout_plans;
    
    -- Note: We don't drop workout_plan_exercises or plan_executions as they might be used
    -- But we can drop workout_plans if it's truly empty
    DROP TABLE IF EXISTS workout_plans CASCADE;
    RAISE NOTICE 'Dropped workout_plans table (replaced by trainee_workout_plans)';
  ELSE
    RAISE NOTICE 'Skipping workout_plans drop - has data or dependencies';
  END IF;
END $$;

-- Note: meal_plan_templates is kept even if empty, as it might be used in the future
-- workout_plan_templates is also kept as it has 5 rows
