# OAuth Vault Implementation Steps

## Quick Implementation Guide

This guide provides step-by-step instructions for implementing Supabase Vault for OAuth token encryption.

## Prerequisites

- Supabase project with Vault extension enabled
- Database admin access
- Understanding of OAuth token flow

## Step 1: Enable Vault Extension

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Project Settings** → **Database** → **Extensions**
3. Find **vault** extension
4. Click **Enable**

Or via SQL:
```sql
CREATE EXTENSION IF NOT EXISTS vault;
```

## Step 2: Create Migration for Vault Column

Create a new migration file:
```sql
-- supabase/migrations/YYYYMMDD_add_vault_secret_name.sql

-- Add vault_secret_name column to trainer_google_credentials
ALTER TABLE trainer_google_credentials
ADD COLUMN IF NOT EXISTS vault_secret_name TEXT;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_trainer_google_credentials_vault_secret
ON trainer_google_credentials(vault_secret_name);

-- Comment
COMMENT ON COLUMN trainer_google_credentials.vault_secret_name IS 
  'Reference to Vault secret name containing encrypted OAuth tokens';
```

## Step 3: Create RPC Function for Vault Operations

```sql
-- supabase/migrations/YYYYMMDD_create_vault_functions.sql

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
AS $$
DECLARE
  v_secret_name TEXT;
  v_tokens JSONB;
BEGIN
  -- Generate secret name
  v_secret_name := format('trainer_%s_google_tokens', p_trainer_id);

  -- Prepare tokens JSON
  v_tokens := jsonb_build_object(
    'access_token', p_access_token,
    'refresh_token', p_refresh_token,
    'token_expires_at', p_token_expires_at::TEXT
  );

  -- Store in Vault
  INSERT INTO vault.secrets (name, secret)
  VALUES (v_secret_name, v_tokens)
  ON CONFLICT (name) DO UPDATE
  SET secret = EXCLUDED.secret,
      updated_at = NOW();

  -- Update reference in credentials table
  UPDATE trainer_google_credentials
  SET vault_secret_name = v_secret_name,
      token_expires_at = p_token_expires_at,
      updated_at = NOW()
  WHERE trainer_id = p_trainer_id;

  RETURN v_secret_name;
END;
$$;

-- Function to retrieve tokens from Vault
CREATE OR REPLACE FUNCTION get_google_tokens_from_vault(p_trainer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION store_google_tokens_in_vault(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_google_tokens_from_vault(UUID) TO authenticated;
```

## Step 4: Migrate Existing Tokens

```sql
-- supabase/migrations/YYYYMMDD_migrate_tokens_to_vault.sql

-- Migrate existing tokens to Vault
DO $$
DECLARE
  cred RECORD;
  v_secret_name TEXT;
BEGIN
  FOR cred IN 
    SELECT trainer_id, access_token, refresh_token, token_expires_at
    FROM trainer_google_credentials
    WHERE access_token IS NOT NULL
      AND vault_secret_name IS NULL
  LOOP
    -- Store tokens in Vault
    v_secret_name := store_google_tokens_in_vault(
      cred.trainer_id,
      cred.access_token,
      cred.refresh_token,
      cred.token_expires_at
    );

    RAISE NOTICE 'Migrated tokens for trainer % to Vault secret %', 
      cred.trainer_id, v_secret_name;
  END LOOP;
END $$;
```

## Step 5: Update Edge Functions

Update `supabase/functions/google-oauth/index.ts`:

```typescript
// After token exchange, use Vault instead of direct storage
const { data: secretName, error: vaultError } = await supabase.rpc(
  'store_google_tokens_in_vault',
  {
    p_trainer_id: trainerId,
    p_access_token: tokens.access_token,
    p_refresh_token: tokens.refresh_token,
    p_token_expires_at: expiresAt.toISOString(),
  }
);

if (vaultError) {
  console.error('Failed to store tokens in Vault:', vaultError);
  // Fallback to direct storage if Vault fails (during migration)
}
```

Update `supabase/functions/sync-google-calendar/index.ts`:

```typescript
// Get tokens from Vault
const { data: tokens, error: tokensError } = await supabase.rpc(
  'get_google_tokens_from_vault',
  { p_trainer_id: trainerId }
);

if (tokensError || !tokens) {
  // Fallback to direct query during migration
  const { data: creds } = await supabase
    .from('trainer_google_credentials')
    .select('*')
    .eq('trainer_id', trainerId)
    .single();
  
  if (creds) {
    tokens = {
      access_token: creds.access_token,
      refresh_token: creds.refresh_token,
      token_expires_at: creds.token_expires_at,
    };
  }
}
```

## Step 6: Remove Plain Text Tokens (After Verification)

⚠️ **Warning**: Only after verifying Vault works correctly!

```sql
-- supabase/migrations/YYYYMMDD_remove_plain_text_tokens.sql

-- Verify all tokens are in Vault
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM trainer_google_credentials
  WHERE access_token IS NOT NULL
    AND vault_secret_name IS NULL;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot remove plain text tokens: % tokens still not in Vault', v_count;
  END IF;
END $$;

-- Remove plain text columns (only if all migrated)
-- ALTER TABLE trainer_google_credentials
-- DROP COLUMN IF EXISTS access_token,
-- DROP COLUMN IF EXISTS refresh_token;

-- Comment: Uncomment above after verifying all tokens are in Vault
```

## Step 7: Testing

1. **Test Token Storage**
   ```sql
   -- Verify token stored in Vault
   SELECT name, created_at
   FROM vault.secrets
   WHERE name LIKE 'trainer_%_google_tokens'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. **Test Token Retrieval**
   ```sql
   -- Test RPC function
   SELECT get_google_tokens_from_vault('trainer-id-here');
   ```

3. **Test Edge Function**
   - Trigger OAuth flow
   - Verify tokens stored in Vault
   - Test calendar sync with Vault tokens

## Rollback Plan

If issues occur, you can rollback:

```sql
-- Restore plain text columns
ALTER TABLE trainer_google_credentials
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Copy tokens from Vault back to plain text (if needed)
-- This requires custom script
```

## Security Best Practices

1. **Service Role Only**: Vault operations should use service role key
2. **Audit Logging**: Log all Vault access (via audit_log)
3. **Key Rotation**: Periodically rotate encryption keys
4. **Access Control**: Limit who can access Vault secrets
5. **Monitoring**: Monitor Vault access patterns

## Monitoring

Check Vault usage:
```sql
-- Count secrets in Vault
SELECT COUNT(*) FROM vault.secrets;

-- Check for trainers without Vault secrets
SELECT trainer_id, vault_secret_name
FROM trainer_google_credentials
WHERE vault_secret_name IS NULL;
```

## References

- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [Vault Security Guide](../SECURITY_OAUTH_VAULT_GUIDE.md)
