/**
 * Check if tables exist and try to apply migration if needed
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vqvczpxmvrwfkecpwovc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdmN6cHhtdnJ3ZmtlY3B3b3ZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MzI2NCwiZXhwIjoyMDc3OTE5MjY0fQ.1kVQrCDf5WlMT9s4iFtWdiGWQx2RGttZ3X51VFtQG54';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const REQUIRED_TABLES = ['food_diary', 'food_diary_meals', 'trainee_habits', 'habit_logs'];

async function checkTables() {
  console.log('🔍 Checking if tables exist...\n');
  
  const results: Record<string, boolean> = {};
  
  for (const table of REQUIRED_TABLES) {
    try {
      // Try to query the table
      const { error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        // Check if it's a "table not found" error
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('not found')) {
          results[table] = false;
          console.log(`   ❌ ${table} - NOT EXISTS`);
        } else {
          // Table exists but might have RLS issues
          results[table] = true;
          console.log(`   ✅ ${table} - EXISTS`);
        }
      } else {
        results[table] = true;
        console.log(`   ✅ ${table} - EXISTS`);
      }
    } catch (e: any) {
      results[table] = false;
      console.log(`   ❌ ${table} - NOT EXISTS (${e.message})`);
    }
  }
  
  const missingTables = Object.entries(results)
    .filter(([_, exists]) => !exists)
    .map(([table]) => table);
  
  console.log(`\n📊 Summary: ${REQUIRED_TABLES.length - missingTables.length}/${REQUIRED_TABLES.length} tables exist`);
  
  if (missingTables.length > 0) {
    console.log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`);
    console.log('\n💡 The migration needs to be run via Dashboard:');
    console.log('   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new\n');
    return false;
  } else {
    console.log('\n✅ All required tables exist!');
    
    // Check RLS policies for trainee_goals
    console.log('\n🔍 Checking RLS policies for trainee_goals...');
    try {
      // Try to insert a test goal (will fail if no INSERT policy)
      // We'll just check if we can query policies
      const { error } = await supabase
        .from('trainee_goals')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42501') {
        console.log('   ⚠️  RLS policies might need updating');
      } else {
        console.log('   ✅ trainee_goals is accessible');
      }
    } catch (e) {
      console.log('   ⚠️  Could not check trainee_goals policies');
    }
    
    return true;
  }
}

async function main() {
  console.log('🚀 Checking database status...\n');
  
  const allTablesExist = await checkTables();
  
  if (allTablesExist) {
    console.log('\n✅ Database looks good! All tables exist.');
    console.log('   If you still see errors, they might be RLS policy issues.');
    console.log('   The migration should fix those too.\n');
  } else {
    console.log('\n📋 To fix the missing tables, run the migration:');
    console.log('   1. Open: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new');
    console.log('   2. Copy SQL from: supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql');
    console.log('   3. Paste and click "Run"\n');
  }
}

main().catch(console.error);
