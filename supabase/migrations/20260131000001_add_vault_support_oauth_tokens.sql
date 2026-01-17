/*
  # Add Vault Support for OAuth Tokens
  
  This migration adds support for storing OAuth tokens securely in Supabase Vault.
  
  1. Enable Vault Extension (if not already enabled)
  2. Add vault_secret_name column to trainer_google_credentials
  3. Create helper functions for Vault operations
  4. Create function to migrate existing tokens to Vault
*/

-- Enable Vault Extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vault;

-- Add vault_secret_name column to trainer_google_credentials
ALTER TABLE trainer_google_credentials
ADD COLUMN IF NOT EXISTS vault_secret_name TEXT;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_trainer_google_credentials_vault_secret
ON trainer_google_credentials(vault_secret_name)
WHERE vault_secret_name IS NOT NULL;

-- Comment
COMMENT ON COLUMN trainer_google_credentials.vault_secret_name IS 
  'Reference to Vault secret name containing encrypted OAuth tokens';

-- Function to store tokens in Vault
CREATE OR REPLACE FUNCTION store_google_tokens_in_vault(
  p_trainer_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_token_expires_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_name TEXT;
  v_tokens JSONB;
BEGIN
  -- Generate secret name
  v_secret_name := format('trainer_%s_google_tokens', p_trainer_id);
  
  -- Prepare tokens as JSONB
  v_tokens := jsonb_build_object(
    'access_token', p_access_token,
    'refresh_token', p_refresh_token,
    'token_expires_at', p_token_expires_at::TEXT,
    'updated_at', NOW()::TEXT
  );
  
  -- Store in Vault (upsert)
  INSERT INTO vault.secrets (name, secret)
  VALUES (v_secret_name, v_tokens)
  ON CONFLICT (name) 
  DO UPDATE SET 
    secret = v_tokens,
    updated_at = NOW();
  
  RETURN v_secret_name;
END;
$$;

-- Function to retrieve tokens from Vault
CREATE OR REPLACE FUNCTION get_google_tokens_from_vault(
  p_trainer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_name TEXT;
  v_tokens JSONB;
BEGIN
  -- Get secret name from credentials table
  SELECT vault_secret_name INTO v_secret_name
  FROM trainer_google_credentials
  WHERE trainer_id = p_trainer_id;
  
  IF v_secret_name IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Retrieve secret from Vault
  SELECT decrypted_secret INTO v_tokens
  FROM vault.decrypted_secrets
  WHERE name = v_secret_name;
  
  RETURN v_tokens;
END;
$$;

-- Function to migrate existing tokens to Vault
CREATE OR REPLACE FUNCTION migrate_tokens_to_vault()
RETURNS TABLE(
  trainer_id UUID,
  migrated BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cred RECORD;
  v_secret_name TEXT;
BEGIN
  -- Loop through all credentials with tokens but no vault_secret_name
  FOR v_cred IN 
    SELECT 
      tc.trainer_id,
      tc.access_token,
      tc.refresh_token,
      tc.token_expires_at
    FROM trainer_google_credentials tc
    WHERE tc.access_token IS NOT NULL
      AND tc.refresh_token IS NOT NULL
      AND tc.vault_secret_name IS NULL
  LOOP
    BEGIN
      -- Store tokens in Vault
      v_secret_name := store_google_tokens_in_vault(
        v_cred.trainer_id,
        v_cred.access_token,
        v_cred.refresh_token,
        v_cred.token_expires_at
      );
      
      -- Update credentials table with vault_secret_name
      UPDATE trainer_google_credentials
      SET vault_secret_name = v_secret_name
      WHERE trainer_id = v_cred.trainer_id;
      
      -- Optionally: Clear plaintext tokens (uncomment if desired)
      -- UPDATE trainer_google_credentials
      -- SET access_token = NULL, refresh_token = NULL
      -- WHERE trainer_id = v_cred.trainer_id;
      
      trainer_id := v_cred.trainer_id;
      migrated := TRUE;
      message := format('Tokens migrated to Vault: %s', v_secret_name);
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      trainer_id := v_cred.trainer_id;
      migrated := FALSE;
      message := format('Migration failed: %s', SQLERRM);
      RETURN NEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$$;

-- Function to check token expiration and send alerts
CREATE OR REPLACE FUNCTION check_token_expiration_alerts()
RETURNS TABLE(
  trainer_id UUID,
  expires_soon BOOLEAN,
  days_until_expiration INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_cred RECORD;
  v_tokens JSONB;
  v_expires_at TIMESTAMPTZ;
  v_days_until INTEGER;
BEGIN
  FOR v_cred IN 
    SELECT tc.trainer_id, tc.vault_secret_name, tc.token_expires_at
    FROM trainer_google_credentials tc
    WHERE tc.vault_secret_name IS NOT NULL
  LOOP
    -- Get tokens from Vault
    v_tokens := get_google_tokens_from_vault(v_cred.trainer_id);
    
    IF v_tokens IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Get expiration time
    IF v_tokens->>'token_expires_at' IS NOT NULL THEN
      v_expires_at := (v_tokens->>'token_expires_at')::TIMESTAMPTZ;
    ELSIF v_cred.token_expires_at IS NOT NULL THEN
      v_expires_at := v_cred.token_expires_at;
    ELSE
      CONTINUE;
    END IF;
    
    -- Calculate days until expiration
    v_days_until := EXTRACT(EPOCH FROM (v_expires_at - NOW())) / 86400;
    
    -- Alert if expiring in less than 7 days
    IF v_days_until < 7 AND v_days_until > 0 THEN
      trainer_id := v_cred.trainer_id;
      expires_soon := TRUE;
      days_until_expiration := v_days_until::INTEGER;
      message := format('Token expires in %s days', v_days_until::INTEGER);
      RETURN NEXT;
    ELSIF v_expires_at < NOW() THEN
      trainer_id := v_cred.trainer_id;
      expires_soon := TRUE;
      days_until_expiration := 0;
      message := 'Token has expired';
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA vault TO authenticated;
GRANT SELECT ON vault.decrypted_secrets TO authenticated;
