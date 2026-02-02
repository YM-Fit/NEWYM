/*
  # Add Trainee ID to Workout Plan Templates
  
  This migration adds trainee_id column to workout_plan_templates table
  to support both general templates (trainee_id = NULL) and trainee-specific templates.
  
  Changes:
  1. Add trainee_id column (nullable) to workout_plan_templates
  2. Create index on trainee_id for faster lookups
*/

-- Add trainee_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_templates' AND column_name = 'trainee_id'
  ) THEN
    -- Check if trainees table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trainees') THEN
      ALTER TABLE workout_plan_templates 
      ADD COLUMN trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE;
    ELSE
      ALTER TABLE workout_plan_templates 
      ADD COLUMN trainee_id UUID;
    END IF;
    
    COMMENT ON COLUMN workout_plan_templates.trainee_id IS 'Optional trainee ID for trainee-specific templates. NULL means general template.';
  END IF;
END $$;

-- Create index for trainee_id
CREATE INDEX IF NOT EXISTS idx_workout_plan_templates_trainee_id 
ON workout_plan_templates(trainee_id) 
WHERE trainee_id IS NOT NULL;

-- Create composite index for trainer_id and trainee_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_workout_plan_templates_trainer_trainee 
ON workout_plan_templates(trainer_id, trainee_id);
