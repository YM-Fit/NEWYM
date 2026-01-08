/*
  # Create Trainee Goals, Notes, and Important Dates Tables

  1. New Tables
    - `trainee_goals`
      - `id` (uuid, primary key)
      - `trainee_id` (uuid, references trainees)
      - `goal_type` (varchar) - 'weight', 'strength', 'measurement', 'custom'
      - `title` (varchar) - goal title
      - `target_value` (decimal) - target value
      - `current_value` (decimal) - current progress
      - `unit` (varchar) - measurement unit
      - `target_date` (date) - target completion date
      - `exercise_id` (uuid, optional) - for strength goals
      - `status` (varchar) - 'active', 'achieved', 'cancelled'
      - `notes` (text) - optional notes
      - `pair_member` (varchar) - for pair trainees
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `trainer_notes`
      - `id` (uuid, primary key)
      - `trainee_id` (uuid, references trainees)
      - `trainer_id` (uuid, references trainers)
      - `note_text` (text) - the note content
      - `is_pinned` (boolean) - pin important notes
      - `category` (varchar) - 'general', 'health', 'nutrition', 'training', 'personal'
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `trainee_important_dates`
      - `id` (uuid, primary key)
      - `trainee_id` (uuid, references trainees)
      - `date_type` (varchar) - 'birthday', 'start_date', 'goal_date', 'event', 'custom'
      - `date_value` (date) - the date
      - `label` (varchar) - description/name
      - `remind_before_days` (integer) - days before to remind
      - `pair_member` (varchar) - for pair trainees
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on all tables
    - Add policies for trainers to manage their trainees' data
    - Add policies for trainees to view their own data
*/

-- Trainee Goals Table
CREATE TABLE IF NOT EXISTS trainee_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('weight', 'strength', 'measurement', 'custom')),
  title VARCHAR(255) NOT NULL,
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  unit VARCHAR(20),
  target_date DATE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'cancelled')),
  notes TEXT,
  pair_member VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainee_goals_trainee_id ON trainee_goals(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_goals_status ON trainee_goals(status);

ALTER TABLE trainee_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their trainees goals"
  ON trainee_goals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_goals.trainee_id AND t.trainer_id = auth.uid()));

CREATE POLICY "Trainers can insert goals for their trainees"
  ON trainee_goals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_goals.trainee_id AND t.trainer_id = auth.uid()));

CREATE POLICY "Trainers can update goals for their trainees"
  ON trainee_goals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_goals.trainee_id AND t.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_goals.trainee_id AND t.trainer_id = auth.uid()));

CREATE POLICY "Trainers can delete goals for their trainees"
  ON trainee_goals FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_goals.trainee_id AND t.trainer_id = auth.uid()));

CREATE POLICY "Trainees can view their own goals"
  ON trainee_goals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_goals.trainee_id AND ta.auth_user_id = auth.uid()));


-- Trainer Notes Table
CREATE TABLE IF NOT EXISTS trainer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  category VARCHAR(20) DEFAULT 'general' CHECK (category IN ('general', 'health', 'nutrition', 'training', 'personal')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainer_notes_trainee_id ON trainer_notes(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_trainer_id ON trainer_notes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_is_pinned ON trainer_notes(is_pinned);

ALTER TABLE trainer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their own notes"
  ON trainer_notes FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert their own notes"
  ON trainer_notes FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid() AND EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainer_notes.trainee_id AND t.trainer_id = auth.uid()));

CREATE POLICY "Trainers can update their own notes"
  ON trainer_notes FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete their own notes"
  ON trainer_notes FOR DELETE TO authenticated
  USING (trainer_id = auth.uid());


-- Trainee Important Dates Table
CREATE TABLE IF NOT EXISTS trainee_important_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  date_type VARCHAR(20) NOT NULL CHECK (date_type IN ('birthday', 'start_date', 'goal_date', 'event', 'custom')),
  date_value DATE NOT NULL,
  label VARCHAR(255) NOT NULL,
  remind_before_days INTEGER DEFAULT 0,
  pair_member VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainee_important_dates_trainee_id ON trainee_important_dates(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_important_dates_date_value ON trainee_important_dates(date_value);

ALTER TABLE trainee_important_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their trainees important dates"
  ON trainee_important_dates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_important_dates.trainee_id AND t.trainer_id = auth.uid()));

CREATE POLICY "Trainers can insert important dates for their trainees"
  ON trainee_important_dates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_important_dates.trainee_id AND t.trainer_id = auth.uid()));

CREATE POLICY "Trainers can update important dates for their trainees"
  ON trainee_important_dates FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_important_dates.trainee_id AND t.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_important_dates.trainee_id AND t.trainer_id = auth.uid()));

CREATE POLICY "Trainers can delete important dates for their trainees"
  ON trainee_important_dates FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_important_dates.trainee_id AND t.trainer_id = auth.uid()));

CREATE POLICY "Trainees can view their own important dates"
  ON trainee_important_dates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_important_dates.trainee_id AND ta.auth_user_id = auth.uid()));
