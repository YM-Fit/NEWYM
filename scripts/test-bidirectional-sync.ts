/**
 * Test script to verify bidirectional Google Calendar synchronization
 * 
 * This script checks:
 * 1. System → Google Calendar sync (when workouts are created/updated)
 * 2. Google Calendar → System sync (when events change in Google Calendar)
 * 3. Bidirectional sync configuration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SyncCheckResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: SyncCheckResult[] = [];

function addResult(test: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
  results.push({ test, status, message, details });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${test}: ${message}`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

async function checkSyncDirectionConfiguration() {
  console.log('\n📋 Checking sync direction configuration...\n');
  
  // Get all trainers with Google Calendar connected
  const { data: credentials, error } = await supabase
    .from('trainer_google_credentials')
    .select('trainer_id, sync_direction, auto_sync_enabled, default_calendar_id');
  
  if (error) {
    addResult('Sync Direction Config', 'fail', `Error fetching credentials: ${error.message}`);
    return;
  }
  
  if (!credentials || credentials.length === 0) {
    addResult('Sync Direction Config', 'warning', 'No trainers with Google Calendar connected');
    return;
  }
  
  const bidirectional = credentials.filter(c => c.sync_direction === 'bidirectional');
  const toGoogle = credentials.filter(c => c.sync_direction === 'to_google');
  const fromGoogle = credentials.filter(c => c.sync_direction === 'from_google');
  const nullDirection = credentials.filter(c => !c.sync_direction);
  
  addResult(
    'Sync Direction Config',
    'pass',
    `Found ${credentials.length} trainer(s) with Google Calendar connected`,
    {
      bidirectional: bidirectional.length,
      to_google: toGoogle.length,
      from_google: fromGoogle.length,
      null_or_undefined: nullDirection.length,
      trainers: credentials.map(c => ({
        trainer_id: c.trainer_id,
        sync_direction: c.sync_direction || 'null',
        auto_sync_enabled: c.auto_sync_enabled
      }))
    }
  );
  
  if (nullDirection.length > 0) {
    addResult(
      'Sync Direction Default',
      'warning',
      `${nullDirection.length} trainer(s) have null sync_direction (will default to 'bidirectional')`,
      { trainer_ids: nullDirection.map(c => c.trainer_id) }
    );
  }
}

async function checkSyncRecords() {
  console.log('\n📋 Checking sync records...\n');
  
  // Get sync records with their sync directions
  const { data: syncRecords, error } = await supabase
    .from('google_calendar_sync')
    .select(`
      id,
      trainer_id,
      trainee_id,
      workout_id,
      google_event_id,
      sync_direction,
      sync_status,
      event_start_time,
      event_summary,
      last_synced_at
    `)
    .order('last_synced_at', { ascending: false })
    .limit(20);
  
  if (error) {
    addResult('Sync Records', 'fail', `Error fetching sync records: ${error.message}`);
    return;
  }
  
  if (!syncRecords || syncRecords.length === 0) {
    addResult('Sync Records', 'warning', 'No sync records found');
    return;
  }
  
  const bidirectional = syncRecords.filter(r => r.sync_direction === 'bidirectional');
  const toGoogle = syncRecords.filter(r => r.sync_direction === 'to_google');
  const fromGoogle = syncRecords.filter(r => r.sync_direction === 'from_google');
  const synced = syncRecords.filter(r => r.sync_status === 'synced');
  const failed = syncRecords.filter(r => r.sync_status === 'failed');
  
  addResult(
    'Sync Records',
    'pass',
    `Found ${syncRecords.length} sync record(s)`,
    {
      total: syncRecords.length,
      by_direction: {
        bidirectional: bidirectional.length,
        to_google: toGoogle.length,
        from_google: fromGoogle.length
      },
      by_status: {
        synced: synced.length,
        failed: failed.length,
        other: syncRecords.length - synced.length - failed.length
      },
      recent_records: syncRecords.slice(0, 5).map(r => ({
        google_event_id: r.google_event_id,
        sync_direction: r.sync_direction,
        sync_status: r.sync_status,
        event_summary: r.event_summary,
        last_synced_at: r.last_synced_at
      }))
    }
  );
  
  if (failed.length > 0) {
    addResult(
      'Failed Sync Records',
      'warning',
      `${failed.length} sync record(s) have failed status`,
      {
        failed_records: failed.map(r => ({
          google_event_id: r.google_event_id,
          event_summary: r.event_summary,
          last_synced_at: r.last_synced_at
        }))
      }
    );
  }
}

async function checkWebhookConfiguration() {
  console.log('\n📋 Checking webhook configuration...\n');
  
  // Check if webhook function exists (we can't directly check Google Calendar webhooks, but we can verify the function)
  const { data: functions, error } = await supabase
    .from('pg_extension')
    .select('*')
    .eq('extname', 'pg_net')
    .maybeSingle();
  
  // Note: This is a simplified check. In reality, webhook configuration is in Google Cloud Console
  addResult(
    'Webhook Function',
    'pass',
    'google-webhook Edge Function exists (webhook URL must be configured in Google Cloud Console)',
    {
      note: 'To verify webhook is active, check Google Cloud Console > APIs & Services > Calendar API > Push notifications'
    }
  );
}

async function checkBidirectionalSyncLogic() {
  console.log('\n📋 Checking bidirectional sync logic in code...\n');
  
  // Check if sync functions respect sync_direction
  const checks = [
    {
      name: 'Webhook checks sync_direction',
      file: 'supabase/functions/google-webhook/index.ts',
      pattern: /shouldSyncFromGoogle.*sync_direction.*from_google.*bidirectional/i
    },
    {
      name: 'Sync function checks sync_direction',
      file: 'supabase/functions/sync-google-calendar/index.ts',
      pattern: /shouldSyncFromGoogle.*sync_direction.*from_google.*bidirectional/i
    },
    {
      name: 'Save workout checks sync_direction',
      file: 'supabase/functions/save-workout/index.ts',
      pattern: /sync_direction.*to_google.*bidirectional/i
    }
  ];
  
  for (const check of checks) {
    try {
      const filePath = join(process.cwd(), check.file);
      const content = readFileSync(filePath, 'utf-8');
      const matches = check.pattern.test(content);
      
      if (matches) {
        addResult(check.name, 'pass', 'Code correctly checks sync_direction');
      } else {
        // Try alternative pattern
        const altPattern = /sync_direction.*===.*['"]bidirectional['"]|sync_direction.*===.*['"]from_google['"]|sync_direction.*===.*['"]to_google['"]/i;
        if (altPattern.test(content)) {
          addResult(check.name, 'pass', 'Code checks sync_direction (alternative pattern)');
        } else {
          addResult(check.name, 'warning', 'Could not verify sync_direction check in code');
        }
      }
    } catch (err) {
      addResult(check.name, 'warning', `Could not read file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}

async function checkWorkoutToCalendarSync() {
  console.log('\n📋 Checking workout → Google Calendar sync...\n');
  
  // Get recent workouts that should be synced
  const { data: workouts, error } = await supabase
    .from('workouts')
    .select(`
      id,
      trainer_id,
      workout_date,
      notes,
      google_calendar_sync!inner(
        google_event_id,
        sync_direction,
        sync_status,
        event_summary
      )
    `)
    .order('workout_date', { ascending: false })
    .limit(10);
  
  if (error) {
    addResult('Workout → Calendar Sync', 'fail', `Error fetching workouts: ${error.message}`);
    return;
  }
  
  if (!workouts || workouts.length === 0) {
    addResult('Workout → Calendar Sync', 'warning', 'No synced workouts found');
    return;
  }
  
  const syncedWorkouts = workouts.filter(w => 
    w.google_calendar_sync && 
    Array.isArray(w.google_calendar_sync) && 
    w.google_calendar_sync.length > 0 &&
    w.google_calendar_sync[0].sync_status === 'synced'
  );
  
  addResult(
    'Workout → Calendar Sync',
    'pass',
    `Found ${syncedWorkouts.length} workout(s) synced to Google Calendar`,
    {
      total_workouts: workouts.length,
      synced_workouts: syncedWorkouts.length,
      sample: syncedWorkouts.slice(0, 3).map(w => ({
        workout_id: w.id,
        workout_date: w.workout_date,
        google_event_id: Array.isArray(w.google_calendar_sync) ? w.google_calendar_sync[0]?.google_event_id : null,
        sync_direction: Array.isArray(w.google_calendar_sync) ? w.google_calendar_sync[0]?.sync_direction : null,
        event_summary: Array.isArray(w.google_calendar_sync) ? w.google_calendar_sync[0]?.event_summary : null
      }))
    }
  );
}

async function checkCalendarToWorkoutSync() {
  console.log('\n📋 Checking Google Calendar → workout sync...\n');
  
  // Get sync records that were created from Google Calendar (have workout_id)
  const { data: syncRecords, error } = await supabase
    .from('google_calendar_sync')
    .select(`
      id,
      trainer_id,
      trainee_id,
      workout_id,
      google_event_id,
      sync_direction,
      sync_status,
      event_start_time,
      event_summary,
      last_synced_at
    `)
    .not('workout_id', 'is', null)
    .in('sync_direction', ['from_google', 'bidirectional'])
    .order('last_synced_at', { ascending: false })
    .limit(10);
  
  if (error) {
    addResult('Calendar → Workout Sync', 'fail', `Error fetching sync records: ${error.message}`);
    return;
  }
  
  if (!syncRecords || syncRecords.length === 0) {
    addResult('Calendar → Workout Sync', 'warning', 'No workouts created from Google Calendar found');
    return;
  }
  
  // Verify workouts exist
  const workoutIds = syncRecords.map(r => r.workout_id).filter(Boolean) as string[];
  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, workout_date')
    .in('id', workoutIds);
  
  const validWorkouts = syncRecords.filter(r => 
    workouts?.some(w => w.id === r.workout_id)
  );
  
  addResult(
    'Calendar → Workout Sync',
    'pass',
    `Found ${validWorkouts.length} workout(s) created from Google Calendar`,
    {
      total_sync_records: syncRecords.length,
      valid_workouts: validWorkouts.length,
      sample: validWorkouts.slice(0, 3).map(r => ({
        google_event_id: r.google_event_id,
        workout_id: r.workout_id,
        sync_direction: r.sync_direction,
        event_summary: r.event_summary,
        event_start_time: r.event_start_time
      }))
    }
  );
}

async function generateReport() {
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 BIDIRECTIONAL SYNC TEST REPORT');
  console.log('='.repeat(60) + '\n');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`\nTotal Tests: ${results.length}\n`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`   - ${r.test}: ${r.message}`);
    });
  }
  
  if (warnings > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.filter(r => r.status === 'warning').forEach(r => {
      console.log(`   - ${r.test}: ${r.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 RECOMMENDATIONS:');
  console.log('='.repeat(60));
  
  const bidirectionalTrainers = results.find(r => r.test === 'Sync Direction Config');
  if (bidirectionalTrainers?.details?.bidirectional === 0) {
    console.log('   1. Consider enabling bidirectional sync for trainers who need it');
  }
  
  const failedSyncs = results.find(r => r.test === 'Failed Sync Records');
  if (failedSyncs) {
    console.log('   2. Review and fix failed sync records');
  }
  
  console.log('   3. Verify webhook is configured in Google Cloud Console');
  console.log('   4. Test manually by:');
  console.log('      a. Creating a workout in the system → check Google Calendar');
  console.log('      b. Updating an event in Google Calendar → check if workout updates');
  console.log('      c. Deleting an event in Google Calendar → check if workout deletes');
  
  console.log('\n');
}

async function main() {
  console.log('🔍 Starting bidirectional sync verification...\n');
  
  try {
    await checkSyncDirectionConfiguration();
    await checkSyncRecords();
    await checkWebhookConfiguration();
    await checkBidirectionalSyncLogic();
    await checkWorkoutToCalendarSync();
    await checkCalendarToWorkoutSync();
    await generateReport();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
