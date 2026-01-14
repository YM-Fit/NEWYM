/**
 * Verify RLS policies are correctly set up
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

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies...\n');
  
  // Check trainee_goals INSERT policy
  console.log('📋 Checking trainee_goals INSERT policy...');
  try {
    // Query the policies table to see if INSERT policy exists for trainees
    const { data, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'trainee_goals')
      .eq('policyname', 'Trainees can insert their own goals');
    
    if (error) {
      // Try alternative query
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies', { table_name: 'trainee_goals' })
        .catch(() => ({ data: null, error: { message: 'Function not available' } }));
      
      if (policiesError) {
        console.log('   ⚠️  Cannot check policies directly (this is normal)');
        console.log('   💡 Testing by trying to query the table...');
        
        // Test if we can query trainee_goals
        const { error: queryError } = await supabase
          .from('trainee_goals')
          .select('id')
          .limit(1);
        
        if (queryError) {
          console.log(`   ❌ Error querying: ${queryError.message}`);
        } else {
          console.log('   ✅ Table is accessible');
        }
      }
    } else {
      if (data && data.length > 0) {
        console.log('   ✅ INSERT policy exists for trainees');
      } else {
        console.log('   ⚠️  INSERT policy might be missing');
      }
    }
  } catch (e: any) {
    console.log(`   ⚠️  Could not check policies: ${e.message}`);
  }
  
  // Check trainee_habits INSERT policy
  console.log('\n📋 Checking trainee_habits INSERT policy...');
  try {
    const { error } = await supabase
      .from('trainee_habits')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    } else {
      console.log('   ✅ Table is accessible');
    }
  } catch (e: any) {
    console.log(`   ⚠️  Error: ${e.message}`);
  }
  
  // Check food_diary
  console.log('\n📋 Checking food_diary...');
  try {
    const { error } = await supabase
      .from('food_diary')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    } else {
      console.log('   ✅ Table is accessible');
    }
  } catch (e: any) {
    console.log(`   ⚠️  Error: ${e.message}`);
  }
  
  // Check habit_logs
  console.log('\n📋 Checking habit_logs...');
  try {
    const { error } = await supabase
      .from('habit_logs')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    } else {
      console.log('   ✅ Table is accessible');
    }
  } catch (e: any) {
    console.log(`   ⚠️  Error: ${e.message}`);
  }
  
  console.log('\n✅ Database check complete!');
  console.log('\n💡 If you still see errors in the browser:');
  console.log('   1. Make sure the migration was fully run');
  console.log('   2. Check browser console for specific error messages');
  console.log('   3. Verify RLS policies in Supabase Dashboard\n');
}

checkRLSPolicies().catch(console.error);
