/**
 * Run SQL directly via Supabase Management API
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

async function runSQL() {
  console.log(`📖 Reading migration: ${migrationFile}\n`);
  const migrationPath = join(process.cwd(), migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');
  
  // Use Supabase Management API
  // The Management API endpoint for SQL execution
  const url = `${SUPABASE_URL.replace('https://', 'https://api.')}/v1/projects/vqvczpxmvrwfkecpwovc/database/query`;
  
  console.log('🚀 Attempting to execute SQL via Management API...\n');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        query: sql,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', response.status, response.statusText);
      console.error('Details:', errorText);
      
      // Fallback: try via REST API RPC
      console.log('\n💡 Trying alternative method...\n');
      
      // Check if table exists first
      const checkUrl = `${SUPABASE_URL}/rest/v1/meal_plan_food_items?select=id&limit=1`;
      const checkResponse = await fetch(checkUrl, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      
      if (checkResponse.ok) {
        console.log('✅ Table meal_plan_food_items already exists!');
        return;
      }
      
      console.log('⚠️  Cannot execute SQL directly via API.');
      console.log('   Please run this SQL in Supabase Dashboard → SQL Editor:\n');
      console.log('─'.repeat(80));
      console.log(sql);
      console.log('─'.repeat(80));
      return;
    }
    
    const result = await response.json();
    console.log('✅ Migration applied successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Please run this SQL manually in Supabase Dashboard → SQL Editor:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
  }
}

runSQL().catch(console.error);
