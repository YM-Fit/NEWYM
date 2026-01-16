/*
  # Create communication templates and messages tables

  1. New Tables
    - `crm_communication_templates` - Email/SMS templates
    - `crm_communication_messages` - Communication history

  2. Security
    - Enable RLS
    - Policies for trainers to manage own communications
*/

-- Create crm_communication_templates table
CREATE TABLE IF NOT EXISTS crm_communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  
  template_type TEXT CHECK (template_type IN ('email', 'sms', 'whatsapp')) NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(trainer_id, name)
);

-- Create crm_communication_messages table
CREATE TABLE IF NOT EXISTS crm_communication_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  
  message_type TEXT CHECK (message_type IN ('email', 'sms', 'whatsapp', 'in_app')) NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('sent', 'failed', 'pending')) DEFAULT 'pending',
  error_message TEXT,
  template_id UUID REFERENCES crm_communication_templates(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_communication_templates_trainer ON crm_communication_templates(trainer_id, template_type);
CREATE INDEX IF NOT EXISTS idx_communication_messages_trainee ON crm_communication_messages(trainee_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_messages_trainer ON crm_communication_messages(trainer_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_messages_type ON crm_communication_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_communication_messages_status ON crm_communication_messages(status);

-- Enable RLS
ALTER TABLE crm_communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_communication_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_communication_templates
CREATE POLICY "Trainers can manage own communication templates"
  ON crm_communication_templates FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- RLS Policies for crm_communication_messages
CREATE POLICY "Trainers can view own communication messages"
  ON crm_communication_messages FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can create own communication messages"
  ON crm_communication_messages FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_communication_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER trigger_update_communication_template_updated_at
  BEFORE UPDATE ON crm_communication_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_communication_template_updated_at();
