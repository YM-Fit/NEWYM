/**
 * Final comprehensive check of database state
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vqvczpxmvrwfkecpwovc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdmN6cHhtdnJ3ZmtlY3B3b3ZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MzI2NCwiZXhwIjoyMDc3OTE5MjY0fQ.1kVQrCDf5WlMT9s4iFtWdiGWQx2RGttZ3X51VFtQG54';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function finalCheck() {
  console.log('🔍 Final Database Check\n');
  console.log('='.repeat(60));
  
  const tables = [
    'food_diary',
    'food_diary_meals', 
    'trainee_habits',
    'habit_logs',
    'trainee_goals'
  ];
  
  const results: Record<string, { exists: boolean; accessible: boolean; error?: string }> = {};
  
  for (const table of tables) {
    console.log(`\n📋 Checking ${table}...`);
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('not found') || error.message.includes('schema cache')) {
          results[table] = { exists: false, accessible: false, error: error.message };
          console.log(`   ❌ NOT FOUND: ${error.message.substring(0, 80)}`);
        } else {
          // Table exists but might have RLS issues
          results[table] = { exists: true, accessible: false, error: error.message };
          console.log(`   ⚠️  EXISTS but not accessible: ${error.message.substring(0, 80)}`);
        }
      } else {
        results[table] = { exists: true, accessible: true };
        console.log(`   ✅ EXISTS and ACCESSIBLE`);
      }
    } catch (e: any) {
      results[table] = { exists: false, accessible: false, error: e.message };
      console.log(`   ❌ ERROR: ${e.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:\n');
  
  const existing = Object.entries(results).filter(([_, r]) => r.exists).length;
  const accessible = Object.entries(results).filter(([_, r]) => r.accessible).length;
  
  console.log(`   Tables existing: ${existing}/${tables.length}`);
  console.log(`   Tables accessible: ${accessible}/${tables.length}\n`);
  
  const missing = Object.entries(results)
    .filter(([_, r]) => !r.exists)
    .map(([table]) => table);
  
  const inaccessible = Object.entries(results)
    .filter(([_, r]) => r.exists && !r.accessible)
    .map(([table]) => table);
  
  if (missing.length > 0) {
    console.log('❌ Missing tables:');
    missing.forEach(table => {
      console.log(`   - ${table}`);
      const error = results[table].error;
      if (error && error.includes('schema cache')) {
        console.log(`     💡 This might be a schema cache issue. Try:`);
        console.log(`        1. Wait 2-3 minutes for cache to refresh`);
        console.log(`        2. Or run the migration again via Dashboard`);
      }
    });
    console.log('');
  }
  
  if (inaccessible.length > 0) {
    console.log('⚠️  Tables exist but not accessible (RLS issues?):');
    inaccessible.forEach(table => {
      console.log(`   - ${table}: ${results[table].error?.substring(0, 60)}`);
    });
    console.log('');
  }
  
  if (missing.length === 0 && inaccessible.length === 0) {
    console.log('✅ All tables exist and are accessible!');
    console.log('   The migration appears to be complete.\n');
  } else {
    console.log('💡 To fix issues, run the migration via Dashboard:');
    console.log('   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new\n');
    console.log('   Migration file:');
    console.log('   supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql\n');
  }
}

finalCheck().catch(console.error);
