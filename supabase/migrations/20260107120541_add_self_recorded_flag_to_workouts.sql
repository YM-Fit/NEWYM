/*
  # Add self-recorded flag to workouts
  
  1. New Column
    - `is_self_recorded` (boolean) - marks workouts recorded by trainee themselves
    
  2. Purpose
    - Allows trainers to distinguish between workouts they recorded vs trainee self-recorded
*/

ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS is_self_recorded boolean DEFAULT false;

COMMENT ON COLUMN workouts.is_self_recorded IS 'True if workout was recorded by the trainee themselves';
