/*
  # Add sync_direction to trainer_google_credentials
  
  Adds sync_direction field to allow users to configure bidirectional sync preference
*/

-- Add sync_direction column to trainer_google_credentials
ALTER TABLE trainer_google_credentials
ADD COLUMN IF NOT EXISTS sync_direction TEXT 
  CHECK (sync_direction IN ('to_google', 'from_google', 'bidirectional')) 
  DEFAULT 'bidirectional';

-- Update existing records to have bidirectional sync as default
UPDATE trainer_google_credentials
SET sync_direction = 'bidirectional'
WHERE sync_direction IS NULL;
