/**
 * Run Database Migrations
 * 
 * This script helps run Supabase migrations.
 * 
 * Usage:
 *   npx tsx scripts/run-migrations.ts
 * 
 * Requirements:
 *   - Supabase CLI installed: npm install -g supabase
 *   - Environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *   - Or: Supabase project linked via CLI
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

function checkSupabaseCLI(): boolean {
  try {
    execSync('which supabase', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getMigrations(): string[] {
  const migrationsDir = join(process.cwd(), 'supabase/migrations');
  if (!existsSync(migrationsDir)) {
    return [];
  }
  
  const files = require('fs').readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith('.sql'))
    .sort();
  
  return files;
}

async function runMigrationsViaCLI() {
  console.log('🚀 Running migrations via Supabase CLI...\n');
  
  try {
    // Check if project is linked
    try {
      execSync('supabase status', { stdio: 'ignore' });
    } catch {
      console.log('⚠️  Supabase project not linked locally.');
      console.log('   Run: supabase link --project-ref YOUR_PROJECT_REF\n');
      return;
    }
    
    // Push migrations
    console.log('📤 Pushing migrations to database...');
    execSync('supabase db push', { stdio: 'inherit' });
    
    console.log('\n✅ Migrations completed successfully!');
    
    // Generate types
    console.log('\n📝 Generating TypeScript types...');
    execSync('supabase gen types typescript --local > src/types/database.ts', { stdio: 'inherit' });
    
    console.log('\n✅ Types generated successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Error running migrations:', error.message);
    process.exit(1);
  }
}

async function runMigrationsViaAPI() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials!');
    console.error('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
    return;
  }
  
  console.log('🚀 Running migrations via Supabase API...\n');
  console.log('⚠️  Note: Direct API migration execution requires Supabase Management API.');
  console.log('   For production, use Supabase CLI or Dashboard.\n');
  
  const migrations = getMigrations();
  console.log(`📊 Found ${migrations.length} migration files`);
  console.log('   To run them, use one of these methods:');
  console.log('   1. Supabase CLI: supabase db push');
  console.log('   2. Supabase Dashboard: SQL Editor');
  console.log('   3. Supabase Management API (requires service role key)');
}

async function main() {
  console.log('🔍 Checking setup...\n');
  
  const hasCLI = checkSupabaseCLI();
  const migrations = getMigrations();
  
  console.log(`📊 Found ${migrations.length} migration files\n`);
  
  if (hasCLI) {
    await runMigrationsViaCLI();
  } else {
    console.log('⚠️  Supabase CLI not found.');
    console.log('   Install it: npm install -g supabase\n');
    await runMigrationsViaAPI();
  }
}

main().catch(console.error);
