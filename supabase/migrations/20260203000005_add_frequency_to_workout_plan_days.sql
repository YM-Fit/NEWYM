/*
  # Add Frequency to Workout Plan Days
  
  This migration adds the times_per_week field to workout_plan_days table
  to allow trainers to specify how many times per week each day should be executed.
  
  Changes:
  1. Add times_per_week - number of times per week this day should be executed (0-7, default 1)
  
  Important:
  - Uses DO $$ BEGIN ... END $$ with column existence check
  - Includes COMMENT ON COLUMN for documentation
  - Default value is 1 (once per week)
*/

-- Add times_per_week column to workout_plan_days
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_days' AND column_name = 'times_per_week'
  ) THEN
    ALTER TABLE workout_plan_days 
    ADD COLUMN times_per_week INTEGER DEFAULT 1 CHECK (times_per_week >= 0 AND times_per_week <= 7);
    
    COMMENT ON COLUMN workout_plan_days.times_per_week IS 'Number of times per week this day should be executed (0-7). Default is 1.';
  END IF;
END $$;

-- Create index for better query performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_workout_plan_days_times_per_week'
  ) THEN
    CREATE INDEX idx_workout_plan_days_times_per_week ON workout_plan_days(times_per_week);
  END IF;
END $$;
