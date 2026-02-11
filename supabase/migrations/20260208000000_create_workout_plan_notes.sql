/*
  # Create Workout Plan Notes Table
  
  This migration creates a comprehensive notes system for workout plans
  supporting notes at different levels: plan, day, exercise, and set.
  
  Changes:
  1. Create workout_plan_notes table
     - Support for notes at plan, day, exercise, and set levels
     - Pin important notes
     - Search and filter capabilities
     - Full CRUD operations
*/

-- Create workout_plan_notes table
CREATE TABLE IF NOT EXISTS workout_plan_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES trainee_workout_plans(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('plan', 'day', 'exercise', 'set')),
  day_id UUID REFERENCES workout_plan_days(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES workout_plan_day_exercises(id) ON DELETE CASCADE,
  set_id TEXT, -- For future use, can be JSONB or text identifier
  note_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_plan_notes_plan_id ON workout_plan_notes(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_plan_notes_level ON workout_plan_notes(level);
CREATE INDEX IF NOT EXISTS idx_workout_plan_notes_day_id ON workout_plan_notes(day_id) WHERE day_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_plan_notes_exercise_id ON workout_plan_notes(exercise_id) WHERE exercise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_plan_notes_is_pinned ON workout_plan_notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_workout_plan_notes_created_at ON workout_plan_notes(created_at DESC);

-- Full text search index for note_text
CREATE INDEX IF NOT EXISTS idx_workout_plan_notes_text_search ON workout_plan_notes USING gin(to_tsvector('hebrew', note_text));

-- Enable RLS
ALTER TABLE workout_plan_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trainers
CREATE POLICY "Trainers can view their plan notes"
  ON workout_plan_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = workout_plan_notes.plan_id
      AND twp.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert their plan notes"
  ON workout_plan_notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = workout_plan_notes.plan_id
      AND twp.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update their plan notes"
  ON workout_plan_notes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = workout_plan_notes.plan_id
      AND twp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = workout_plan_notes.plan_id
      AND twp.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete their plan notes"
  ON workout_plan_notes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = workout_plan_notes.plan_id
      AND twp.trainer_id = auth.uid()
    )
  );

-- RLS Policies for trainees (read-only)
CREATE POLICY "Trainees can view their plan notes"
  ON workout_plan_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE twp.id = workout_plan_notes.plan_id
      AND ta.auth_user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workout_plan_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_workout_plan_notes_timestamp ON workout_plan_notes;
CREATE TRIGGER trigger_update_workout_plan_notes_timestamp
  BEFORE UPDATE ON workout_plan_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_plan_notes_timestamp();

-- Comments
COMMENT ON TABLE workout_plan_notes IS 'Notes for workout plans at different levels (plan, day, exercise, set)';
COMMENT ON COLUMN workout_plan_notes.level IS 'Level of the note: plan, day, exercise, or set';
COMMENT ON COLUMN workout_plan_notes.is_pinned IS 'Whether the note is pinned (shown first)';
COMMENT ON COLUMN workout_plan_notes.set_id IS 'Optional identifier for set-level notes (can be JSONB or text)';
