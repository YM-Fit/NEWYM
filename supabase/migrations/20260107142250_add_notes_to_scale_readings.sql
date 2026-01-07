/*
  # Add notes column to scale_readings

  1. Changes
    - Add `notes` text column to `scale_readings` table for storing notes about measurements
    - Notes allow trainers to add context about readings (e.g., conditions, observations)

  2. Column Details
    - `notes` (text, nullable) - Optional notes about the measurement
*/

ALTER TABLE scale_readings 
ADD COLUMN IF NOT EXISTS notes text DEFAULT ''::text;