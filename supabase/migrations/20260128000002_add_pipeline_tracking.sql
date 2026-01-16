/*
  # Create pipeline_movements table for tracking CRM pipeline changes

  1. New Table
    - `pipeline_movements` - Track all pipeline status changes

  2. Security
    - Enable RLS
    - Policies for trainers to view own pipeline movements
*/

-- Create pipeline_movements table
CREATE TABLE IF NOT EXISTS pipeline_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  
  from_status TEXT CHECK (from_status IN ('lead', 'qualified', 'active', 'inactive', 'churned', 'on_hold')),
  to_status TEXT CHECK (to_status IN ('lead', 'qualified', 'active', 'inactive', 'churned', 'on_hold')) NOT NULL,
  
  reason TEXT,
  moved_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_movements_trainee ON pipeline_movements(trainee_id, moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_movements_trainer ON pipeline_movements(trainer_id, moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_movements_status ON pipeline_movements(to_status, moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_movements_date ON pipeline_movements(moved_at DESC);

-- Enable RLS
ALTER TABLE pipeline_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can view own pipeline movements"
  ON pipeline_movements FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own pipeline movements"
  ON pipeline_movements FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

-- Function to automatically log pipeline movements
CREATE OR REPLACE FUNCTION log_pipeline_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.crm_status IS DISTINCT FROM NEW.crm_status THEN
    INSERT INTO pipeline_movements (
      trainee_id,
      trainer_id,
      from_status,
      to_status,
      reason,
      moved_at
    ) VALUES (
      NEW.id,
      NEW.trainer_id,
      OLD.crm_status,
      NEW.crm_status,
      'Status updated',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically log pipeline movements
CREATE TRIGGER trigger_log_pipeline_movement
  AFTER UPDATE OF crm_status ON trainees
  FOR EACH ROW
  WHEN (OLD.crm_status IS DISTINCT FROM NEW.crm_status)
  EXECUTE FUNCTION log_pipeline_movement();
