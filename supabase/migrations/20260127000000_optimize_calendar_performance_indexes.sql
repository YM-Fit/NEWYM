/*
  # Optimize Calendar Performance Indexes
  
  Adds composite indexes for efficient date range queries on calendar events
*/

-- Composite index for date range queries (trainer_id + date range + status)
CREATE INDEX IF NOT EXISTS idx_calendar_sync_trainer_date_status 
  ON google_calendar_sync(trainer_id, event_start_time, sync_status)
  WHERE sync_status = 'synced';

-- Index for date range queries on event_start_time
CREATE INDEX IF NOT EXISTS idx_calendar_sync_event_start_time 
  ON google_calendar_sync(event_start_time)
  WHERE sync_status = 'synced';

-- Composite index for trainee calendar queries
CREATE INDEX IF NOT EXISTS idx_calendar_sync_trainee_date 
  ON google_calendar_sync(trainee_id, event_start_time)
  WHERE sync_status = 'synced';

-- Partial index for upcoming events (commonly queried)
CREATE INDEX IF NOT EXISTS idx_calendar_sync_upcoming 
  ON google_calendar_sync(trainer_id, event_start_time)
  WHERE sync_status = 'synced' AND event_start_time >= NOW();
