/*
  # Add Cardio Activities Tracking

  1. New Tables
    - `cardio_types`
      - `id` (uuid, primary key)
      - `trainer_id` (uuid, foreign key to trainers)
      - `name` (text) - שם סוג האירובי (הליכה, ריצה וכו')
      - `created_at` (timestamptz)
    
    - `cardio_activities`
      - `id` (uuid, primary key)
      - `trainee_id` (uuid, foreign key to trainees)
      - `trainer_id` (uuid, foreign key to trainers)
      - `cardio_type_id` (uuid, foreign key to cardio_types)
      - `date` (date) - תאריך הפעילות
      - `avg_weekly_steps` (integer) - ממוצע צעדים שבועי
      - `distance` (decimal) - מרחק בק"מ
      - `duration` (integer) - משך זמן בדקות
      - `frequency` (integer) - תדירות שבועית
      - `weekly_goal_steps` (integer) - יעד צעדים שבועי
      - `notes` (text) - הערות
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Trainers can manage their own cardio types
    - Trainers can manage cardio activities for their trainees
    - Trainees can view their own cardio activities (read-only)

  3. Indexes
    - Index on trainee_id for fast queries
    - Index on date for chronological sorting
    - Index on trainer_id for both tables
*/

-- Create cardio_types table
CREATE TABLE IF NOT EXISTS cardio_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create cardio_activities table
CREATE TABLE IF NOT EXISTS cardio_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  cardio_type_id uuid NOT NULL REFERENCES cardio_types(id) ON DELETE RESTRICT,
  date date NOT NULL DEFAULT CURRENT_DATE,
  avg_weekly_steps integer DEFAULT 0,
  distance decimal(10,2) DEFAULT 0,
  duration integer DEFAULT 0,
  frequency integer DEFAULT 0,
  weekly_goal_steps integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cardio_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardio_activities ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cardio_types_trainer ON cardio_types(trainer_id);
CREATE INDEX IF NOT EXISTS idx_cardio_activities_trainee ON cardio_activities(trainee_id);
CREATE INDEX IF NOT EXISTS idx_cardio_activities_trainer ON cardio_activities(trainer_id);
CREATE INDEX IF NOT EXISTS idx_cardio_activities_date ON cardio_activities(date DESC);

-- RLS Policies for cardio_types

-- Trainers can view their own cardio types
CREATE POLICY "Trainers can view own cardio types"
  ON cardio_types FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

-- Trainers can insert their own cardio types
CREATE POLICY "Trainers can insert own cardio types"
  ON cardio_types FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

-- Trainers can update their own cardio types
CREATE POLICY "Trainers can update own cardio types"
  ON cardio_types FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Trainers can delete their own cardio types
CREATE POLICY "Trainers can delete own cardio types"
  ON cardio_types FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- RLS Policies for cardio_activities

-- Trainers can view cardio activities for their trainees
CREATE POLICY "Trainers can view trainees cardio activities"
  ON cardio_activities FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

-- Trainers can insert cardio activities for their trainees
CREATE POLICY "Trainers can insert trainees cardio activities"
  ON cardio_activities FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

-- Trainers can update cardio activities for their trainees
CREATE POLICY "Trainers can update trainees cardio activities"
  ON cardio_activities FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Trainers can delete cardio activities for their trainees
CREATE POLICY "Trainers can delete trainees cardio activities"
  ON cardio_activities FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- Trainees can view their own cardio activities (read-only)
CREATE POLICY "Trainees can view own cardio activities"
  ON cardio_activities FOR SELECT
  TO authenticated
  USING (
    trainee_id IN (
      SELECT trainee_id FROM trainee_auth WHERE auth_user_id = auth.uid()
    )
  );

-- Trainees can view cardio types from their trainer
CREATE POLICY "Trainees can view trainer cardio types"
  ON cardio_types FOR SELECT
  TO authenticated
  USING (
    trainer_id IN (
      SELECT trainer_id FROM trainees 
      WHERE id IN (
        SELECT trainee_id FROM trainee_auth WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cardio_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_cardio_activities_updated_at_trigger ON cardio_activities;
CREATE TRIGGER update_cardio_activities_updated_at_trigger
  BEFORE UPDATE ON cardio_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_cardio_activities_updated_at();