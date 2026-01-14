/**
 * Run a single migration file via Supabase API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Please provide a migration file path');
  console.error('Usage: tsx scripts/run-single-migration.ts <migration-file>');
  process.exit(1);
}

async function runMigration() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  console.log(`📖 Reading migration: ${migrationFile}`);
  const migrationPath = join(process.cwd(), migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');
  
  console.log(`\n⚠️  Note: Supabase client doesn't support direct SQL execution.`);
  console.log(`   Please run this migration via:`);
  console.log(`   1. Supabase Dashboard → SQL Editor`);
  console.log(`   2. Supabase CLI: supabase db push`);
  console.log(`\n   Migration SQL:\n`);
  console.log('─'.repeat(80));
  console.log(sql);
  console.log('─'.repeat(80));
}

runMigration().catch(console.error);
