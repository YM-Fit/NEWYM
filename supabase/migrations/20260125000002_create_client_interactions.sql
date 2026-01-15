/*
  # Create client_interactions table

  1. New Table
    - `client_interactions` - Track all interactions with clients

  2. Security
    - Enable RLS
    - Policies for trainers to manage interactions for own trainees
*/

-- Create client_interactions table
CREATE TABLE IF NOT EXISTS client_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  
  interaction_type TEXT CHECK (interaction_type IN (
    'call', 'email', 'sms', 'meeting', 'workout', 'message', 'note'
  )) NOT NULL,
  
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  subject TEXT,
  description TEXT,
  outcome TEXT,
  next_action TEXT,
  next_action_date DATE,
  
  -- Link to Google Calendar event (optional)
  google_event_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_interactions_trainee ON client_interactions(trainee_id, interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_interactions_trainer ON client_interactions(trainer_id, interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_interactions_date ON client_interactions(interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_interactions_type ON client_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_client_interactions_next_action ON client_interactions(next_action_date) WHERE next_action_date IS NOT NULL;

-- Enable RLS
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can manage interactions for own trainees"
  ON client_interactions FOR ALL
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = client_interactions.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = client_interactions.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );
