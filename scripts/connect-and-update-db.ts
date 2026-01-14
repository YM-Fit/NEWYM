/**
 * Connect to Supabase Database and Check/Update Schema
 * 
 * This script connects to your Supabase database and:
 * 1. Checks which migrations have been applied
 * 2. Shows what tables/columns are missing
 * 3. Can optionally run missing migrations
 * 
 * Usage:
 *   VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key npx tsx scripts/connect-and-update-db.ts
 * 
 * Or with service role key (for migrations):
 *   VITE_SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx scripts/connect-and-update-db.ts --run-migrations
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

let SUPABASE_URL = process.env.VITE_SUPABASE_URL;
let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const RUN_MIGRATIONS = process.argv.includes('--run-migrations');
const INTERACTIVE = process.argv.includes('--interactive') || (!SUPABASE_URL || !SUPABASE_KEY);

// If credentials are missing and not in interactive mode, show error
if (!INTERACTIVE && (!SUPABASE_URL || !SUPABASE_KEY)) {
  console.error('❌ Missing Supabase credentials!');
  console.error('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  console.error('   Or run with --interactive flag');
  process.exit(1);
}

let supabase: any;

interface MigrationInfo {
  name: string;
  content: string;
  timestamp: string;
}

async function getAppliedMigrations(): Promise<string[]> {
  try {
    // Check if migrations table exists
    const { data, error } = await supabase
      .from('supabase_migrations')
      .select('name')
      .order('version');
    
    if (error) {
      // Try alternative table name
      const { data: altData } = await supabase.rpc('get_applied_migrations');
      if (altData) return altData.map((m: any) => m.name);
      return [];
    }
    
    return data?.map(m => m.name) || [];
  } catch {
    return [];
  }
}

function getLocalMigrations(): MigrationInfo[] {
  const migrationsDir = join(process.cwd(), 'supabase/migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  return files.map(file => {
    const content = readFileSync(join(migrationsDir, file), 'utf-8');
    const timestamp = file.split('_')[0];
    return {
      name: file,
      content,
      timestamp
    };
  });
}

// Expected tables from migrations
const EXPECTED_TABLES = [
  'trainers',
  'trainees',
  'muscle_groups',
  'exercises',
  'workouts',
  'workout_trainees',
  'workout_exercises',
  'exercise_sets',
  'measurements',
  'cardio_types',
  'cardio_activities',
  'trainer_notifications',
  'trainee_auth',
  'workout_plans',
  'trainee_workout_plans',
  'workout_plan_days',
  'workout_plan_day_exercises',
  'meal_plans',
  'meal_plan_meals',
  'meal_plan_food_items',
  'daily_log',
  'meals',
  'scale_readings',
  'scale_heartbeats',
  'trainee_self_weights',
  'personal_records',
  'trainee_goals',
];

async function getExistingTables(): Promise<string[]> {
  // Supabase doesn't expose information_schema directly via client
  // We'll check tables by trying to query them
  const existingTables: string[] = [];
  
  for (const table of EXPECTED_TABLES) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (!error) {
        existingTables.push(table);
      }
    } catch {
      // Table doesn't exist or not accessible
    }
  }
  
  return existingTables;
}

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).select('*').limit(0);
    return !error;
  } catch {
    return false;
  }
}

async function runMigration(migration: MigrationInfo): Promise<boolean> {
  console.log(`\n⚠️  Cannot run migrations directly via API.`);
  console.log(`   Use one of these methods:`);
  console.log(`   1. Supabase CLI: supabase db push`);
  console.log(`   2. Supabase Dashboard: SQL Editor`);
  console.log(`   3. Management API with service role key`);
  return false;
}

async function main() {
  console.log('🔌 Connecting to Supabase...\n');
  
  // If interactive mode, prompt for credentials
  if (INTERACTIVE) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };
    
    if (!SUPABASE_URL) {
      SUPABASE_URL = await question('Enter your Supabase URL: ');
    }
    
    if (!SUPABASE_KEY) {
      SUPABASE_KEY = await question('Enter your Supabase Anon Key (or Service Role Key): ');
    }
    
    rl.close();
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('❌ Missing credentials!');
      process.exit(1);
    }
  }
  
  supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
  
  // Test connection
  try {
    const { data, error } = await supabase.from('trainers').select('id').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = table not found, which is OK
      throw error;
    }
    console.log('✅ Connected to Supabase\n');
  } catch (error: any) {
    console.error('❌ Failed to connect:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Your Supabase URL is correct');
    console.error('   2. Your API key is valid');
    console.error('   3. Your database is accessible');
    process.exit(1);
  }
  
  // Get migrations
  const localMigrations = getLocalMigrations();
  const appliedMigrations = await getAppliedMigrations();
  
  console.log(`📊 Found ${localMigrations.length} local migration files`);
  console.log(`📊 Found ${appliedMigrations.length} applied migrations\n`);
  
  // Find missing migrations
  const missingMigrations = localMigrations.filter(
    m => !appliedMigrations.includes(m.name)
  );
  
  if (missingMigrations.length > 0) {
    console.log(`⚠️  Found ${missingMigrations.length} migrations that may not be applied:`);
    missingMigrations.forEach(m => {
      console.log(`   - ${m.name}`);
    });
    console.log('');
  } else {
    console.log('✅ All migrations appear to be applied\n');
  }
  
  // Check tables
  console.log('🔍 Checking tables...\n');
  const missingTables: string[] = [];
  
  for (const table of EXPECTED_TABLES) {
    const exists = await checkTableExists(table);
    if (!exists) {
      missingTables.push(table);
      console.log(`   ❌ Missing: ${table}`);
    } else {
      console.log(`   ✅ Exists: ${table}`);
    }
  }
  
  if (missingTables.length > 0) {
    console.log(`\n⚠️  Found ${missingTables.length} missing tables`);
    
    if (RUN_MIGRATIONS && missingMigrations.length > 0) {
      console.log('\n🚀 Running missing migrations...\n');
      for (const migration of missingMigrations) {
        await runMigration(migration);
      }
    } else if (!RUN_MIGRATIONS) {
      console.log('\n💡 To run migrations, use:');
      console.log('   npx tsx scripts/connect-and-update-db.ts --run-migrations');
      console.log('\n⚠️  Note: You need SUPABASE_SERVICE_ROLE_KEY for migrations');
    }
  } else {
    console.log('\n✅ All expected tables exist!');
  }
  
  console.log('\n✨ Done!');
}

main().catch(console.error);
