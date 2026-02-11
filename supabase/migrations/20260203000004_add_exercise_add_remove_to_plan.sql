/*
  # Add Exercise Add/Remove Tracking to Workout Plan Exercises
  
  This migration adds fields to track when exercises are added or removed by trainees,
  enabling notifications to trainers about plan modifications.
  
  Changes:
  1. Add added_by_trainee boolean to workout_plan_day_exercises
  2. Add removed_by_trainee boolean to workout_plan_day_exercises
  3. Add trainee_added_at timestamp
*/

-- Add added_by_trainee column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'added_by_trainee'
  ) THEN
    ALTER TABLE workout_plan_day_exercises 
    ADD COLUMN added_by_trainee BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN workout_plan_day_exercises.added_by_trainee IS 'Whether this exercise was added by the trainee (not the trainer)';
  END IF;
END $$;

-- Add removed_by_trainee column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'removed_by_trainee'
  ) THEN
    ALTER TABLE workout_plan_day_exercises 
    ADD COLUMN removed_by_trainee BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN workout_plan_day_exercises.removed_by_trainee IS 'Whether this exercise was removed by the trainee';
  END IF;
END $$;

-- Add trainee_added_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'trainee_added_at'
  ) THEN
    ALTER TABLE workout_plan_day_exercises 
    ADD COLUMN trainee_added_at TIMESTAMPTZ;
    
    COMMENT ON COLUMN workout_plan_day_exercises.trainee_added_at IS 'Timestamp when exercise was added by trainee';
  END IF;
END $$;

-- Create index for added_by_trainee to help with queries
CREATE INDEX IF NOT EXISTS idx_workout_plan_day_exercises_added_by_trainee 
ON workout_plan_day_exercises(added_by_trainee) 
WHERE added_by_trainee = true;
