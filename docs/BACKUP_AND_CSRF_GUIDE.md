# Backup System & CSRF Protection Guide

## Data Backup System

### Overview

The backup system provides automatic and manual data backups for CRM data, version history tracking, and recovery capabilities.

### Features

1. **Backup Types**
   - `full` - Complete backup of all data
   - `incremental` - Only data modified in last 24 hours
   - `manual` - User-initiated backup

2. **Version History**
   - Automatic tracking of all data changes
   - Access to previous versions via audit_log
   - Rollback capabilities

3. **Storage**
   - Backup metadata stored in `backup_log` table
   - Actual backup data should be stored in Supabase Storage (TODO)

### Usage

```typescript
import { BackupService } from '../services/backupService';

// Create a full backup
const backup = await BackupService.createBackup('trainer-id', 'full');

// Get backup history
const history = await BackupService.getBackupHistory('trainer-id', 10);

// Get version history for a record
const versions = await BackupService.getVersionHistory('google_calendar_clients', 'client-id');
```

### Backup Table Schema

```sql
CREATE TABLE backup_log (
  id UUID PRIMARY KEY,
  trainer_id UUID REFERENCES trainers(id),
  backup_type TEXT CHECK (backup_type IN ('full', 'incremental', 'manual')),
  backup_date TIMESTAMPTZ,
  data_size BIGINT,
  record_count INTEGER,
  status TEXT CHECK (status IN ('completed', 'failed', 'in_progress')),
  error_message TEXT,
  tables_included TEXT[],
  storage_path TEXT, -- Path to backup file in Supabase Storage
  created_at TIMESTAMPTZ
);
```

### Automated Backups

To set up automated daily backups, you can use:

1. **Supabase Database Backups** (Recommended)
   - Automatic daily backups included with Supabase
   - Managed by Supabase infrastructure
   - Easy recovery via Dashboard

2. **Edge Function with Cron** (Custom)
   ```typescript
   // supabase/functions/daily-backup/index.ts
   Deno.serve(async (req: Request) => {
     // Create backup for all trainers
     // Store in Supabase Storage
   });
   ```

3. **pg_cron** (Database-level)
   ```sql
   SELECT cron.schedule(
     'daily-backup',
     '0 2 * * *', -- 2 AM daily
     $$SELECT create_backup(trainer_id, 'full') FROM trainers$$
   );
   ```

### Recovery Procedures

1. **Restore from Backup**
   ```typescript
   // Get backup by ID
   const backup = await getBackupHistory(trainerId);
   
   // Restore data from backup (implementation needed)
   await restoreFromBackup(backup[0].id);
   ```

2. **Restore from Version History**
   ```typescript
   // Get version history
   const versions = await BackupService.getVersionHistory('table_name', 'record_id');
   
   // Restore to specific version
   await restoreToVersion('table_name', 'record_id', versionNumber);
   ```

---

## CSRF Protection

### Overview

Cross-Site Request Forgery (CSRF) protection prevents unauthorized actions from being executed on behalf of authenticated users.

### Implementation

1. **Client-Side** (Automatic)
   - CSRF token generated and stored in sessionStorage
   - Token automatically added to all Supabase requests via headers
   - Token refreshed on page load

2. **Server-Side** (Edge Functions)
   - Verify CSRF token in request headers
   - Reject requests with invalid/missing tokens

### Usage

```typescript
import { CSRFTokenManager } from '../utils/csrf';

// Get current token (automatically initialized)
const token = CSRFTokenManager.getToken();

// Verify token (server-side)
const isValid = CSRFTokenManager.verify(token);
```

### Edge Function Integration

Add CSRF verification to Edge Functions:

```typescript
// supabase/functions/save-workout/index.ts

function verifyCSRF(req: Request): boolean {
  const csrfToken = req.headers.get('x-csrf-token');
  if (!csrfToken) {
    return false;
  }
  
  // In production, verify against stored token (session-based)
  // For now, basic validation
  return csrfToken.length > 0;
}

Deno.serve(async (req: Request) => {
  // Verify CSRF token for POST/PUT/DELETE requests
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    if (!verifyCSRF(req)) {
      return new Response(
        JSON.stringify({ error: 'CSRF token verification failed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
  
  // ... rest of function
});
```

### Best Practices

1. **SameSite Cookies**
   - Supabase Auth cookies should be configured with `SameSite=Strict`
   - Prevents CSRF attacks via cross-site requests

2. **Origin Validation**
   - Verify request origin matches allowed origins
   - Reject requests from unknown origins

3. **Token Rotation**
   - Refresh CSRF token periodically
   - Invalidate old tokens after logout

4. **GET Requests**
   - GET requests are safe and don't require CSRF tokens
   - Only POST/PUT/DELETE require verification

### Security Considerations

⚠️ **Important**: Current implementation provides basic CSRF protection. For production:

1. **Server-Side Token Storage**
   - Store tokens server-side (session-based)
   - Verify tokens against stored values

2. **Token Expiration**
   - Tokens should expire after session timeout
   - Refresh tokens on authentication

3. **Double Submit Cookie Pattern**
   - Use cookie + header token combination
   - More robust than header-only tokens

---

## Testing

### Backup System Tests

```typescript
// Test backup creation
const backup = await BackupService.createBackup(trainerId, 'full');
expect(backup.success).toBe(true);
expect(backup.data?.status).toBe('completed');

// Test backup history
const history = await BackupService.getBackupHistory(trainerId);
expect(history.data?.length).toBeGreaterThan(0);
```

### CSRF Protection Tests

```typescript
// Test token generation
const token = CSRFTokenManager.getToken();
expect(token).toBeDefined();
expect(token.length).toBeGreaterThan(0);

// Test token verification
const isValid = CSRFTokenManager.verify(token);
expect(isValid).toBe(true);
```

---

## Monitoring

### Backup Monitoring

- Monitor backup success/failure rates
- Alert on backup failures
- Track backup sizes and durations

### CSRF Monitoring

- Log CSRF verification failures
- Monitor for suspicious patterns
- Alert on repeated failures

---

## References

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
