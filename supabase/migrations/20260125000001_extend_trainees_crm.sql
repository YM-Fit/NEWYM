/*
  # Extend trainees table with CRM fields

  1. Changes
    - Add Google Calendar client link
    - Add CRM status and dates
    - Add contract information
    - Add payment status
    - Add tags and notes history
*/

-- Add CRM columns to trainees table
ALTER TABLE trainees ADD COLUMN IF NOT EXISTS 
  google_calendar_client_id UUID REFERENCES google_calendar_clients(id) ON DELETE SET NULL,
  crm_status TEXT CHECK (crm_status IN ('lead', 'qualified', 'active', 'inactive', 'churned', 'on_hold')) DEFAULT 'active',
  client_since DATE DEFAULT CURRENT_DATE,
  last_contact_date TIMESTAMPTZ,
  next_followup_date DATE,
  contract_type TEXT CHECK (contract_type IN ('monthly', 'package', 'session', 'trial')),
  contract_value DECIMAL(10,2),
  payment_status TEXT CHECK (payment_status IN ('paid', 'pending', 'overdue', 'free')) DEFAULT 'pending',
  tags TEXT[],
  notes_history JSONB DEFAULT '[]'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trainees_crm_status ON trainees(crm_status);
CREATE INDEX IF NOT EXISTS idx_trainees_google_client ON trainees(google_calendar_client_id);
CREATE INDEX IF NOT EXISTS idx_trainees_next_followup ON trainees(next_followup_date) WHERE next_followup_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trainees_last_contact ON trainees(last_contact_date DESC) WHERE last_contact_date IS NOT NULL;

-- Update existing trainees to have default CRM status
UPDATE trainees 
SET crm_status = 'active' 
WHERE crm_status IS NULL;
