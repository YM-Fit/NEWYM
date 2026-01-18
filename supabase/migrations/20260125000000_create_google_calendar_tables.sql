/*
  # Create Google Calendar Tables

  1. New Tables
    - `trainer_google_credentials` - OAuth credentials for trainers
    - `google_calendar_sync` - Sync tracking between workouts and calendar events
    - `google_calendar_clients` - Client cards based on calendar events

  2. Security
    - Enable RLS on all tables
    - Policies for trainers to manage own data
*/

-- Create trainer_google_credentials table
CREATE TABLE IF NOT EXISTS trainer_google_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- OAuth tokens (should be encrypted in production)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  
  -- Calendar IDs
  primary_calendar_id TEXT,
  default_calendar_id TEXT,
  
  -- Sync settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT CHECK (sync_frequency IN ('realtime', 'hourly', 'daily')) DEFAULT 'realtime',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create google_calendar_sync table
CREATE TABLE IF NOT EXISTS google_calendar_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  
  -- Google Calendar identifiers
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL,
  
  -- Sync status
  sync_status TEXT CHECK (sync_status IN ('synced', 'pending', 'failed', 'conflict')) DEFAULT 'synced',
  sync_direction TEXT CHECK (sync_direction IN ('to_google', 'from_google', 'bidirectional')) DEFAULT 'bidirectional',
  last_synced_at TIMESTAMPTZ,
  
  -- Metadata
  event_start_time TIMESTAMPTZ NOT NULL,
  event_end_time TIMESTAMPTZ,
  event_summary TEXT,
  event_description TEXT,
  
  -- Conflict resolution
  conflict_resolution TEXT CHECK (conflict_resolution IN ('system_wins', 'google_wins', 'manual')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(google_event_id, google_calendar_id),
  UNIQUE(workout_id)
);

-- Create google_calendar_clients table
CREATE TABLE IF NOT EXISTS google_calendar_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  
  -- Link to trainee (if exists)
  trainee_id UUID REFERENCES trainees(id) ON DELETE SET NULL,
  
  -- Client identifier in Google Calendar (email or name)
  google_client_identifier TEXT NOT NULL,
  
  -- Client details
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  
  -- Event statistics
  first_event_date DATE,
  last_event_date DATE,
  total_events_count INT DEFAULT 0,
  upcoming_events_count INT DEFAULT 0,
  completed_events_count INT DEFAULT 0,
  
  -- Additional data
  extra_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(trainer_id, google_client_identifier)
);

-- Indexes for trainer_google_credentials
CREATE INDEX IF NOT EXISTS idx_google_credentials_trainer ON trainer_google_credentials(trainer_id);

-- Indexes for google_calendar_sync
CREATE INDEX IF NOT EXISTS idx_calendar_sync_trainer ON google_calendar_sync(trainer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_trainee ON google_calendar_sync(trainee_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_workout ON google_calendar_sync(workout_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_status ON google_calendar_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_event_id ON google_calendar_sync(google_event_id, google_calendar_id);

-- Indexes for google_calendar_clients
CREATE INDEX IF NOT EXISTS idx_calendar_clients_trainer ON google_calendar_clients(trainer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_clients_trainee ON google_calendar_clients(trainee_id);
CREATE INDEX IF NOT EXISTS idx_calendar_clients_identifier ON google_calendar_clients(google_client_identifier);

-- Enable RLS
ALTER TABLE trainer_google_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trainer_google_credentials
CREATE POLICY "Trainers can manage own Google credentials"
  ON trainer_google_credentials FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- RLS Policies for google_calendar_sync
CREATE POLICY "Trainers can manage calendar sync for own data"
  ON google_calendar_sync FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- RLS Policies for google_calendar_clients
CREATE POLICY "Trainers can manage own calendar clients"
  ON google_calendar_clients FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_trainer_google_credentials_updated_at
  BEFORE UPDATE ON trainer_google_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_google_calendar_updated_at();

CREATE TRIGGER update_google_calendar_sync_updated_at
  BEFORE UPDATE ON google_calendar_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_google_calendar_updated_at();

CREATE TRIGGER update_google_calendar_clients_updated_at
  BEFORE UPDATE ON google_calendar_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_google_calendar_updated_at();
