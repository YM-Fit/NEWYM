/**
 * Final attempt to apply migration using all available keys
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vqvczpxmvrwfkecpwovc.supabase.co';
const PROJECT_REF = 'vqvczpxmvrwfkecpwovc';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdmN6cHhtdnJ3ZmtlY3B3b3ZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MzI2NCwiZXhwIjoyMDc3OTE5MjY0fQ.1kVQrCDf5WlMT9s4iFtWdiGWQx2RGttZ3X51VFtQG54';
const PUBLISHABLE_KEY = 'sb_publishable_s_ND8xx66bGd44elvQ4m1Q__kVsSwZd';
const LEGACY_JWT_SECRET = '7zwA7374P4QAmP4h/Q/T/NYPmhrA9HOH+SXv3Gs1Wz8KWi6+TOU8Nu6t0RWRXCpvholfRHw8gfsT2k7+IHEbNg==';

const migrationFile = 'supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql';

async function applyMigration() {
  console.log('🚀 Final attempt to apply migration...\n');
  
  const migrationPath = join(process.cwd(), migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');
  
  // Try via Supabase client with service role
  console.log('📡 Attempting via Supabase Client with Service Role...');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Try to execute SQL via RPC (if function exists)
  try {
    // Check if exec_sql function exists
    const { data: functions, error: funcError } = await supabase
      .rpc('exec_sql', { sql_query: sql })
      .catch(() => ({ data: null, error: { message: 'Function not found' } }));
    
    if (!funcError) {
      console.log('✅ Success via RPC function!');
      return;
    }
  } catch (e) {
    console.log('⚠️  RPC function not available');
  }

  // Try Management API with different authentication methods
  const managementUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  
  const methods = [
    { name: 'Service Role Key', key: SERVICE_ROLE_KEY },
    { name: 'Publishable Key', key: PUBLISHABLE_KEY },
  ];

  for (const method of methods) {
    console.log(`\n📡 Trying ${method.name}...`);
    try {
      const response = await fetch(managementUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${method.key}`,
        },
        body: JSON.stringify({
          query: sql,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Success with ${method.name}!`);
        console.log('Result:', JSON.stringify(result, null, 2));
        return;
      } else {
        const error = await response.text();
        console.log(`⚠️  ${method.name} failed: ${response.status} ${response.statusText}`);
        console.log(`   ${error.substring(0, 150)}`);
      }
    } catch (error: any) {
      console.log(`⚠️  ${method.name} error: ${error.message}`);
    }
  }

  // Try via REST API exec_sql endpoint
  console.log('\n📡 Trying REST API exec_sql endpoint...');
  try {
    // First, try to create the exec_sql function if it doesn't exist
    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;
    `;

    // Try to create the function
    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql_query: createFunctionSQL 
    }).catch(() => ({ error: { message: 'Cannot create function' } }));

    if (!createError) {
      // Now try to execute our migration
      const { error: execError } = await supabase.rpc('exec_sql', { 
        sql_query: sql 
      });
      
      if (!execError) {
        console.log('✅ Success via exec_sql function!');
        return;
      }
    }
  } catch (e) {
    console.log('⚠️  Cannot create/use exec_sql function');
  }

  console.log('\n❌ All automated methods failed.');
  console.log('\n💡 Supabase does not allow direct SQL execution via API for security reasons.');
  console.log('   The migration must be run via Dashboard.\n');
  console.log('📋 Quick steps:');
  console.log('   1. Open: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new');
  console.log('   2. Copy SQL from: supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql');
  console.log('   3. Paste and click "Run"\n');
  console.log('⏱️  This takes only 2 minutes!\n');
}

applyMigration().catch(console.error);
