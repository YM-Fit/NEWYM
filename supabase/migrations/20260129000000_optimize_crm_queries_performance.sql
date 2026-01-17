/*
  # Optimize CRM Queries Performance
  
  Adds composite indexes and optimizations for CRM queries to improve performance
  Goals: All queries < 100ms
*/

-- Composite index for google_calendar_clients ordered by last_event_date (most common query)
-- This is used in getClientsFromCalendar with ORDER BY last_event_date DESC
CREATE INDEX IF NOT EXISTS idx_calendar_clients_trainer_last_event_desc 
  ON google_calendar_clients(trainer_id, last_event_date DESC NULLS LAST);

-- Index for filtering clients by trainee_id (for linked/unlinked filtering)
CREATE INDEX IF NOT EXISTS idx_calendar_clients_trainer_trainee 
  ON google_calendar_clients(trainer_id, trainee_id)
  WHERE trainee_id IS NOT NULL;

-- Composite index for client_interactions ordered by interaction_date (most common query)
CREATE INDEX IF NOT EXISTS idx_client_interactions_trainee_date_desc 
  ON client_interactions(trainee_id, interaction_date DESC);

-- Index for filtering interactions by trainer_id and date
CREATE INDEX IF NOT EXISTS idx_client_interactions_trainer_date 
  ON client_interactions(trainer_id, interaction_date DESC);

-- Composite index for trainees queries filtered by CRM status and payment status
CREATE INDEX IF NOT EXISTS idx_trainees_trainer_crm_payment 
  ON trainees(trainer_id, crm_status, payment_status);

-- Index for trainees filtered by contract_value (for revenue queries)
CREATE INDEX IF NOT EXISTS idx_trainees_trainer_contract_value 
  ON trainees(trainer_id, contract_value)
  WHERE contract_value IS NOT NULL;

-- Index for trainees filtered by last_contact_date (for follow-up queries)
CREATE INDEX IF NOT EXISTS idx_trainees_trainer_last_contact 
  ON trainees(trainer_id, last_contact_date DESC NULLS LAST);

-- Index for trainees filtered by next_followup_date (for follow-up queries)
CREATE INDEX IF NOT EXISTS idx_trainees_trainer_next_followup 
  ON trainees(trainer_id, next_followup_date)
  WHERE next_followup_date IS NOT NULL;

-- Analyze tables to update statistics
ANALYZE google_calendar_clients;
ANALYZE client_interactions;
ANALYZE trainees;
