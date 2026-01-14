/**
 * Run the fix migration for trainee_goals, habits, and food_diary tables
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx scripts/run-fix-migration.ts
 * 
 * Or set it interactively:
 *   npx tsx scripts/run-fix-migration.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://vqvczpxmvrwfkecpwovc.supabase.co';
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const migrationFile = 'supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql';

function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function runMigration() {
  console.log('🚀 Running Fix Migration\n');
  console.log('This migration will:');
  console.log('  1. Create food_diary table (if missing)');
  console.log('  2. Create food_diary_meals table (if missing)');
  console.log('  3. Add INSERT policy for trainees on trainee_goals');
  console.log('  4. Ensure trainee_habits and habit_logs tables exist');
  console.log('  5. Add INSERT policy for trainees on trainee_habits\n');

  // Get Service Role Key if not set
  if (!SUPABASE_SERVICE_KEY) {
    console.log('📝 Service Role Key is required to run migrations');
    console.log('   You can find it in: Supabase Dashboard → Settings → API → service_role key\n');
    SUPABASE_SERVICE_KEY = await question('Enter your SUPABASE_SERVICE_ROLE_KEY: ');
    
    if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.trim() === '') {
      console.error('❌ Service Role Key is required!');
      process.exit(1);
    }
  }

  console.log(`📖 Reading migration: ${migrationFile}\n`);
  const migrationPath = join(process.cwd(), migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');

  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔌 Connecting to Supabase...');
  
  // Test connection
  try {
    const { error } = await supabase.from('trainers').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    console.log('✅ Connected successfully!\n');
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n💡 Please check your Service Role Key');
    process.exit(1);
  }

  console.log('⚠️  Note: Supabase REST API does not support direct SQL execution.');
  console.log('   However, we can try to execute via Management API...\n');

  // Try Management API
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (projectRef) {
    console.log(`📡 Attempting Management API for project: ${projectRef}`);
    
    try {
      // Management API endpoint
      const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
      
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
        console.log('✅ Migration applied successfully via Management API!');
        console.log('Result:', JSON.stringify(result, null, 2));
        return;
      } else {
        const errorText = await response.text();
        console.log(`⚠️  Management API returned: ${response.status} ${response.statusText}`);
        console.log('Details:', errorText.substring(0, 200));
      }
    } catch (error: any) {
      console.log(`⚠️  Management API error: ${error.message}`);
    }
  }

  // If Management API doesn't work, we need to use Dashboard
  console.log('\n💡 Management API method not available.');
  console.log('   Supabase requires running migrations via Dashboard or CLI.\n');
  console.log('📋 Please run this SQL manually:\n');
  console.log('   1. Go to: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new');
  console.log('   2. Copy and paste the SQL below');
  console.log('   3. Click "Run"\n');
  console.log('─'.repeat(80));
  console.log(sql);
  console.log('─'.repeat(80));
  console.log('\n✅ After running, all errors should be fixed!');
}

runMigration().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
