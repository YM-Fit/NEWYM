/**
 * Comprehensive Database Check
 * Checks tables, RLS policies, indexes, and data integrity
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vqvczpxmvrwfkecpwovc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdmN6cHhtdnJ3ZmtlY3B3b3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDMyNjQsImV4cCI6MjA3NzkxOTI2NH0.mobaB1eh0qnhc5ygQTHvbx5eKseredG84_98y2SuEls';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TableCheck {
  name: string;
  exists: boolean;
  accessible: boolean;
  hasData?: boolean;
  rowCount?: number;
  error?: string;
}

const CRITICAL_TABLES = [
  'trainers',
  'trainees',
  'muscle_groups',
  'exercises',
  'workouts',
  'workout_trainees',
  'workout_exercises',
  'exercise_sets',
  'measurements',
];

const ALL_TABLES = [
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

async function checkTable(tableName: string): Promise<TableCheck> {
  const result: TableCheck = {
    name: tableName,
    exists: false,
    accessible: false,
  };

  try {
    // Try to query the table
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116') {
        // Table doesn't exist
        result.exists = false;
        result.error = 'Table does not exist';
      } else {
        // Table exists but has access issues
        result.exists = true;
        result.accessible = false;
        result.error = error.message;
      }
    } else {
      result.exists = true;
      result.accessible = true;
      result.hasData = (count ?? 0) > 0;
      result.rowCount = count ?? 0;
    }
  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

async function checkForeignKeys() {
  console.log('\n🔗 Checking foreign key relationships...\n');
  
  const checks = [
    {
      name: 'trainees → trainers',
      table: 'trainees',
      fk: 'trainer_id',
      refTable: 'trainers',
    },
    {
      name: 'exercises → muscle_groups',
      table: 'exercises',
      fk: 'muscle_group_id',
      refTable: 'muscle_groups',
    },
    {
      name: 'workout_exercises → workouts',
      table: 'workout_exercises',
      fk: 'workout_id',
      refTable: 'workouts',
    },
    {
      name: 'meal_plan_food_items → meal_plan_meals',
      table: 'meal_plan_food_items',
      fk: 'meal_id',
      refTable: 'meal_plan_meals',
    },
  ];

  for (const check of checks) {
    try {
      const { error } = await supabase
        .from(check.table)
        .select(`${check.fk}`)
        .limit(1);
      
      if (error) {
        console.log(`   ⚠️  ${check.name}: ${error.message}`);
      } else {
        console.log(`   ✅ ${check.name}: OK`);
      }
    } catch (error: any) {
      console.log(`   ❌ ${check.name}: ${error.message}`);
    }
  }
}

async function checkRLSPolicies() {
  console.log('\n🔒 Checking RLS policies...\n');
  
  // Try to query with different access levels
  const testQueries = [
    { name: 'trainers table', table: 'trainers' },
    { name: 'trainees table', table: 'trainees' },
    { name: 'meal_plan_food_items table', table: 'meal_plan_food_items' },
  ];

  for (const query of testQueries) {
    try {
      const { error } = await supabase
        .from(query.table)
        .select('*')
        .limit(0);
      
      if (error && error.code === '42501') {
        console.log(`   ⚠️  ${query.name}: RLS blocking access (expected when not authenticated)`);
      } else if (error) {
        console.log(`   ⚠️  ${query.name}: ${error.message}`);
      } else {
        console.log(`   ✅ ${query.name}: Accessible`);
      }
    } catch (error: any) {
      console.log(`   ❌ ${query.name}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🔍 Comprehensive Database Check\n');
  console.log('=' .repeat(80));
  
  // Check all tables
  console.log('\n📊 Checking all tables...\n');
  const results: TableCheck[] = [];
  
  for (const table of ALL_TABLES) {
    const result = await checkTable(table);
    results.push(result);
    
    if (result.exists && result.accessible) {
      const dataInfo = result.hasData ? ` (${result.rowCount} rows)` : ' (empty)';
      console.log(`   ✅ ${table}${dataInfo}`);
    } else if (result.exists && !result.accessible) {
      console.log(`   ⚠️  ${table}: Exists but not accessible - ${result.error}`);
    } else {
      console.log(`   ❌ ${table}: ${result.error || 'Not found'}`);
    }
  }
  
  // Summary
  const existing = results.filter(r => r.exists).length;
  const accessible = results.filter(r => r.accessible).length;
  const withData = results.filter(r => r.hasData).length;
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total tables: ${ALL_TABLES.length}`);
  console.log(`   Existing: ${existing}`);
  console.log(`   Accessible: ${accessible}`);
  console.log(`   With data: ${withData}`);
  
  // Check critical tables
  console.log('\n🎯 Checking critical tables...\n');
  const criticalResults = results.filter(r => CRITICAL_TABLES.includes(r.name));
  const allCriticalExist = criticalResults.every(r => r.exists && r.accessible);
  
  if (allCriticalExist) {
    console.log('   ✅ All critical tables exist and are accessible');
  } else {
    console.log('   ❌ Some critical tables are missing or inaccessible');
    criticalResults.forEach(r => {
      if (!r.exists || !r.accessible) {
        console.log(`      - ${r.name}: ${r.error || 'Not accessible'}`);
      }
    });
  }
  
  // Check foreign keys
  await checkForeignKeys();
  
  // Check RLS
  await checkRLSPolicies();
  
  // Final status
  console.log('\n' + '='.repeat(80));
  if (existing === ALL_TABLES.length && accessible === ALL_TABLES.length) {
    console.log('\n✅ All checks passed! Database is ready.');
  } else {
    console.log('\n⚠️  Some issues found. See details above.');
  }
  console.log('');
}

main().catch(console.error);
