/*
  # Create CRM automation tables

  1. New Tables
    - `crm_automation_rules` - Automation rules configuration
    - `crm_automation_tasks` - Tasks created by automation

  2. Security
    - Enable RLS
    - Policies for trainers to manage own automation
*/

-- Create crm_automation_rules table
CREATE TABLE IF NOT EXISTS crm_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  
  rule_type TEXT CHECK (rule_type IN ('reminder', 'alert', 'workflow', 'notification')) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  
  -- Conditions and actions stored as JSONB
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  schedule JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create crm_automation_tasks table
CREATE TABLE IF NOT EXISTS crm_automation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES crm_automation_rules(id) ON DELETE SET NULL,
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  
  task_type TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_trainer ON crm_automation_rules(trainer_id, enabled);
CREATE INDEX IF NOT EXISTS idx_automation_rules_type ON crm_automation_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_trainer ON crm_automation_tasks(trainer_id, completed, due_date);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_trainee ON crm_automation_tasks(trainee_id, completed);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_due_date ON crm_automation_tasks(due_date) WHERE completed = false;

-- Enable RLS
ALTER TABLE crm_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_automation_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_automation_rules
CREATE POLICY "Trainers can manage own automation rules"
  ON crm_automation_rules FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- RLS Policies for crm_automation_tasks
CREATE POLICY "Trainers can view own automation tasks"
  ON crm_automation_tasks FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can manage own automation tasks"
  ON crm_automation_tasks FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own automation tasks"
  ON crm_automation_tasks FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_automation_rule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER trigger_update_automation_rule_updated_at
  BEFORE UPDATE ON crm_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_rule_updated_at();
