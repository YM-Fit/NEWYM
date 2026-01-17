# Scheduled Backup Setup Guide

## Overview

This guide explains how to set up automated daily backups for CRM data.

## Options

### Option 1: Supabase Built-in Backups (Recommended)

Supabase provides automatic daily backups. To enable:

1. Go to Supabase Dashboard → Project Settings → Database
2. Enable "Point-in-time Recovery" or "Daily Backups"
3. Configure retention period (7/30/90 days)
4. Done! Backups are automatic and managed by Supabase

**Advantages:**
- No code required
- Automatic backups
- Easy recovery via Dashboard
- Managed by Supabase

### Option 2: Edge Function with Cron (Custom)

Use the `daily-backup` Edge Function with an external cron service.

#### Setup Steps:

1. **Deploy Edge Function**:
   ```bash
   # Already created: supabase/functions/daily-backup/index.ts
   # Deploy via Supabase CLI or Dashboard
   ```

2. **Set up Cron Job**:
   
   **Option A: GitHub Actions** (Free)
   ```yaml
   # .github/workflows/daily-backup.yml
   name: Daily Backup
   on:
     schedule:
       - cron: '0 2 * * *' # 2 AM UTC daily
   
   jobs:
     backup:
       runs-on: ubuntu-latest
       steps:
         - name: Trigger Backup
           run: |
             curl -X POST \
               -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
               https://your-project.supabase.co/functions/v1/daily-backup
   ```

   **Option B: Supabase Cron (pg_cron)** - Requires extension
   ```sql
   -- Enable pg_cron extension
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   
   -- Schedule daily backup (calls Edge Function via HTTP)
   -- Note: This requires pg_net extension or external cron service
   ```

   **Option C: External Cron Service** (Cron-job.org, EasyCron, etc.)
   - Set up HTTP request to: `POST https://your-project.supabase.co/functions/v1/daily-backup`
   - Schedule: Daily at 2 AM UTC
   - Add Authorization header with Supabase service role key

### Option 3: Database Function with pg_cron

Use the `create_trainer_backup()` function with pg_cron (requires extension).

#### Setup Steps:

1. **Enable pg_cron Extension**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Schedule Daily Backup**:
   ```sql
   SELECT cron.schedule(
     'daily-backup',
     '0 2 * * *', -- 2 AM UTC daily
     $$SELECT create_trainer_backup(id, 'full') FROM trainers$$
   );
   ```

3. **Schedule Cleanup** (Optional):
   ```sql
   SELECT cron.schedule(
     'cleanup-old-backups',
     '0 3 1 * *', -- 3 AM UTC, 1st of every month
     $$SELECT cleanup_old_backups(90)$$
   );
   ```

4. **Check Scheduled Jobs**:
   ```sql
   SELECT * FROM cron.job;
   ```

5. **Remove Scheduled Job** (if needed):
   ```sql
   SELECT cron.unschedule('daily-backup');
   ```

## Backup Retention

The `cleanup_old_backups()` function deletes backup logs older than retention days (default: 90 days).

To change retention:
```sql
-- Keep backups for 365 days
SELECT cleanup_old_backups(365);
```

## Recovery

### From Backup Log:

1. Get backup history:
   ```typescript
   const backups = await BackupService.getBackupHistory(trainerId);
   ```

2. Restore from backup (implementation needed):
   ```typescript
   await BackupService.restoreBackup(backupId);
   ```

### From Supabase Built-in Backups:

1. Go to Supabase Dashboard → Database → Backups
2. Select point-in-time recovery
3. Restore to desired date/time

## Monitoring

### Check Backup Status:

```sql
-- Recent backups
SELECT * FROM backup_log
WHERE trainer_id = 'your-trainer-id'
ORDER BY backup_date DESC
LIMIT 10;

-- Failed backups
SELECT * FROM backup_log
WHERE status = 'failed'
ORDER BY backup_date DESC;
```

### Check Backup Size:

```sql
-- Total backup size per trainer
SELECT 
  trainer_id,
  COUNT(*) as backup_count,
  SUM(data_size) as total_size_bytes,
  SUM(record_count) as total_records
FROM backup_log
WHERE status = 'completed'
GROUP BY trainer_id;
```

## Troubleshooting

### Backups Not Running:

1. Check cron job status:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-backup')
   ORDER BY start_time DESC
   LIMIT 10;
   ```

2. Check Edge Function logs in Supabase Dashboard

3. Verify permissions and RLS policies

### Backup Failures:

1. Check `error_message` in `backup_log` table
2. Verify RLS policies allow service role access
3. Check Supabase Storage quota (if storing backup files)

## Best Practices

1. **Use Supabase Built-in Backups** for production (easiest and most reliable)
2. **Custom backups** for specific data exports or incremental backups
3. **Test recovery** regularly
4. **Monitor backup status** via dashboard or alerts
5. **Retention policy** - keep backups for at least 90 days
6. **Store backups off-site** if required for compliance

## Notes

- Current implementation stores only backup metadata
- Actual backup data should be stored in Supabase Storage bucket 'backups'
- Full implementation requires:
  - Supabase Storage bucket creation
  - Upload backup data as JSON files
  - Download and restore logic

---
**Last Updated**: 2025-01-27
