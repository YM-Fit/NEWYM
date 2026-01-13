/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Add Missing Indexes for Foreign Keys
  - Add index on `exercise_sets.superset_exercise_id`
  - Add index on `workout_exercises.exercise_id`
  - Add index on `workout_trainees.trainee_id`

  ### 2. Remove Unused Indexes
  - Drop `idx_trainees_is_pair` (not used)
  - Drop `idx_measurements_pair_member` (not used)
  - Drop `idx_workout_exercises_pair_member` (not used)
  - Drop `idx_trainees_status` (not used)
  - Drop `idx_exercises_muscle_group` (not used)

  ### 3. Fix Function Search Path
  - Set explicit search_path for `create_default_exercises_for_trainer`
  - Set explicit search_path for `update_updated_at_column`

  ## Performance Impact
  - Foreign key indexes will improve JOIN performance significantly
  - Removing unused indexes reduces write overhead
  - Fixed function search paths improve security
*/

-- =====================================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- =====================================================

-- Index for exercise_sets.superset_exercise_id
CREATE INDEX IF NOT EXISTS idx_exercise_sets_superset_exercise_id 
ON exercise_sets(superset_exercise_id) 
WHERE superset_exercise_id IS NOT NULL;

-- Index for workout_exercises.exercise_id
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id 
ON workout_exercises(exercise_id);

-- Index for workout_trainees.trainee_id
CREATE INDEX IF NOT EXISTS idx_workout_trainees_trainee_id 
ON workout_trainees(trainee_id);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_trainees_is_pair;
DROP INDEX IF EXISTS idx_measurements_pair_member;
DROP INDEX IF EXISTS idx_workout_exercises_pair_member;
DROP INDEX IF EXISTS idx_trainees_status;
DROP INDEX IF EXISTS idx_exercises_muscle_group;

-- =====================================================
-- 3. FIX FUNCTION SEARCH PATH
-- =====================================================

-- Fix create_default_exercises_for_trainer function
CREATE OR REPLACE FUNCTION create_default_exercises_for_trainer()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO muscle_groups (name, trainer_id)
  VALUES 
    ('חזה', NEW.id),
    ('גב', NEW.id),
    ('כתפיים', NEW.id),
    ('רגליים', NEW.id),
    ('ידיים', NEW.id),
    ('בטן', NEW.id),
    ('קרדיו', NEW.id);
  
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;