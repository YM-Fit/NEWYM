/**
 * Apply migration using Legacy JWT Secret via Management API
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://vqvczpxmvrwfkecpwovc.supabase.co';
const PROJECT_REF = 'vqvczpxmvrwfkecpwovc';
const LEGACY_JWT_SECRET = '7zwA7374P4QAmP4h/Q/T/NYPmhrA9HOH+SXv3Gs1Wz8KWi6+TOU8Nu6t0RWRXCpvholfRHw8gfsT2k7+IHEbNg==';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdmN6cHhtdnJ3ZmtlY3B3b3ZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MzI2NCwiZXhwIjoyMDc3OTE5MjY0fQ.1kVQrCDf5WlMT9s4iFtWdiGWQx2RGttZ3X51VFtQG54';

const migrationFile = 'supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql';

async function applyMigration() {
  console.log('🚀 Attempting to apply migration via Management API...\n');
  
  const migrationPath = join(process.cwd(), migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');
  
  // Try Management API endpoint
  const managementUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  
  console.log(`📡 Using Management API: ${managementUrl}`);
  console.log(`🔑 Using Legacy JWT Secret\n`);
  
  try {
    // Try with service role key first
    console.log('📡 Method 1: Trying with Service Role Key...');
    const response1 = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query: sql,
      }),
    });
    
    if (response1.ok) {
      const result = await response1.json();
      console.log('✅ Migration applied successfully via Service Role Key!');
      console.log('Result:', JSON.stringify(result, null, 2));
      return;
    } else {
      const error1 = await response1.text();
      console.log(`⚠️  Service Role Key failed: ${response1.status} ${response1.statusText}`);
      console.log(`   Details: ${error1.substring(0, 200)}\n`);
    }
    
    // Try with Legacy JWT Secret (base64 encoded)
    console.log('📡 Method 2: Trying with Legacy JWT Secret...');
    
    // The Management API might need a different format
    // Let's try creating a JWT token with the secret
    const response2 = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LEGACY_JWT_SECRET}`,
      },
      body: JSON.stringify({
        query: sql,
      }),
    });
    
    if (response2.ok) {
      const result = await response2.json();
      console.log('✅ Migration applied successfully via Legacy JWT Secret!');
      console.log('Result:', JSON.stringify(result, null, 2));
      return;
    } else {
      const error2 = await response2.text();
      console.log(`⚠️  Legacy JWT Secret failed: ${response2.status} ${response2.statusText}`);
      console.log(`   Details: ${error2.substring(0, 200)}\n`);
    }
    
    // Try alternative Management API endpoint
    console.log('📡 Method 3: Trying alternative endpoint...');
    const altUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/rest/v1/rpc/exec_sql`;
    
    const response3 = await fetch(altUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        sql: sql,
      }),
    });
    
    if (response3.ok) {
      const result = await response3.json();
      console.log('✅ Migration applied successfully via alternative endpoint!');
      console.log('Result:', JSON.stringify(result, null, 2));
      return;
    } else {
      const error3 = await response3.text();
      console.log(`⚠️  Alternative endpoint failed: ${response3.status} ${response3.statusText}`);
      console.log(`   Details: ${error3.substring(0, 200)}\n`);
    }
    
    // Try via Supabase REST API with exec_sql function
    console.log('📡 Method 4: Trying via Supabase REST API exec_sql...');
    const restUrl = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
    
    const response4 = await fetch(restUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        sql_query: sql,
      }),
    });
    
    if (response4.ok) {
      const result = await response4.json();
      console.log('✅ Migration applied successfully via REST API!');
      console.log('Result:', JSON.stringify(result, null, 2));
      return;
    } else {
      const error4 = await response4.text();
      console.log(`⚠️  REST API failed: ${response4.status} ${response4.statusText}`);
      console.log(`   Details: ${error4.substring(0, 200)}\n`);
    }
    
    console.log('❌ All methods failed. Supabase does not allow direct SQL execution via API.');
    console.log('\n💡 Please run the migration via Dashboard:');
    console.log('   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Please run the migration via Dashboard:');
    console.log('   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new\n');
  }
}

applyMigration().catch(console.error);
