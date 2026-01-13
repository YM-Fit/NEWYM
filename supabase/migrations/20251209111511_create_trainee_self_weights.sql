/*
  # Create Trainee Self Weights Table

  1. New Tables
    - `trainee_self_weights`
      - `id` (uuid, primary key)
      - `trainee_id` (uuid, foreign key to trainees)
      - `weight_kg` (numeric, the self-reported weight)
      - `weight_date` (date, when the weight was measured)
      - `notes` (text, optional notes)
      - `is_seen_by_trainer` (boolean, whether trainer has seen this)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `trainee_self_weights` table
    - Add policy for trainees to insert their own weights
    - Add policy for trainees to view their own weights
    - Add policy for trainers to view their trainees' weights
    - Add policy for trainers to update is_seen_by_trainer

  3. Indexes
    - Index on trainee_id for faster lookups
    - Index on weight_date for date-based queries
*/

CREATE TABLE IF NOT EXISTS trainee_self_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  weight_kg numeric NOT NULL,
  weight_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  is_seen_by_trainer boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trainee_self_weights ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_trainee_self_weights_trainee_id 
  ON trainee_self_weights(trainee_id);

CREATE INDEX IF NOT EXISTS idx_trainee_self_weights_date 
  ON trainee_self_weights(weight_date DESC);

CREATE INDEX IF NOT EXISTS idx_trainee_self_weights_unseen 
  ON trainee_self_weights(trainee_id, is_seen_by_trainer) 
  WHERE is_seen_by_trainer = false;

CREATE POLICY "Trainees can insert own weights"
  ON trainee_self_weights
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trainee_id IN (
      SELECT ta.trainee_id 
      FROM trainee_auth ta 
      WHERE ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can view own weights"
  ON trainee_self_weights
  FOR SELECT
  TO authenticated
  USING (
    trainee_id IN (
      SELECT ta.trainee_id 
      FROM trainee_auth ta 
      WHERE ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can view trainees weights"
  ON trainee_self_weights
  FOR SELECT
  TO authenticated
  USING (
    trainee_id IN (
      SELECT t.id 
      FROM trainees t 
      JOIN trainers tr ON t.trainer_id = tr.id 
      WHERE tr.id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update seen status"
  ON trainee_self_weights
  FOR UPDATE
  TO authenticated
  USING (
    trainee_id IN (
      SELECT t.id 
      FROM trainees t 
      JOIN trainers tr ON t.trainer_id = tr.id 
      WHERE tr.id = auth.uid()
    )
  )
  WITH CHECK (
    trainee_id IN (
      SELECT t.id 
      FROM trainees t 
      JOIN trainers tr ON t.trainer_id = tr.id 
      WHERE tr.id = auth.uid()
    )
  );
