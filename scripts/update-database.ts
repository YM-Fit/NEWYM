/**
 * Update Database - Interactive Script
 * 
 * This script will help you connect to Supabase and update the database.
 * It will prompt for credentials if not provided via environment variables.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

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

async function checkTableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).select('*').limit(0);
    return !error;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔌 Database Update Script\n');
  
  // Get credentials
  let supabaseUrl = process.env.VITE_SUPABASE_URL;
  let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    supabaseUrl = await question('Enter your Supabase URL: ');
  }
  
  if (!supabaseKey) {
    supabaseKey = await question('Enter your Supabase Anon Key (or Service Role Key): ');
  }
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing credentials!');
    rl.close();
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection
  console.log('\n🔍 Testing connection...');
  try {
    const { error } = await supabase.from('trainers').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    console.log('✅ Connected successfully!\n');
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    rl.close();
    process.exit(1);
  }
  
  // Check tables
  console.log('📊 Checking database tables...\n');
  const missingTables: string[] = [];
  const existingTables: string[] = [];
  
  for (const table of EXPECTED_TABLES) {
    const exists = await checkTableExists(supabase, table);
    if (exists) {
      existingTables.push(table);
      console.log(`   ✅ ${table}`);
    } else {
      missingTables.push(table);
      console.log(`   ❌ ${table} - MISSING`);
    }
  }
  
  console.log(`\n📈 Summary:`);
  console.log(`   ✅ Existing: ${existingTables.length}/${EXPECTED_TABLES.length}`);
  console.log(`   ❌ Missing: ${missingTables.length}/${EXPECTED_TABLES.length}`);
  
  if (missingTables.length > 0) {
    console.log(`\n⚠️  Missing tables:`);
    missingTables.forEach(t => console.log(`   - ${t}`));
    
    console.log(`\n💡 To update the database:`);
    console.log(`   1. Install Supabase CLI: npm install -g supabase (or use npx)`);
    console.log(`   2. Link project: supabase link --project-ref YOUR_PROJECT_REF`);
    console.log(`   3. Run migrations: supabase db push`);
    console.log(`\n   Or use Supabase Dashboard:`);
    console.log(`   1. Go to SQL Editor`);
    console.log(`   2. Copy and run migration files from supabase/migrations/`);
  } else {
    console.log(`\n✅ All tables exist! Database is up to date.`);
  }
  
  rl.close();
}

main().catch((error) => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
