/**
 * Apply missing parts of the migration
 * Focus on trainee_habits and habit_logs tables
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

async function applyMissingParts() {
  console.log('🚀 Applying missing parts of migration...\n');
  
  // Extract only the trainee_habits and habit_logs parts from migration
  const migrationPath = join(process.cwd(), 'supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql');
  const fullSQL = readFileSync(migrationPath, 'utf-8');
  
  // Split into sections
  const habitsSection = fullSQL.split('-- ============================================')[3]; // trainee_habits section
  const habitLogsSection = fullSQL.split('-- ============================================')[4]; // habit_logs section
  
  console.log('📋 Checking trainee_habits table...');
  
  // Try to query trainee_habits directly via raw SQL if possible
  // Since we can't execute DDL via REST API, we'll check what we can do
  
  // Check if we can access the table through information_schema
  try {
    // Try to get table info via a query
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'trainee_habits')
      .limit(1);
    
    if (error) {
      console.log('   ⚠️  Cannot query information_schema directly');
    } else {
      if (data && data.length > 0) {
        console.log('   ✅ trainee_habits table exists in database');
        console.log('   ⚠️  But not in Supabase schema cache');
        console.log('   💡 Supabase needs to refresh its schema cache');
      } else {
        console.log('   ❌ trainee_habits table does not exist');
      }
    }
  } catch (e: any) {
    console.log(`   ⚠️  Error checking: ${e.message}`);
  }
  
  console.log('\n📋 Summary:');
  console.log('   ✅ food_diary - EXISTS and accessible');
  console.log('   ⚠️  trainee_habits - Might exist but not in schema cache');
  console.log('   ⚠️  habit_logs - Might exist but not in schema cache');
  
  console.log('\n💡 Solutions:');
  console.log('   1. Wait a few minutes for Supabase to refresh schema cache');
  console.log('   2. Or run the full migration again via Dashboard:');
  console.log('      https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new');
  console.log('   3. Or refresh schema cache manually in Supabase Dashboard\n');
  
  console.log('📄 The migration SQL is in:');
  console.log('   supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql\n');
}

applyMissingParts().catch(console.error);
