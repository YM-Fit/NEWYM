/**
 * Apply migration directly via Supabase REST API
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vqvczpxmvrwfkecpwovc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY!');
  process.exit(1);
}

const migrationFile = process.argv[2] || 'supabase/migrations/20260122000000_add_meal_plan_food_items.sql';

async function applyMigration() {
  console.log(`📖 Reading migration: ${migrationFile}`);
  const migrationPath = join(process.cwd(), migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');
  
  // Use Supabase REST API to execute SQL
  // We'll use the Management API endpoint
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  
  console.log('\n🚀 Attempting to apply migration via Supabase REST API...\n');
  
  try {
    // Try direct SQL execution via REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ query: sql }),
    });
    
    if (!response.ok) {
      // Try alternative: use pg REST API
      console.log('⚠️  Direct API method not available. Trying alternative...\n');
      
      // Use Supabase's SQL execution via PostgREST
      // We need to split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
      
      console.log(`📝 Found ${statements.length} SQL statements to execute`);
      console.log('\n⚠️  Supabase REST API doesn't support direct SQL execution.');
      console.log('   Please run this migration via Supabase Dashboard → SQL Editor\n');
      console.log('─'.repeat(80));
      console.log(sql);
      console.log('─'.repeat(80));
      return;
    }
    
    const result = await response.json();
    console.log('✅ Migration applied successfully!');
    console.log('Result:', result);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Please run this SQL manually in Supabase Dashboard → SQL Editor:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
  }
}

applyMigration().catch(console.error);
