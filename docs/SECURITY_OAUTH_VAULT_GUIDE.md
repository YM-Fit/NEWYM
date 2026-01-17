# OAuth Token Security with Supabase Vault

## Overview

This guide explains how to securely store OAuth tokens using Supabase Vault for encryption at rest.

## Why Use Supabase Vault?

1. **Encryption at Rest**: Tokens are encrypted in the database
2. **Automatic Key Management**: Supabase handles encryption keys securely
3. **Compliance**: Helps meet security requirements (GDPR, SOC 2, etc.)
4. **Audit Trail**: All access to secrets is logged

## Implementation Steps

### 1. Enable Vault Extension

In Supabase Dashboard:
1. Go to **Database** → **Extensions**
2. Enable **vault** extension
3. Ensure you have the necessary permissions

### 2. Create Vault Secret

```sql
-- Create a secret in Vault for storing OAuth tokens
-- Note: This should be done by a service role or admin

-- Example: Store Google OAuth tokens
INSERT INTO vault.secrets (name, secret)
VALUES (
  'google_oauth_tokens',
  '{
    "client_id": "your-google-client-id",
    "client_secret": "your-google-client-secret"
  }'::jsonb
);

-- Or create secrets per trainer (more secure)
INSERT INTO vault.secrets (name, secret)
VALUES (
  format('google_oauth_token_%s', trainer_id),
  jsonb_build_object(
    'access_token', access_token,
    'refresh_token', refresh_token
  )
);
```

### 3. Update Token Storage

Instead of storing tokens directly in `trainer_google_credentials`:

**Current (Insecure):**
```sql
INSERT INTO trainer_google_credentials (
  trainer_id,
  access_token,
  refresh_token
) VALUES (...);
```

**Secure (with Vault):**
```sql
-- Store tokens in Vault
INSERT INTO vault.secrets (name, secret)
VALUES (
  format('trainer_%s_google_tokens', trainer_id),
  jsonb_build_object(
    'access_token', access_token,
    'refresh_token', refresh_token,
    'token_expires_at', token_expires_at
  )
);

-- Store only reference in table
INSERT INTO trainer_google_credentials (
  trainer_id,
  vault_secret_name,  -- New column
  token_expires_at,
  -- ... other non-sensitive fields
) VALUES (
  trainer_id,
  format('trainer_%s_google_tokens', trainer_id),
  token_expires_at,
  ...
);
```

### 4. Retrieve Tokens Securely

```sql
-- Function to get tokens from Vault (requires vault secret access)
CREATE OR REPLACE FUNCTION get_trainer_google_tokens(trainer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_name TEXT;
  tokens JSONB;
BEGIN
  -- Get secret name from credentials table
  SELECT vault_secret_name INTO secret_name
  FROM trainer_google_credentials
  WHERE trainer_id = get_trainer_google_tokens.trainer_id;

  IF secret_name IS NULL THEN
    RETURN NULL;
  END IF;

  -- Retrieve secret from Vault
  SELECT decrypted_secret INTO tokens
  FROM vault.decrypted_secrets
  WHERE name = secret_name;

  RETURN tokens;
END;
$$;
```

### 5. Automatic Token Refresh

Add automatic token refresh before expiration:

```sql
-- Function to refresh token if expiring soon
CREATE OR REPLACE FUNCTION refresh_google_token_if_needed(trainer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tokens JSONB;
  expires_at TIMESTAMPTZ;
  hours_until_expiry NUMERIC;
BEGIN
  -- Get tokens from Vault
  tokens := get_trainer_google_tokens(trainer_id);
  
  IF tokens IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check expiration (refresh if expiring in < 1 hour)
  expires_at := (tokens->>'token_expires_at')::TIMESTAMPTZ;
  hours_until_expiry := EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600;

  IF hours_until_expiry < 1 THEN
    -- Trigger token refresh (implement refresh logic here)
    -- This would call Google's OAuth token refresh endpoint
    PERFORM refresh_google_token(trainer_id);
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
```

## Migration Guide

### Step 1: Add Vault Column

```sql
-- Add vault_secret_name column
ALTER TABLE trainer_google_credentials
ADD COLUMN IF NOT EXISTS vault_secret_name TEXT;

-- Create index
CREATE INDEX IF NOT EXISTS idx_trainer_google_credentials_vault_secret
ON trainer_google_credentials(vault_secret_name);
```

### Step 2: Migrate Existing Tokens

```sql
-- Migrate existing tokens to Vault
DO $$
DECLARE
  cred RECORD;
  secret_name TEXT;
BEGIN
  FOR cred IN SELECT * FROM trainer_google_credentials WHERE access_token IS NOT NULL
  LOOP
    secret_name := format('trainer_%s_google_tokens', cred.trainer_id);
    
    -- Store in Vault
    INSERT INTO vault.secrets (name, secret)
    VALUES (
      secret_name,
      jsonb_build_object(
        'access_token', cred.access_token,
        'refresh_token', cred.refresh_token,
        'token_expires_at', cred.token_expires_at
      )
    )
    ON CONFLICT (name) DO UPDATE
    SET secret = EXCLUDED.secret;

    -- Update reference
    UPDATE trainer_google_credentials
    SET vault_secret_name = secret_name
    WHERE trainer_id = cred.trainer_id;

  END LOOP;
END $$;
```

### Step 3: Remove Plain Text Tokens (After Verification)

```sql
-- After verifying Vault works correctly, remove plain text columns
-- WARNING: Backup first!

ALTER TABLE trainer_google_credentials
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token;
```

## Security Best Practices

1. **Use Service Role for Vault Operations**: Never expose Vault secrets to client code
2. **Implement Token Rotation**: Periodically refresh tokens even if not expired
3. **Monitor Access**: Use Supabase audit logs to monitor Vault access
4. **Least Privilege**: Only grant Vault access to necessary functions
5. **Backup Secrets**: Keep encrypted backups of Vault secrets

## Edge Functions Integration

For Edge Functions, use Supabase client with service role:

```typescript
// supabase/functions/sync-google-calendar/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Get tokens from Vault via RPC function
const { data: tokens, error } = await supabase.rpc(
  'get_trainer_google_tokens',
  { trainer_id: trainerId }
);

if (tokens) {
  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token;
  // Use tokens...
}
```

## Monitoring & Alerts

Set up alerts for:
- Tokens expiring within 24 hours
- Failed token refresh attempts
- Unusual Vault access patterns

```sql
-- Check for tokens expiring soon
SELECT trainer_id, token_expires_at
FROM trainer_google_credentials
WHERE token_expires_at < NOW() + INTERVAL '24 hours'
AND token_expires_at > NOW();
```

## References

- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
