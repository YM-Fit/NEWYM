/*
  # Add Cardio Settings to Workout Plans
  
  This migration adds cardio-related fields to trainee_workout_plans table
  to support integration with cardio training plans.
  
  Changes:
  1. Add rest_days_between - number of rest days between workout days
  2. Add include_cardio - boolean flag to indicate if plan includes cardio
  3. Add cardio_type_id - reference to cardio_types table
  4. Add cardio_frequency - number of cardio sessions per week
  5. Add cardio_weekly_goal_steps - weekly step goal for cardio
*/

-- Add rest_days_between column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'rest_days_between'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN rest_days_between INTEGER DEFAULT 0 CHECK (rest_days_between >= 0 AND rest_days_between <= 3);
    
    COMMENT ON COLUMN trainee_workout_plans.rest_days_between IS 'Number of rest days between workout days (0-3)';
  END IF;
END $$;

-- Add include_cardio column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'include_cardio'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN include_cardio BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN trainee_workout_plans.include_cardio IS 'Whether the plan includes cardio training';
  END IF;
END $$;

-- Add cardio_type_id column (references cardio_types if table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'cardio_type_id'
  ) THEN
    -- Check if cardio_types table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cardio_types') THEN
      ALTER TABLE trainee_workout_plans 
      ADD COLUMN cardio_type_id UUID REFERENCES cardio_types(id) ON DELETE SET NULL;
    ELSE
      ALTER TABLE trainee_workout_plans 
      ADD COLUMN cardio_type_id UUID;
    END IF;
    
    COMMENT ON COLUMN trainee_workout_plans.cardio_type_id IS 'Reference to cardio type for this plan';
  END IF;
END $$;

-- Add cardio_frequency column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'cardio_frequency'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN cardio_frequency INTEGER CHECK (cardio_frequency >= 0 AND cardio_frequency <= 7);
    
    COMMENT ON COLUMN trainee_workout_plans.cardio_frequency IS 'Number of cardio sessions per week (0-7)';
  END IF;
END $$;

-- Add cardio_weekly_goal_steps column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'cardio_weekly_goal_steps'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN cardio_weekly_goal_steps INTEGER CHECK (cardio_weekly_goal_steps >= 0);
    
    COMMENT ON COLUMN trainee_workout_plans.cardio_weekly_goal_steps IS 'Weekly step goal for cardio training';
  END IF;
END $$;

-- Create index for cardio_type_id if it exists
CREATE INDEX IF NOT EXISTS idx_trainee_workout_plans_cardio_type_id 
ON trainee_workout_plans(cardio_type_id) 
WHERE cardio_type_id IS NOT NULL;
