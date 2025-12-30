#!/usr/bin/env tsx

/**
 * Run database migrations using Supabase Management API
 * This requires SUPABASE_ACCESS_TOKEN environment variable
 * 
 * Alternative: Run migrations in Supabase SQL Editor
 * Usage: npx tsx scripts/run-migrations-via-api.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runMigrationViaAPI(filePath: string): Promise<boolean> {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  console.log(`\n📄 Running: ${fileName}`);
  
  if (!SUPABASE_ACCESS_TOKEN) {
    console.error('  ❌ SUPABASE_ACCESS_TOKEN not found');
    console.error('  Please set it in your .env file or run in SQL Editor');
    return false;
  }
  
  // Extract project ref from SUPABASE_URL
  const projectRef = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    console.error('  ❌ Could not extract project ref from SUPABASE_URL');
    return false;
  }
  
  try {
    // Use Supabase Management API to execute SQL
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`
        },
        body: JSON.stringify({ query: sql })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  ❌ API Error: ${response.status} ${errorText}`);
      return false;
    }
    
    console.log('  ✅ Migration completed');
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  const migrations = [
    'migrations/create-update-place-id-function.sql',
    'migrations/create-update-contact-data-function.sql'
  ];

  console.log('═══════════════════════════════════════');
  console.log('RUNNING DATABASE MIGRATIONS');
  console.log('═══════════════════════════════════════');

  if (!SUPABASE_ACCESS_TOKEN) {
    console.log('\n⚠️  SUPABASE_ACCESS_TOKEN not found in environment.');
    console.log('   Using alternative method: Displaying SQL for manual execution\n');
    
    for (const migration of migrations) {
      const filePath = path.join(process.cwd(), migration);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        console.log(`\n📋 ${path.basename(migration)}:\n`);
        console.log(sql);
        console.log('\n' + '─'.repeat(50) + '\n');
      }
    }
    
    console.log('📝 INSTRUCTIONS:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy and paste each SQL block above');
    console.log('3. Execute each one\n');
    return;
  }

  let successCount = 0;
  for (const migration of migrations) {
    const filePath = path.join(process.cwd(), migration);
    if (fs.existsSync(filePath)) {
      const success = await runMigrationViaAPI(filePath);
      if (success) successCount++;
    }
  }

  console.log(`\n✅ Completed ${successCount}/${migrations.length} migrations\n`);
}

main().catch(console.error);

