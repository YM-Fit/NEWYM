/*
  # Add Auth User ID to Trainee Auth

  1. Changes
    - Add `auth_user_id` column to `trainee_auth` table
    - Link to `auth.users` for proper authentication
    - Add unique constraint to ensure one-to-one relationship
    
  2. Security
    - Maintains existing RLS policies
    - Allows for proper auth.uid() based access control
*/

-- Add auth_user_id column to trainee_auth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_auth' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE trainee_auth 
    ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Add unique constraint
    ALTER TABLE trainee_auth 
    ADD CONSTRAINT trainee_auth_auth_user_id_unique UNIQUE (auth_user_id);
  END IF;
END $$;