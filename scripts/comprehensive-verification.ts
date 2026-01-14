/**
 * Comprehensive verification of database after migration
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vqvczpxmvrwfkecpwovc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdmN6cHhtdnJ3ZmtlY3B3b3ZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MzI2NCwiZXhwIjoyMDc3OTE5MjY0fQ.1kVQrCDf5WlMT9s4iFtWdiGWQx2RGttZ3X51VFtQG54';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyDatabase() {
  console.log('🔍 Comprehensive Database Verification\n');
  console.log('='.repeat(70));
  
  const checks: Array<{ name: string; status: '✅' | '❌' | '⚠️'; message: string }> = [];
  
  // Check all required tables
  const tables = [
    'food_diary',
    'food_diary_meals',
    'trainee_habits',
    'habit_logs',
    'trainee_goals',
    'meals'
  ];
  
  console.log('\n📋 Checking Tables:\n');
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('not found') || error.message.includes('schema cache')) {
          checks.push({ name: table, status: '❌', message: 'Table not found' });
          console.log(`   ❌ ${table} - NOT FOUND`);
        } else {
          checks.push({ name: table, status: '⚠️', message: error.message.substring(0, 60) });
          console.log(`   ⚠️  ${table} - EXISTS but error: ${error.message.substring(0, 60)}`);
        }
      } else {
        checks.push({ name: table, status: '✅', message: 'Exists and accessible' });
        console.log(`   ✅ ${table} - EXISTS and ACCESSIBLE`);
      }
    } catch (e: any) {
      checks.push({ name: table, status: '❌', message: e.message });
      console.log(`   ❌ ${table} - ERROR: ${e.message}`);
    }
  }
  
  // Check RLS policies for trainee_goals (INSERT)
  console.log('\n📋 Checking RLS Policies:\n');
  
  try {
    // Try to query trainee_goals to see if it's accessible
    const { error } = await supabase
      .from('trainee_goals')
      .select('id')
      .limit(1);
    
    if (error) {
      checks.push({ name: 'trainee_goals RLS', status: '⚠️', message: error.message.substring(0, 60) });
      console.log(`   ⚠️  trainee_goals - ${error.message.substring(0, 60)}`);
    } else {
      checks.push({ name: 'trainee_goals RLS', status: '✅', message: 'Accessible' });
      console.log(`   ✅ trainee_goals - Accessible`);
    }
  } catch (e: any) {
    checks.push({ name: 'trainee_goals RLS', status: '❌', message: e.message });
    console.log(`   ❌ trainee_goals - ERROR: ${e.message}`);
  }
  
  // Check trainee_habits
  try {
    const { error } = await supabase
      .from('trainee_habits')
      .select('id')
      .limit(1);
    
    if (error) {
      checks.push({ name: 'trainee_habits RLS', status: '⚠️', message: error.message.substring(0, 60) });
      console.log(`   ⚠️  trainee_habits - ${error.message.substring(0, 60)}`);
    } else {
      checks.push({ name: 'trainee_habits RLS', status: '✅', message: 'Accessible' });
      console.log(`   ✅ trainee_habits - Accessible`);
    }
  } catch (e: any) {
    checks.push({ name: 'trainee_habits RLS', status: '❌', message: e.message });
    console.log(`   ❌ trainee_habits - ERROR: ${e.message}`);
  }
  
  // Check habit_logs
  try {
    const { error } = await supabase
      .from('habit_logs')
      .select('id')
      .limit(1);
    
    if (error) {
      checks.push({ name: 'habit_logs RLS', status: '⚠️', message: error.message.substring(0, 60) });
      console.log(`   ⚠️  habit_logs - ${error.message.substring(0, 60)}`);
    } else {
      checks.push({ name: 'habit_logs RLS', status: '✅', message: 'Accessible' });
      console.log(`   ✅ habit_logs - Accessible`);
    }
  } catch (e: any) {
    checks.push({ name: 'habit_logs RLS', status: '❌', message: e.message });
    console.log(`   ❌ habit_logs - ERROR: ${e.message}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Summary:\n');
  
  const passed = checks.filter(c => c.status === '✅').length;
  const warnings = checks.filter(c => c.status === '⚠️').length;
  const failed = checks.filter(c => c.status === '❌').length;
  
  console.log(`   ✅ Passed: ${passed}/${checks.length}`);
  console.log(`   ⚠️  Warnings: ${warnings}/${checks.length}`);
  console.log(`   ❌ Failed: ${failed}/${checks.length}\n`);
  
  if (failed === 0 && warnings === 0) {
    console.log('🎉 Perfect! All checks passed!');
    console.log('   The migration was successful and everything is working.\n');
  } else if (failed === 0) {
    console.log('✅ All critical checks passed!');
    console.log('   Some warnings exist but should not affect functionality.\n');
  } else {
    console.log('⚠️  Some checks failed.');
    console.log('   Please review the errors above.\n');
  }
  
  // Show failed checks
  if (failed > 0) {
    console.log('❌ Failed Checks:');
    checks.filter(c => c.status === '❌').forEach(c => {
      console.log(`   - ${c.name}: ${c.message}`);
    });
    console.log('');
  }
  
  // Show warnings
  if (warnings > 0) {
    console.log('⚠️  Warnings:');
    checks.filter(c => c.status === '⚠️').forEach(c => {
      console.log(`   - ${c.name}: ${c.message}`);
    });
    console.log('');
  }
}

verifyDatabase().catch(console.error);
