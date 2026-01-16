/*
  # Create segments table

  1. New Table
    - `crm_segments` - Saved filter segments

  2. Security
    - Enable RLS
    - Policies for trainers to manage own segments
*/

-- Create crm_segments table
CREATE TABLE IF NOT EXISTS crm_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  filter_criteria JSONB DEFAULT '[]'::jsonb,
  auto_update BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(trainer_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_segments_trainer ON crm_segments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_segments_auto_update ON crm_segments(trainer_id, auto_update) WHERE auto_update = true;

-- Enable RLS
ALTER TABLE crm_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can manage own segments"
  ON crm_segments FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_segment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER trigger_update_segment_updated_at
  BEFORE UPDATE ON crm_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_segment_updated_at();
