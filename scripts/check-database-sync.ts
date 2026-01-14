/**
 * Database Sync Checker
 * 
 * This script checks what tables/fields exist in migrations but might be missing
 * from the TypeScript database types or the actual database.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface TableInfo {
  name: string;
  columns: string[];
  fromMigration: string;
}

const migrationsDir = join(process.cwd(), 'supabase/migrations');
const typesFile = join(process.cwd(), 'src/types/database.ts');

// Extract table names from migrations
function extractTablesFromMigrations(): Map<string, TableInfo> {
  const tables = new Map<string, TableInfo>();
  const migrationFiles = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  migrationFiles.forEach(file => {
    const content = readFileSync(join(migrationsDir, file), 'utf-8');
    
    // Find CREATE TABLE statements
    const createTableRegex = /CREATE TABLE (?:IF NOT EXISTS )?(\w+)/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      
      if (!tables.has(tableName)) {
        // Extract columns
        const tableStart = content.indexOf(match[0]);
        const tableEnd = content.indexOf(');', tableStart);
        const tableDef = content.substring(tableStart, tableEnd);
        
        const columns: string[] = [];
        const columnRegex = /^\s*(\w+)\s+/gm;
        let colMatch;
        while ((colMatch = columnRegex.exec(tableDef)) !== null) {
          if (!['CREATE', 'TABLE', 'IF', 'NOT', 'EXISTS'].includes(colMatch[1])) {
            columns.push(colMatch[1]);
          }
        }
        
        tables.set(tableName, {
          name: tableName,
          columns,
          fromMigration: file
        });
      }
    }
  });
  
  return tables;
}

// Extract tables from TypeScript types
function extractTablesFromTypes(): Set<string> {
  const content = readFileSync(typesFile, 'utf-8');
  const tables = new Set<string>();
  
  const tableRegex = /(\w+):\s*\{[\s\S]*?Row:/g;
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    tables.add(match[1]);
  }
  
  return tables;
}

// Main check
function main() {
  console.log('🔍 Checking database sync...\n');
  
  const migrationTables = extractTablesFromMigrations();
  const typeTables = extractTablesFromTypes();
  
  console.log(`📊 Found ${migrationTables.size} tables in migrations`);
  console.log(`📊 Found ${typeTables.size} tables in TypeScript types\n`);
  
  // Find missing tables
  const missingInTypes: string[] = [];
  migrationTables.forEach((info, tableName) => {
    if (!typeTables.has(tableName)) {
      missingInTypes.push(tableName);
    }
  });
  
  if (missingInTypes.length > 0) {
    console.log('❌ Tables in migrations but NOT in TypeScript types:');
    missingInTypes.forEach(table => {
      const info = migrationTables.get(table)!;
      console.log(`   - ${table} (from ${info.fromMigration})`);
    });
    console.log('');
  } else {
    console.log('✅ All migration tables are in TypeScript types!\n');
  }
  
  // Find extra tables in types
  const extraInTypes: string[] = [];
  typeTables.forEach(tableName => {
    if (!migrationTables.has(tableName)) {
      extraInTypes.push(tableName);
    }
  });
  
  if (extraInTypes.length > 0) {
    console.log('⚠️  Tables in TypeScript types but NOT in migrations:');
    extraInTypes.forEach(table => {
      console.log(`   - ${table}`);
    });
    console.log('');
  }
  
  console.log('\n💡 To sync the database:');
  console.log('   1. Install Supabase CLI: npm install -g supabase');
  console.log('   2. Link your project: supabase link --project-ref YOUR_PROJECT_REF');
  console.log('   3. Run migrations: supabase db push');
  console.log('   4. Generate types: supabase gen types typescript --local > src/types/database.ts');
}

main();
