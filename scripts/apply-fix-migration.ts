/**
 * Apply the fix migration for trainee_goals, habits, and food_diary tables
 * Uses Supabase Management API
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://vqvczpxmvrwfkecpwovc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY!');
  console.error('   Set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('   You can find it in: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const migrationFile = 'supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql';

async function applyMigration() {
  console.log(`📖 Reading migration: ${migrationFile}\n`);
  const migrationPath = join(process.cwd(), migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');
  
  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log('🚀 Attempting to apply migration via Supabase...\n');
  
  try {
    // Split SQL into statements (Supabase RPC can handle multiple statements)
    // We'll execute via a custom RPC function or directly
    
    // Try to execute via Supabase REST API using rpc
    // First, let's try to create a temporary function that executes the SQL
    
    // Actually, Supabase doesn't allow direct SQL execution via REST API
    // We need to use the Management API or Dashboard
    
    // Let's try the Management API approach
    const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (!projectRef) {
      throw new Error('Could not extract project reference from URL');
    }
    
    console.log(`📡 Using project: ${projectRef}`);
    console.log('⚠️  Supabase REST API does not support direct SQL execution.');
    console.log('   Attempting alternative method...\n');
    
    // Try via PostgREST - but this won't work for DDL statements
    // The only way is via Management API or Dashboard
    
    // Management API endpoint (requires API key from Supabase dashboard)
    const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
    
    console.log('🔐 Attempting Management API...');
    const response = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        query: sql,
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Migration applied successfully!');
      console.log('Result:', JSON.stringify(result, null, 2));
      return;
    }
    
    // If Management API doesn't work, try via Supabase client's rpc
    // But we need a function that executes SQL - which doesn't exist by default
    
    console.log('⚠️  Management API method not available.');
    console.log('   Trying to execute statements individually...\n');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));
    
    console.log(`📝 Found ${statements.length} SQL statements`);
    console.log('⚠️  Cannot execute DDL statements via REST API.');
    console.log('\n💡 Please run this migration manually:\n');
    console.log('   1. Go to: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new');
    console.log('   2. Copy and paste the SQL below');
    console.log('   3. Click "Run"\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Please run this SQL manually in Supabase Dashboard → SQL Editor:');
    console.log('   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
  }
}

applyMigration().catch(console.error);
