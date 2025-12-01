/*
  # Create Scale Readings Table with Realtime Support
  
  ## Overview
  This migration creates a buffer table for receiving real-time weight scale data
  from external Tanita scales via a Python script.
  
  ## New Table
  
  ### `scale_readings`
  Temporary buffer table that receives scale data and is monitored in real-time by the UI.
  
  **Columns:**
  - `id` (bigint, primary key, auto-increment) - Unique identifier
  - `created_at` (timestamptz, default now) - Timestamp of reading
  - `weight_kg` (numeric) - Weight in kilograms
  - `body_fat_percent` (numeric) - Body fat percentage (0-100)
  - `fat_mass_kg` (numeric) - Fat mass in kilograms
  - `fat_free_mass_kg` (numeric) - Fat-free mass in kilograms
  - `water_kg` (numeric) - Water mass in kilograms
  - `water_percent` (numeric) - Water percentage (0-100)
  - `bmi` (numeric) - Body Mass Index
  
  ## Realtime Configuration
  - Enable Row Level Security (RLS)
  - Grant authenticated users INSERT and SELECT permissions
  - **Enable Realtime replication** for the table
  
  ## Security
  - Authenticated trainers can insert readings (for Python script using service key)
  - Authenticated trainers can view all readings (for listening to new data)
  - Auto-cleanup: readings older than 24 hours can be deleted to keep table clean
  
  ## Usage Flow
  1. Python script inserts new reading → INSERT event
  2. UI listens via Supabase Realtime → receives data instantly
  3. UI auto-fills measurement form with received data
  4. Trainer can edit and save to `measurements` table
*/

-- Create scale_readings table
CREATE TABLE IF NOT EXISTS scale_readings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  weight_kg numeric(5,2),
  body_fat_percent numeric(4,2),
  fat_mass_kg numeric(5,2),
  fat_free_mass_kg numeric(5,2),
  water_kg numeric(5,2),
  water_percent numeric(4,2),
  bmi numeric(4,2)
);

-- Create index for faster queries on recent readings
CREATE INDEX IF NOT EXISTS idx_scale_readings_created_at 
ON scale_readings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE scale_readings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert readings (for Python script with service key)
CREATE POLICY "Authenticated users can insert scale readings"
  ON scale_readings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to view all readings
CREATE POLICY "Authenticated users can view scale readings"
  ON scale_readings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow deletion of old readings (cleanup policy)
CREATE POLICY "Authenticated users can delete old readings"
  ON scale_readings
  FOR DELETE
  TO authenticated
  USING (created_at < now() - interval '24 hours');

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE scale_readings;

-- Function to auto-cleanup old readings (optional, runs daily)
CREATE OR REPLACE FUNCTION cleanup_old_scale_readings()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM scale_readings
  WHERE created_at < now() - interval '7 days';
END;
$$;

-- Note: To enable automatic cleanup, you would need to set up a pg_cron job
-- or call this function periodically from your application
