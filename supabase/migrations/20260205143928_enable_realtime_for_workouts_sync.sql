/*
  # Enable Realtime for Workouts and Google Calendar Sync
  
  This migration enables Supabase Realtime subscriptions for the workouts
  and google_calendar_sync tables. This allows the dashboard to immediately
  detect when workouts are updated from Google Calendar webhooks.
  
  ## Changes
  1. Set REPLICA IDENTITY FULL on workouts table (required for Realtime)
  2. Set REPLICA IDENTITY FULL on google_calendar_sync table (required for Realtime)
  3. Enable Realtime publication for both tables
*/

-- Enable REPLICA IDENTITY FULL for workouts table
-- This is required for Supabase Realtime to track all column changes
ALTER TABLE workouts REPLICA IDENTITY FULL;

-- Enable REPLICA IDENTITY FULL for google_calendar_sync table
-- This is required for Supabase Realtime to track all column changes
ALTER TABLE google_calendar_sync REPLICA IDENTITY FULL;

-- Enable Realtime publication for workouts table
-- This allows clients to subscribe to changes on this table
-- Use DO block to avoid errors if table is already in publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'workouts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workouts;
  END IF;
END $$;

-- Enable Realtime publication for google_calendar_sync table
-- This allows clients to subscribe to changes on this table
-- Use DO block to avoid errors if table is already in publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'google_calendar_sync'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE google_calendar_sync;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE workouts IS 'Workouts table with Realtime enabled for immediate dashboard updates';
COMMENT ON TABLE google_calendar_sync IS 'Google Calendar sync table with Realtime enabled for immediate dashboard updates';
