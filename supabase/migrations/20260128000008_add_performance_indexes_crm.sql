/*
  # Add Performance Indexes for CRM Queries
  
  Optimizes frequently used queries in CRM module for better performance
*/

-- Index for pagination queries on google_calendar_clients
CREATE INDEX IF NOT EXISTS idx_calendar_clients_trainer_pagination 
  ON google_calendar_clients(trainer_id, last_event_date DESC NULLS LAST)
  WHERE trainer_id IS NOT NULL;

-- Composite index for filtering clients by status and trainer
CREATE INDEX IF NOT EXISTS idx_calendar_clients_trainer_trainee 
  ON google_calendar_clients(trainer_id, trainee_id)
  WHERE trainee_id IS NOT NULL;

-- Index for client interactions pagination
CREATE INDEX IF NOT EXISTS idx_client_interactions_pagination 
  ON client_interactions(trainee_id, interaction_date DESC)
  WHERE trainee_id IS NOT NULL;

-- Index for CRM status queries
CREATE INDEX IF NOT EXISTS idx_trainees_crm_status_trainer 
  ON trainees(trainer_id, crm_status)
  WHERE crm_status IS NOT NULL;

-- Index for follow-up date queries
CREATE INDEX IF NOT EXISTS idx_trainees_next_followup_trainer 
  ON trainees(trainer_id, next_followup_date)
  WHERE next_followup_date IS NOT NULL;

-- Index for contract value queries
CREATE INDEX IF NOT EXISTS idx_trainees_contract_value 
  ON trainees(trainer_id, contract_value DESC)
  WHERE contract_value IS NOT NULL;

-- Index for payment queries
CREATE INDEX IF NOT EXISTS idx_crm_payments_trainer_date 
  ON crm_payments(trainer_id, paid_date DESC)
  WHERE trainer_id IS NOT NULL AND status = 'paid';

-- Partial index for active clients
CREATE INDEX IF NOT EXISTS idx_trainees_active_clients 
  ON trainees(trainer_id, client_since)
  WHERE crm_status = 'active';
