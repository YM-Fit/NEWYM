/**
 * Apply migration via Supabase Management API
 * Requires Service Role Key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase Service Role Key!');
  console.error('   Set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('   You can find it in: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const migrationFile = process.argv[2] || 'supabase/migrations/20260122000000_add_meal_plan_food_items.sql';

async function applyMigration() {
  console.log(`📖 Reading migration: ${migrationFile}`);
  const migrationPath = join(process.cwd(), migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');
  
  // Use Management API endpoint
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  
  console.log('\n🚀 Attempting to apply migration via Management API...\n');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY!}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', error);
      console.log('\n💡 Alternative: Run this SQL in Supabase Dashboard → SQL Editor:');
      console.log('─'.repeat(80));
      console.log(sql);
      console.log('─'.repeat(80));
      return;
    }
    
    const result = await response.json();
    console.log('✅ Migration applied successfully!');
    console.log('Result:', result);
    
  } catch (error: any) {
    console.error('❌ Error applying migration:', error.message);
    console.log('\n💡 Please run this SQL manually in Supabase Dashboard → SQL Editor:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
  }
}

applyMigration().catch(console.error);
