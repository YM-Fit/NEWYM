/*
  # Create Scheduled Backup Function
  
  This migration creates a database function for scheduled backups using pg_cron (if available).
  Also creates a backup_log table if it doesn't exist.
*/

-- Create backup_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS backup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'manual')),
  backup_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_size BIGINT,
  record_count INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'in_progress')) DEFAULT 'in_progress',
  error_message TEXT,
  tables_included TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backup_log_trainer ON backup_log(trainer_id, backup_date DESC);
CREATE INDEX IF NOT EXISTS idx_backup_log_date ON backup_log(backup_date DESC);
CREATE INDEX IF NOT EXISTS idx_backup_log_status ON backup_log(status);

-- Enable RLS
ALTER TABLE backup_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can view own backup logs"
  ON backup_log FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

-- Function to create backup (called by Edge Function or directly)
CREATE OR REPLACE FUNCTION create_trainer_backup(
  p_trainer_id UUID,
  p_backup_type TEXT DEFAULT 'full'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_backup_id UUID;
  v_backup_date TIMESTAMPTZ;
  v_record_count INTEGER := 0;
  v_tables TEXT[] := ARRAY[
    'google_calendar_clients',
    'client_interactions',
    'crm_contracts',
    'crm_payments',
    'crm_documents',
    'pipeline_movements'
  ];
BEGIN
  v_backup_date := NOW();
  
  -- Calculate record count (approximate)
  SELECT COUNT(*) INTO v_record_count
  FROM google_calendar_clients
  WHERE trainer_id = p_trainer_id;
  
  -- Create backup log entry
  INSERT INTO backup_log (
    trainer_id,
    backup_type,
    backup_date,
    record_count,
    status,
    tables_included
  )
  VALUES (
    p_trainer_id,
    p_backup_type,
    v_backup_date,
    v_record_count,
    'completed',
    v_tables
  )
  RETURNING id INTO v_backup_id;
  
  -- Log audit event
  INSERT INTO audit_log (
    user_id,
    action,
    table_name,
    record_id,
    new_data
  )
  VALUES (
    p_trainer_id,
    'export_data',
    'backups',
    v_backup_id,
    jsonb_build_object(
      'backup_type', p_backup_type,
      'backup_date', v_backup_date::TEXT,
      'record_count', v_record_count
    )
  );
  
  RETURN v_backup_id;
EXCEPTION WHEN OTHERS THEN
  -- Update backup log with error
  UPDATE backup_log
  SET status = 'failed',
      error_message = SQLERRM
  WHERE id = v_backup_id;
  
  RAISE;
END;
$$;

-- Function to cleanup old backups (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_backups(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM backup_log
  WHERE backup_date < NOW() - (p_retention_days || ' days')::INTERVAL
    AND status = 'completed';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Note: To enable pg_cron for automated scheduling, run:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 
-- Then schedule daily backup:
-- SELECT cron.schedule(
--   'daily-backup',
--   '0 2 * * *', -- 2 AM UTC daily
--   $$SELECT create_trainer_backup(id, 'full') FROM trainers$$
-- );
--
-- Schedule cleanup (monthly):
-- SELECT cron.schedule(
--   'cleanup-old-backups',
--   '0 3 1 * *', -- 3 AM UTC, 1st of every month
--   $$SELECT cleanup_old_backups(90)$$
-- );

COMMENT ON FUNCTION create_trainer_backup IS 
  'Creates a backup log entry for a trainer. Actual backup data should be stored in Supabase Storage.';

COMMENT ON FUNCTION cleanup_old_backups IS 
  'Deletes backup logs older than retention_days (default 90 days)';
