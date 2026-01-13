/*
  # Add failure tracking to exercise sets

  ## Changes
  1. Add `failure` boolean field to `exercise_sets` table
    - Tracks whether the set was taken to failure
    - Default is false (not to failure)
    - Allows trainers to mark when a trainee reached muscular failure

  ## Notes
  - This field helps track training intensity
  - Can be used for progress analysis
  - Non-breaking change (existing sets default to false)
*/

-- Add failure field to exercise_sets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercise_sets' AND column_name = 'failure'
  ) THEN
    ALTER TABLE exercise_sets ADD COLUMN failure boolean DEFAULT false;
  END IF;
END $$;