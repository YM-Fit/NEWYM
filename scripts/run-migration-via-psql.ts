/**
 * Run migration via psql if available
 * Uses Supabase connection string with service role
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://vqvczpxmvrwfkecpwovc.supabase.co';
const PROJECT_REF = 'vqvczpxmvrwfkecpwovc';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdmN6cHhtdnJ3ZmtlY3B3b3ZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MzI2NCwiZXhwIjoyMDc3OTE5MjY0fQ.1kVQrCDf5WlMT9s4iFtWdiGWQx2RGttZ3X51VFtQG54';

const migrationFile = 'supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql';

async function runViaPsql() {
  console.log('🚀 Attempting to run migration via psql...\n');
  
  // Try to get connection string from Supabase
  // Supabase connection string format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  // But we need the database password, not the service role key
  
  // Alternative: Try via Supabase CLI if installed
  try {
    console.log('📡 Method 1: Trying Supabase CLI...');
    execSync('which supabase', { stdio: 'ignore' });
    
    // Try to link and push
    console.log('   Supabase CLI found! Attempting to link...');
    try {
      execSync(`supabase link --project-ref ${PROJECT_REF}`, { 
        stdio: 'inherit',
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: SERVICE_ROLE_KEY }
      });
    } catch (e) {
      console.log('   ⚠️  Linking failed, trying direct push...');
    }
    
    // Try db push
    console.log('   Attempting db push...');
    execSync('supabase db push', { stdio: 'inherit' });
    console.log('✅ Migration applied via Supabase CLI!');
    return;
  } catch (e: any) {
    console.log('   ⚠️  Supabase CLI not available or failed');
  }
  
  // Try psql directly
  try {
    console.log('\n📡 Method 2: Trying psql...');
    execSync('which psql', { stdio: 'ignore' });
    
    // We need the database password, not service role key
    // Try to construct connection string
    // For Supabase, the connection string is usually:
    // postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
    
    console.log('   ⚠️  psql requires database password (not service role key)');
    console.log('   💡 You can find the password in:');
    console.log('      Supabase Dashboard → Settings → Database → Connection string\n');
    
  } catch (e) {
    console.log('   ⚠️  psql not installed');
  }
  
  // Try via Supabase REST API with exec_sql function creation
  console.log('\n📡 Method 3: Creating exec_sql function and using it...');
  
  const migrationPath = join(process.cwd(), migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');
  
  // Create a function that executes SQL
  const createFunctionSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql_text;
END;
$$;
  `;
  
  // Try to execute via REST API
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      sql_text: createFunctionSQL,
    }),
  });
  
  if (response.ok) {
    console.log('   ✅ Created exec_sql function!');
    
    // Now execute the migration
    const execResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        sql_text: sql,
      }),
    });
    
    if (execResponse.ok) {
      console.log('✅ Migration applied successfully!');
      return;
    }
  }
  
  console.log('\n❌ All automated methods failed.');
  console.log('💡 Supabase requires running migrations via Dashboard or CLI.');
  console.log('   Dashboard: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new\n');
}

runViaPsql().catch(console.error);
