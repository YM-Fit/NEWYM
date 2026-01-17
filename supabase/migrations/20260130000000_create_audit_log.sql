/*
  # Create audit_log table for comprehensive CRM audit logging

  1. New Table
    - `audit_log` - Track all CRM actions for security and compliance

  2. Security
    - Enable RLS
    - Policies for trainers to view own audit logs only
    - Indexes for performance
*/

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'create_client',
    'update_client',
    'delete_client',
    'create_interaction',
    'update_interaction',
    'delete_interaction',
    'create_contract',
    'update_contract',
    'delete_contract',
    'create_payment',
    'update_payment',
    'delete_payment',
    'create_document',
    'update_document',
    'delete_document',
    'pipeline_movement',
    'status_change',
    'bulk_action',
    'export_data',
    'import_data'
  )),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can view own audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Note: No UPDATE or DELETE policies - audit logs should be immutable
