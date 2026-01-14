/**
 * Apply migration directly via Supabase using service role
 * Attempts multiple methods to execute SQL
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vqvczpxmvrwfkecpwovc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdmN6cHhtdnJ3ZmtlY3B3b3ZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MzI2NCwiZXhwIjoyMDc3OTE5MjY0fQ.1kVQrCDf5WlMT9s4iFtWdiGWQx2RGttZ3X51VFtQG54';

const migrationFile = 'supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql';

async function applyMigration() {
  console.log('🚀 Attempting to apply migration...\n');
  
  const migrationPath = join(process.cwd(), migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Method 1: Try via RPC function (if exists)
  console.log('📡 Method 1: Trying via RPC function...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (!error) {
      console.log('✅ Success via RPC!');
      return;
    }
    console.log('⚠️  RPC function not available');
  } catch (e) {
    console.log('⚠️  RPC method failed');
  }

  // Method 2: Try splitting into statements and executing via REST
  console.log('\n📡 Method 2: Trying to execute statements individually...');
  
  // Split SQL into statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));
  
  console.log(`   Found ${statements.length} statements`);
  console.log('⚠️  Cannot execute DDL statements via REST API');
  
  // Method 3: Try via PostgREST directly
  console.log('\n📡 Method 3: Trying via PostgREST...');
  console.log('⚠️  PostgREST does not support DDL statements');
  
  console.log('\n💡 Supabase does not allow direct SQL execution via REST API.');
  console.log('   The migration must be run via Dashboard or CLI.\n');
  console.log('📋 Next steps:');
  console.log('   1. Open: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new');
  console.log('   2. Copy the SQL from the migration file');
  console.log('   3. Paste and run it\n');
  
  console.log('📄 Migration file location:');
  console.log(`   ${migrationFile}\n`);
  
  // Show first few lines as preview
  const preview = sql.split('\n').slice(0, 10).join('\n');
  console.log('📝 Preview (first 10 lines):');
  console.log('─'.repeat(60));
  console.log(preview);
  console.log('...');
  console.log('─'.repeat(60));
}

applyMigration().catch(console.error);
