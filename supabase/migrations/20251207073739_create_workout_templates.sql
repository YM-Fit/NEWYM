/*
  # Create Workout Templates System

  1. New Tables
    - `workout_templates`
      - `id` (uuid, primary key) - Unique template identifier
      - `trainer_id` (uuid, foreign key) - References auth.users (trainer who created)
      - `name` (text, not null) - Template name
      - `description` (text) - Optional description
      - `exercises` (jsonb, not null) - Array of exercises with sets configuration
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      - `usage_count` (integer) - Track how many times template was used

  2. Security
    - Enable RLS on `workout_templates` table
    - Trainers can only view and manage their own templates
    - Policies for select, insert, update, and delete operations

  3. Indexes
    - Index on trainer_id for faster lookups
    - Index on created_at for sorting

  4. Notes
    - Templates store exercise structure (exercise_id, sets count, target reps/weight)
    - Usage counter helps identify popular templates
    - Trainers can create unlimited templates
*/

-- Create workout_templates table
CREATE TABLE IF NOT EXISTS workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  usage_count integer DEFAULT 0,
  CONSTRAINT name_not_empty CHECK (char_length(name) > 0)
);

-- Enable RLS
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Trainers can view own templates"
  ON workout_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can create own templates"
  ON workout_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update own templates"
  ON workout_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete own templates"
  ON workout_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = trainer_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_templates_trainer_id 
  ON workout_templates(trainer_id);

CREATE INDEX IF NOT EXISTS idx_workout_templates_created_at 
  ON workout_templates(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workout_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_workout_templates_timestamp'
  ) THEN
    CREATE TRIGGER update_workout_templates_timestamp
      BEFORE UPDATE ON workout_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_workout_templates_updated_at();
  END IF;
END $$;