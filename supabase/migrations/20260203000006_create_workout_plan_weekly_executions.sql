/*
  # Create Workout Plan Weekly Executions Table
  
  This migration creates a new table to track weekly workout plan executions.
  This allows tracking how many times per week each day of a plan is completed.
  
  Changes:
  1. Create workout_plan_weekly_executions table
  2. Add indexes for performance
  3. Add RLS policies for trainers and trainees
  4. Add comments for documentation
  
  Important:
  - Uses DO $$ BEGIN ... END $$ with table existence check
  - Includes COMMENT ON TABLE and COMMENT ON COLUMN for documentation
  - RLS policies ensure trainers can manage executions for their trainees
  - Trainees can only view/insert their own executions
*/

-- Create workout_plan_weekly_executions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'workout_plan_weekly_executions'
  ) THEN
    CREATE TABLE workout_plan_weekly_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id UUID NOT NULL REFERENCES trainee_workout_plans(id) ON DELETE CASCADE,
      day_id UUID NOT NULL REFERENCES workout_plan_days(id) ON DELETE CASCADE,
      week_start_date DATE NOT NULL,
      execution_date DATE NOT NULL DEFAULT CURRENT_DATE,
      completed_at TIMESTAMPTZ,
      workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      
      -- Ensure one execution per day per week (can be multiple per week if times_per_week > 1)
      -- But we track each execution separately
      CONSTRAINT valid_week_start_date CHECK (week_start_date <= execution_date),
      CONSTRAINT valid_execution_date CHECK (execution_date >= week_start_date AND execution_date < week_start_date + INTERVAL '7 days')
    );
    
    COMMENT ON TABLE workout_plan_weekly_executions IS 'Tracks weekly executions of workout plan days. Each record represents one completion of a day within a specific week.';
    COMMENT ON COLUMN workout_plan_weekly_executions.plan_id IS 'Reference to the workout plan';
    COMMENT ON COLUMN workout_plan_weekly_executions.day_id IS 'Reference to the specific day that was executed';
    COMMENT ON COLUMN workout_plan_weekly_executions.week_start_date IS 'Date of Sunday (start of week) for this execution';
    COMMENT ON COLUMN workout_plan_weekly_executions.execution_date IS 'Actual date when the workout was completed';
    COMMENT ON COLUMN workout_plan_weekly_executions.completed_at IS 'Timestamp when the execution was marked as complete';
    COMMENT ON COLUMN workout_plan_weekly_executions.workout_id IS 'Optional link to the actual workout record if one was created';
    COMMENT ON COLUMN workout_plan_weekly_executions.notes IS 'Optional notes about this execution';
  END IF;
END $$;

-- Create indexes for better query performance
DO $$
BEGIN
  -- Index for querying by plan and week
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_workout_plan_weekly_executions_plan_week'
  ) THEN
    CREATE INDEX idx_workout_plan_weekly_executions_plan_week 
    ON workout_plan_weekly_executions(plan_id, week_start_date);
  END IF;
  
  -- Index for querying by day and week
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_workout_plan_weekly_executions_day_week'
  ) THEN
    CREATE INDEX idx_workout_plan_weekly_executions_day_week 
    ON workout_plan_weekly_executions(day_id, week_start_date);
  END IF;
  
  -- Index for querying by execution date
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_workout_plan_weekly_executions_execution_date'
  ) THEN
    CREATE INDEX idx_workout_plan_weekly_executions_execution_date 
    ON workout_plan_weekly_executions(execution_date DESC);
  END IF;
  
  -- Index for querying by workout_id (if linked)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_workout_plan_weekly_executions_workout_id'
  ) THEN
    CREATE INDEX idx_workout_plan_weekly_executions_workout_id 
    ON workout_plan_weekly_executions(workout_id) WHERE workout_id IS NOT NULL;
  END IF;
END $$;

-- Enable RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'workout_plan_weekly_executions'
  ) THEN
    ALTER TABLE workout_plan_weekly_executions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- RLS Policies for Trainers
-- Trainers can view executions for their trainees' plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_plan_weekly_executions'
    AND policyname = 'trainers_view_weekly_executions'
  ) THEN
    EXECUTE '
    CREATE POLICY "trainers_view_weekly_executions"
      ON workout_plan_weekly_executions
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM trainee_workout_plans twp
          WHERE twp.id = workout_plan_weekly_executions.plan_id
            AND twp.trainer_id = (SELECT auth.uid())
        )
      )';
  END IF;
END $$;

-- Trainers can insert executions for their trainees' plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_plan_weekly_executions'
    AND policyname = 'trainers_insert_weekly_executions'
  ) THEN
    EXECUTE '
    CREATE POLICY "trainers_insert_weekly_executions"
      ON workout_plan_weekly_executions
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trainee_workout_plans twp
          WHERE twp.id = workout_plan_weekly_executions.plan_id
            AND twp.trainer_id = (SELECT auth.uid())
        )
      )';
  END IF;
END $$;

-- Trainers can update executions for their trainees' plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_plan_weekly_executions'
    AND policyname = 'trainers_update_weekly_executions'
  ) THEN
    EXECUTE '
    CREATE POLICY "trainers_update_weekly_executions"
      ON workout_plan_weekly_executions
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM trainee_workout_plans twp
          WHERE twp.id = workout_plan_weekly_executions.plan_id
            AND twp.trainer_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trainee_workout_plans twp
          WHERE twp.id = workout_plan_weekly_executions.plan_id
            AND twp.trainer_id = (SELECT auth.uid())
        )
      )';
  END IF;
END $$;

-- Trainers can delete executions for their trainees' plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_plan_weekly_executions'
    AND policyname = 'trainers_delete_weekly_executions'
  ) THEN
    EXECUTE '
    CREATE POLICY "trainers_delete_weekly_executions"
      ON workout_plan_weekly_executions
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM trainee_workout_plans twp
          WHERE twp.id = workout_plan_weekly_executions.plan_id
            AND twp.trainer_id = (SELECT auth.uid())
        )
      )';
  END IF;
END $$;

-- RLS Policies for Trainees
-- Trainees can view their own executions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_plan_weekly_executions'
    AND policyname = 'trainees_view_own_weekly_executions'
  ) THEN
    EXECUTE '
    CREATE POLICY "trainees_view_own_weekly_executions"
      ON workout_plan_weekly_executions
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM trainee_workout_plans twp
          JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
          WHERE twp.id = workout_plan_weekly_executions.plan_id
            AND ta.auth_user_id = (SELECT auth.uid())
        )
      )';
  END IF;
END $$;

-- Trainees can insert their own executions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_plan_weekly_executions'
    AND policyname = 'trainees_insert_own_weekly_executions'
  ) THEN
    EXECUTE '
    CREATE POLICY "trainees_insert_own_weekly_executions"
      ON workout_plan_weekly_executions
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trainee_workout_plans twp
          JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
          WHERE twp.id = workout_plan_weekly_executions.plan_id
            AND ta.auth_user_id = (SELECT auth.uid())
        )
      )';
  END IF;
END $$;

-- Trainees can update their own executions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_plan_weekly_executions'
    AND policyname = 'trainees_update_own_weekly_executions'
  ) THEN
    EXECUTE '
    CREATE POLICY "trainees_update_own_weekly_executions"
      ON workout_plan_weekly_executions
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM trainee_workout_plans twp
          JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
          WHERE twp.id = workout_plan_weekly_executions.plan_id
            AND ta.auth_user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trainee_workout_plans twp
          JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
          WHERE twp.id = workout_plan_weekly_executions.plan_id
            AND ta.auth_user_id = (SELECT auth.uid())
        )
      )';
  END IF;
END $$;
