/*
  # Add Scale Heartbeats and Device Support

  ## Overview
  This migration enhances the scale integration system with:
  - Heartbeat monitoring for Python script health
  - Multi-device support for multiple scales
  - Last known weight tracking for trainee auto-identification
  - Debounce support with stability flags

  ## New Table: scale_heartbeats
  Tracks the health status of scale integration scripts.
  - `id` (bigint, primary key) - Unique identifier
  - `device_id` (text) - Unique identifier for the scale device
  - `device_name` (text) - Human-readable device name
  - `created_at` (timestamptz) - Heartbeat timestamp
  - `script_version` (text) - Version of the Python script

  ## Modified Table: scale_readings
  Added new columns:
  - `device_id` (text) - Which device sent this reading
  - `is_stable` (boolean) - Whether the reading is stable (debounced)
  - `raw_readings_count` (integer) - Number of raw readings before stabilization

  ## Modified Table: trainees
  Added new column:
  - `last_known_weight` (numeric) - Last recorded weight for auto-identification

  ## Security
  - RLS enabled on scale_heartbeats
  - Authenticated users can insert/view heartbeats
*/

-- Create scale_heartbeats table
CREATE TABLE IF NOT EXISTS scale_heartbeats (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id text NOT NULL,
  device_name text DEFAULT 'Tanita Scale',
  created_at timestamptz DEFAULT now() NOT NULL,
  script_version text DEFAULT '1.0.0'
);

-- Create index for fast heartbeat lookups
CREATE INDEX IF NOT EXISTS idx_scale_heartbeats_device_created 
ON scale_heartbeats(device_id, created_at DESC);

-- Enable RLS on scale_heartbeats
ALTER TABLE scale_heartbeats ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert heartbeats
CREATE POLICY "Authenticated users can insert heartbeats"
  ON scale_heartbeats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to view heartbeats
CREATE POLICY "Authenticated users can view heartbeats"
  ON scale_heartbeats
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow deletion of old heartbeats (cleanup)
CREATE POLICY "Authenticated users can delete old heartbeats"
  ON scale_heartbeats
  FOR DELETE
  TO authenticated
  USING (created_at < now() - interval '1 hour');

-- Enable Realtime for heartbeats table
ALTER PUBLICATION supabase_realtime ADD TABLE scale_heartbeats;

-- Add device_id column to scale_readings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scale_readings' AND column_name = 'device_id'
  ) THEN
    ALTER TABLE scale_readings ADD COLUMN device_id text DEFAULT 'default';
  END IF;
END $$;

-- Add is_stable column to scale_readings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scale_readings' AND column_name = 'is_stable'
  ) THEN
    ALTER TABLE scale_readings ADD COLUMN is_stable boolean DEFAULT true;
  END IF;
END $$;

-- Add raw_readings_count column to scale_readings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scale_readings' AND column_name = 'raw_readings_count'
  ) THEN
    ALTER TABLE scale_readings ADD COLUMN raw_readings_count integer DEFAULT 1;
  END IF;
END $$;

-- Create index on device_id for scale_readings
CREATE INDEX IF NOT EXISTS idx_scale_readings_device_id 
ON scale_readings(device_id, created_at DESC);

-- Add last_known_weight to trainees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainees' AND column_name = 'last_known_weight'
  ) THEN
    ALTER TABLE trainees ADD COLUMN last_known_weight numeric(5,2);
  END IF;
END $$;

-- Add last_known_body_fat to trainees table for better identification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainees' AND column_name = 'last_known_body_fat'
  ) THEN
    ALTER TABLE trainees ADD COLUMN last_known_body_fat numeric(4,2);
  END IF;
END $$;

-- Create function to get recent heartbeat status for a device
CREATE OR REPLACE FUNCTION get_scale_device_status(p_device_id text DEFAULT 'default')
RETURNS TABLE(
  is_online boolean,
  last_heartbeat timestamptz,
  device_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (h.created_at > now() - interval '30 seconds') AS is_online,
    h.created_at AS last_heartbeat,
    h.device_name
  FROM scale_heartbeats h
  WHERE h.device_id = p_device_id
  ORDER BY h.created_at DESC
  LIMIT 1;
END;
$$;

-- Create function to find trainee by weight
CREATE OR REPLACE FUNCTION find_trainee_by_weight(
  p_weight numeric,
  p_body_fat numeric DEFAULT NULL,
  p_trainer_id uuid DEFAULT NULL,
  p_weight_tolerance numeric DEFAULT 3.0,
  p_fat_tolerance numeric DEFAULT 3.0
)
RETURNS TABLE(
  trainee_id uuid,
  trainee_name text,
  last_weight numeric,
  last_body_fat numeric,
  weight_diff numeric,
  confidence_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS trainee_id,
    t.name AS trainee_name,
    t.last_known_weight AS last_weight,
    t.last_known_body_fat AS last_body_fat,
    ABS(t.last_known_weight - p_weight) AS weight_diff,
    CASE 
      WHEN t.last_known_weight IS NULL THEN 0
      WHEN ABS(t.last_known_weight - p_weight) <= 0.5 THEN 100
      WHEN ABS(t.last_known_weight - p_weight) <= 1.0 THEN 90
      WHEN ABS(t.last_known_weight - p_weight) <= 2.0 THEN 70
      WHEN ABS(t.last_known_weight - p_weight) <= p_weight_tolerance THEN 50
      ELSE 0
    END::numeric AS confidence_score
  FROM trainees t
  WHERE 
    (p_trainer_id IS NULL OR t.trainer_id = p_trainer_id)
    AND t.last_known_weight IS NOT NULL
    AND ABS(t.last_known_weight - p_weight) <= p_weight_tolerance
    AND (
      p_body_fat IS NULL 
      OR t.last_known_body_fat IS NULL 
      OR ABS(t.last_known_body_fat - p_body_fat) <= p_fat_tolerance
    )
  ORDER BY 
    ABS(t.last_known_weight - p_weight) ASC,
    confidence_score DESC
  LIMIT 5;
END;
$$;

-- Create function to update trainee's last known measurements
CREATE OR REPLACE FUNCTION update_trainee_last_known_measurements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE trainees
  SET 
    last_known_weight = COALESCE(NEW.weight, last_known_weight),
    last_known_body_fat = COALESCE(NEW.body_fat_percentage, last_known_body_fat)
  WHERE id = NEW.trainee_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update last known measurements
DROP TRIGGER IF EXISTS trigger_update_last_known_measurements ON measurements;
CREATE TRIGGER trigger_update_last_known_measurements
AFTER INSERT ON measurements
FOR EACH ROW
EXECUTE FUNCTION update_trainee_last_known_measurements();

-- Cleanup function for old heartbeats
CREATE OR REPLACE FUNCTION cleanup_old_scale_heartbeats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM scale_heartbeats
  WHERE created_at < now() - interval '1 hour';
END;
$$;
