/*
  # Enhance Workout Plan Blocks with Time Range and Volume
  
  This migration adds time range and volume control features to workout plan blocks.
  
  Changes:
  1. Add time range fields (start_week, end_week, start_month, end_month)
  2. Add volume_multiplier for block-level volume control
  3. Add exercise_volume_overrides for exercise-specific volume control
*/

-- Add time range fields to workout_plan_blocks
DO $$
BEGIN
  -- Start week
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_blocks' AND column_name = 'start_week'
  ) THEN
    ALTER TABLE workout_plan_blocks 
    ADD COLUMN start_week INT CHECK (start_week > 0);
    
    COMMENT ON COLUMN workout_plan_blocks.start_week IS 'Starting week number for this block (1-based)';
  END IF;
  
  -- End week
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_blocks' AND column_name = 'end_week'
  ) THEN
    ALTER TABLE workout_plan_blocks 
    ADD COLUMN end_week INT CHECK (end_week > 0);
    
    COMMENT ON COLUMN workout_plan_blocks.end_week IS 'Ending week number for this block (1-based)';
  END IF;
  
  -- Start month
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_blocks' AND column_name = 'start_month'
  ) THEN
    ALTER TABLE workout_plan_blocks 
    ADD COLUMN start_month INT CHECK (start_month >= 1 AND start_month <= 12);
    
    COMMENT ON COLUMN workout_plan_blocks.start_month IS 'Starting month for this block (1-12)';
  END IF;
  
  -- End month
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_blocks' AND column_name = 'end_month'
  ) THEN
    ALTER TABLE workout_plan_blocks 
    ADD COLUMN end_month INT CHECK (end_month >= 1 AND end_month <= 12);
    
    COMMENT ON COLUMN workout_plan_blocks.end_month IS 'Ending month for this block (1-12)';
  END IF;
  
  -- Volume multiplier
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_blocks' AND column_name = 'volume_multiplier'
  ) THEN
    ALTER TABLE workout_plan_blocks 
    ADD COLUMN volume_multiplier DECIMAL(5,2) DEFAULT 1.0 CHECK (volume_multiplier >= 0);
    
    COMMENT ON COLUMN workout_plan_blocks.volume_multiplier IS 'Volume multiplier for the entire block (e.g., 1.2 = 20% increase, 0.9 = 10% decrease)';
  END IF;
  
  -- Exercise volume overrides
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_blocks' AND column_name = 'exercise_volume_overrides'
  ) THEN
    ALTER TABLE workout_plan_blocks 
    ADD COLUMN exercise_volume_overrides JSONB DEFAULT '{}'::jsonb;
    
    COMMENT ON COLUMN workout_plan_blocks.exercise_volume_overrides IS 'Exercise-specific volume overrides: {exercise_id: {weight_multiplier, reps_multiplier, sets_multiplier}}';
  END IF;
END $$;

-- Create indexes for time range queries
CREATE INDEX IF NOT EXISTS idx_workout_plan_blocks_weeks 
ON workout_plan_blocks(start_week, end_week) 
WHERE start_week IS NOT NULL AND end_week IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_plan_blocks_months 
ON workout_plan_blocks(start_month, end_month) 
WHERE start_month IS NOT NULL AND end_month IS NOT NULL;

-- Add constraint to ensure end >= start for weeks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_blocks_week_range'
  ) THEN
    ALTER TABLE workout_plan_blocks
    ADD CONSTRAINT check_blocks_week_range 
    CHECK (start_week IS NULL OR end_week IS NULL OR end_week >= start_week);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_blocks_month_range'
  ) THEN
    ALTER TABLE workout_plan_blocks
    ADD CONSTRAINT check_blocks_month_range 
    CHECK (start_month IS NULL OR end_month IS NULL OR end_month >= start_month);
  END IF;
END $$;
