/*
  # Create Mental Tools System

  1. New Tables
    - `mental_tools`
      - `id` (uuid, primary key)
      - `trainee_id` (uuid, foreign key to trainees)
      - `trainer_id` (uuid, foreign key to trainers)
      - `title` (text) - Tool title
      - `description` (text) - Detailed description
      - `category` (text) - motivation/discipline/patience/focus/other
      - `priority` (integer 1-5)
      - `is_completed` (boolean)
      - `completed_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `mental_tools` table
    - Add policies for trainer access (CRUD)
    - Add policies for trainee read access
*/

CREATE TABLE IF NOT EXISTS mental_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('motivation', 'discipline', 'patience', 'focus', 'other')),
  priority integer NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mental_tools_trainee ON mental_tools(trainee_id);
CREATE INDEX IF NOT EXISTS idx_mental_tools_trainer ON mental_tools(trainer_id);
CREATE INDEX IF NOT EXISTS idx_mental_tools_category ON mental_tools(category);

ALTER TABLE mental_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view mental tools for their trainees"
  ON mental_tools FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() OR
    trainee_id IN (
      SELECT ta.trainee_id FROM trainee_auth ta WHERE ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert mental tools for their trainees"
  ON mental_tools FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their mental tools"
  ON mental_tools FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete their mental tools"
  ON mental_tools FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());
