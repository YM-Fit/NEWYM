/*
  # Enhance Workout Plan Completion Mechanism
  
  This migration adds improved completion tracking and notifications for workout plans.
  
  Changes:
  1. Add completion tracking fields to trainee_workout_plans
  2. Add completion notifications table
  3. Create indexes for performance
*/

-- Add completion tracking fields
DO $$
BEGIN
  -- Completion percentage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'completion_percentage'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100);
    
    COMMENT ON COLUMN trainee_workout_plans.completion_percentage IS 'Overall completion percentage of the plan (0-100)';
  END IF;
  
  -- Is completed flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN is_completed BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN trainee_workout_plans.is_completed IS 'Whether the plan is fully completed';
  END IF;
  
  -- Completed at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN completed_at TIMESTAMPTZ;
    
    COMMENT ON COLUMN trainee_workout_plans.completed_at IS 'Timestamp when the plan was completed';
  END IF;
  
  -- Auto-extend flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'auto_extend'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN auto_extend BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN trainee_workout_plans.auto_extend IS 'Whether to automatically extend the plan when it ends';
  END IF;
  
  -- Extension weeks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'extension_weeks'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN extension_weeks INT DEFAULT 0 CHECK (extension_weeks >= 0);
    
    COMMENT ON COLUMN trainee_workout_plans.extension_weeks IS 'Number of weeks to extend the plan by';
  END IF;
END $$;

-- Create index for completion queries
CREATE INDEX IF NOT EXISTS idx_workout_plans_completion 
ON trainee_workout_plans(is_completed, completion_percentage, end_date) 
WHERE is_active = true;

-- Create index for dates
CREATE INDEX IF NOT EXISTS idx_workout_plans_dates 
ON trainee_workout_plans(start_date, end_date) 
WHERE start_date IS NOT NULL AND end_date IS NOT NULL;
