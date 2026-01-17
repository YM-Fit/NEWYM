/*
  # Optimize CRM Analytics Queries Performance
  
  Adds composite indexes for analytics queries (CLV, Revenue Forecast, Churn Analysis)
  Goals: All analytics queries < 100ms
*/

-- Composite index for CLV calculation queries
-- Used in calculateCLV: filters by trainer_id, status='paid', and groups by trainee_id
CREATE INDEX IF NOT EXISTS idx_crm_payments_trainer_trainee_paid 
  ON crm_payments(trainer_id, trainee_id, paid_date DESC)
  WHERE status = 'paid' AND trainer_id IS NOT NULL AND trainee_id IS NOT NULL;

-- Index for revenue forecast queries (already exists but ensure it's optimal)
-- Used in generateRevenueForecast: filters by trainer_id, status='paid', ordered by paid_date DESC
-- The existing idx_crm_payments_trainer_date should cover this, but we add a more specific one
CREATE INDEX IF NOT EXISTS idx_crm_payments_trainer_paid_date 
  ON crm_payments(trainer_id, paid_date DESC, amount)
  WHERE status = 'paid' AND trainer_id IS NOT NULL AND paid_date IS NOT NULL;

-- Composite index for churn analysis queries
-- Used in analyzeChurn: filters by trainer_id, crm_status='churned', and uses client_since
CREATE INDEX IF NOT EXISTS idx_trainees_trainer_churned_since 
  ON trainees(trainer_id, crm_status, client_since, churned_at)
  WHERE crm_status = 'churned' AND trainer_id IS NOT NULL;

-- Index for activity stats queries - optimize the join between clients and trainees
-- Used in getActivityStats: joins google_calendar_clients with trainees by trainee_id
CREATE INDEX IF NOT EXISTS idx_calendar_clients_trainee_id 
  ON google_calendar_clients(trainee_id, trainer_id, last_event_date)
  WHERE trainee_id IS NOT NULL;

-- Index for google_calendar_sync queries (for upcoming events)
-- Used in getClientUpcomingEvents: filters by trainer_id, sync_status='synced', event_start_time >= now
CREATE INDEX IF NOT EXISTS idx_calendar_sync_trainer_upcoming 
  ON google_calendar_sync(trainer_id, event_start_time, sync_status)
  WHERE sync_status = 'synced' AND trainer_id IS NOT NULL;

-- Index for workouts queries in activity heatmap
-- Used in getActivityHeatmap: filters by trainer_id, workout_date between dates
CREATE INDEX IF NOT EXISTS idx_workouts_trainer_date_range 
  ON workouts(trainer_id, workout_date)
  WHERE trainer_id IS NOT NULL AND workout_date IS NOT NULL;

-- Analyze tables to update query planner statistics
ANALYZE crm_payments;
ANALYZE trainees;
ANALYZE google_calendar_clients;
ANALYZE google_calendar_sync;
ANALYZE workouts;
