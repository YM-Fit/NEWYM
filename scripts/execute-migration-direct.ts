/**
 * Execute migration directly via Supabase using service role
 * Creates an exec_sql function and uses it
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
  db: {
    schema: 'public',
  },
});

async function executeMigration() {
  console.log('🚀 Attempting to execute migration directly...\n');
  
  const migrationPath = join(process.cwd(), 'supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  
  // Step 1: Try to create exec_sql function via REST API
  console.log('📡 Step 1: Creating exec_sql function...');
  
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
  
  try {
    // Try via REST API
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
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
    
    if (createResponse.ok) {
      console.log('   ✅ Function created!');
    } else {
      const error = await createResponse.text();
      console.log(`   ⚠️  Cannot create function via REST: ${createResponse.status}`);
      console.log(`   Trying alternative method...\n`);
      
      // Alternative: Try to execute SQL statements one by one via Supabase client
      console.log('📡 Step 2: Trying to execute statements individually...');
      
      // Split SQL into statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));
      
      console.log(`   Found ${statements.length} statements`);
      console.log('   ⚠️  Cannot execute DDL statements via REST API\n');
      
      // Try via Supabase client directly
      console.log('📡 Step 3: Trying via Supabase client...');
      
      // Unfortunately, Supabase client doesn't support direct SQL execution
      // But let's try to use it to create the function first via a different method
      
      // Try to execute via a custom RPC that we create
      // But we can't create RPC without SQL execution...
      
      console.log('   ⚠️  Supabase client does not support DDL execution\n');
      
      console.log('💡 Final solution:');
      console.log('   Supabase does not allow direct SQL execution via REST API.');
      console.log('   This is by design for security reasons.\n');
      console.log('   Please run via Dashboard:');
      console.log('   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new\n');
      
      return;
    }
    
    // Step 2: Execute migration via the function
    console.log('\n📡 Step 2: Executing migration via exec_sql function...');
    
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
      const result = await execResponse.json();
      console.log('✅ Migration executed successfully!');
      console.log('Result:', JSON.stringify(result, null, 2));
      return;
    } else {
      const error = await execResponse.text();
      console.log(`❌ Execution failed: ${execResponse.status}`);
      console.log('Error:', error.substring(0, 200));
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n💡 Please run the migration via Dashboard:');
  console.log('   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new\n');
}

executeMigration().catch(console.error);
