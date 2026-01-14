/**
 * Apply migration via HTTP request to Supabase SQL Editor API
 * This uses the Supabase Management API
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
  console.log(`📖 Reading migration: ${migrationFile}\n`);
  const migrationPath = join(process.cwd(), migrationFile);
  let sql = readFileSync(migrationPath, 'utf-8');
  
  // Remove comments for cleaner execution
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove /* */ comments
  sql = sql.replace(/--.*$/gm, ''); // Remove -- comments
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  console.log(`📝 Found ${statements.length} SQL statements\n`);
  
  // Use Supabase Management API
  // Note: Supabase doesn't expose direct SQL execution via REST API
  // We need to use the Dashboard SQL Editor or create a function
  
  console.log('⚠️  Supabase REST API does not support direct SQL execution.');
  console.log('   Creating a temporary function to execute the migration...\n');
  
  try {
    // Create a function that executes our SQL
    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION apply_meal_plan_food_items_migration()
RETURNS void AS $$
BEGIN
  ${statements.join(';\n  ')}
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Try to execute via PostgREST RPC
    const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/apply_meal_plan_food_items_migration`;
    
    console.log('🚀 Attempting to create and execute migration function...\n');
    
    // First, we need to execute the CREATE FUNCTION via direct connection
    // Since we can't do that via REST API, we'll provide instructions
    
    console.log('💡 To apply this migration, you have two options:\n');
    console.log('Option 1: Via Supabase Dashboard (Recommended)');
    console.log('  1. Go to: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new');
    console.log('  2. Copy and paste the SQL below');
    console.log('  3. Click "Run"\n');
    
    console.log('Option 2: Via psql or Supabase CLI');
    console.log('  Use the SQL below with your database connection\n');
    
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    
    // Also try to check if table exists
    const checkUrl = `${SUPABASE_URL}/rest/v1/meal_plan_food_items?select=id&limit=1`;
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    
    if (checkResponse.ok) {
      console.log('\n✅ Table meal_plan_food_items already exists!');
    } else if (checkResponse.status === 404 || checkResponse.status === 406) {
      console.log('\n❌ Table meal_plan_food_items does not exist yet.');
      console.log('   Please run the SQL above to create it.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

applyMigration().catch(console.error);
