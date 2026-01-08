/*
  # Create Personal Records Table

  1. New Tables
    - `personal_records`
      - `id` (uuid, primary key)
      - `trainee_id` (uuid, references trainees)
      - `exercise_id` (uuid, references exercises)
      - `record_type` (varchar) - 'max_weight', 'max_reps', 'max_volume'
      - `weight` (decimal) - the weight lifted
      - `reps` (integer) - number of reps
      - `volume` (decimal) - total volume (weight * reps)
      - `achieved_at` (timestamp) - when the record was set
      - `workout_id` (uuid, references workouts)
      - `pair_member` (varchar) - for pair trainees
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on `personal_records` table
    - Add policies for trainers to manage their trainees' records
    - Add policies for trainees to view their own records
*/

CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('max_weight', 'max_reps', 'max_volume')),
  weight DECIMAL(10,2),
  reps INTEGER,
  volume DECIMAL(10,2),
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  pair_member VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trainee_id, exercise_id, record_type, pair_member)
);

CREATE INDEX IF NOT EXISTS idx_personal_records_trainee_id ON personal_records(trainee_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_exercise_id ON personal_records(exercise_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_workout_id ON personal_records(workout_id);

ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their trainees personal records"
  ON personal_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees t
      WHERE t.id = personal_records.trainee_id
      AND t.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert personal records for their trainees"
  ON personal_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees t
      WHERE t.id = personal_records.trainee_id
      AND t.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update personal records for their trainees"
  ON personal_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees t
      WHERE t.id = personal_records.trainee_id
      AND t.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees t
      WHERE t.id = personal_records.trainee_id
      AND t.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete personal records for their trainees"
  ON personal_records
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees t
      WHERE t.id = personal_records.trainee_id
      AND t.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can view their own personal records"
  ON personal_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = personal_records.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );
