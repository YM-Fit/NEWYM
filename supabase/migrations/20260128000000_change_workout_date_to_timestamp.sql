/*
  # Change workout_date from DATE to TIMESTAMPTZ
  
  This migration changes the workout_date column from DATE to TIMESTAMPTZ
  to preserve the time when workouts are saved.
  
  ## Changes
  - workout_date: DATE -> TIMESTAMPTZ
  - Existing date values will be converted to timestamps at 00:00:00
*/

-- Change workout_date column type from date to timestamptz
ALTER TABLE workouts 
  ALTER COLUMN workout_date TYPE timestamptz 
  USING workout_date::timestamp AT TIME ZONE 'Asia/Jerusalem';

-- Update default to use current timestamp
ALTER TABLE workouts 
  ALTER COLUMN workout_date SET DEFAULT NOW();

-- Add comment
COMMENT ON COLUMN workouts.workout_date IS 'Date and time of the workout (preserves save time)';
