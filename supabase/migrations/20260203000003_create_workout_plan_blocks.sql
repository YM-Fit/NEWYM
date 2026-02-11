/*
  # Create Workout Plan Blocks Table
  
  This migration creates a new table for workout plan blocks.
  Blocks are reusable components that can be combined to create full workout plans.
  
  Changes:
  1. Create workout_plan_blocks table
  2. Add RLS policies
  3. Create indexes
*/

-- Create workout_plan_blocks table
CREATE TABLE IF NOT EXISTS workout_plan_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT name_not_empty CHECK (char_length(name) > 0)
);

-- Add comment
COMMENT ON TABLE workout_plan_blocks IS 'Reusable workout plan blocks that can be combined to create full plans';
COMMENT ON COLUMN workout_plan_blocks.days IS 'JSONB array of WorkoutDay objects';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workout_plan_blocks_trainer_id 
ON workout_plan_blocks(trainer_id);

CREATE INDEX IF NOT EXISTS idx_workout_plan_blocks_created_at 
ON workout_plan_blocks(created_at DESC);

-- Enable RLS
ALTER TABLE workout_plan_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Trainers can view their own blocks
CREATE POLICY "trainers_view_own_blocks"
  ON workout_plan_blocks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainers t
      WHERE t.id = workout_plan_blocks.trainer_id
      AND t.user_id = auth.uid()
    )
  );

-- Trainers can create their own blocks
CREATE POLICY "trainers_create_own_blocks"
  ON workout_plan_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainers t
      WHERE t.id = workout_plan_blocks.trainer_id
      AND t.user_id = auth.uid()
    )
  );

-- Trainers can update their own blocks
CREATE POLICY "trainers_update_own_blocks"
  ON workout_plan_blocks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainers t
      WHERE t.id = workout_plan_blocks.trainer_id
      AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainers t
      WHERE t.id = workout_plan_blocks.trainer_id
      AND t.user_id = auth.uid()
    )
  );

-- Trainers can delete their own blocks
CREATE POLICY "trainers_delete_own_blocks"
  ON workout_plan_blocks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainers t
      WHERE t.id = workout_plan_blocks.trainer_id
      AND t.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workout_plan_blocks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_workout_plan_blocks_timestamp ON workout_plan_blocks;
CREATE TRIGGER trigger_update_workout_plan_blocks_timestamp
  BEFORE UPDATE ON workout_plan_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_plan_blocks_timestamp();
