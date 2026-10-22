#!/usr/bin/env tsx

/**
 * Run database migrations using Supabase client
 * Usage: npx tsx scripts/run-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration(filePath: string): Promise<boolean> {
  console.log(`\n📄 Running migration: ${path.basename(filePath)}`);
  
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  // Split by semicolons and execute each statement
  // But we need to be careful with function definitions that contain semicolons
  // So we'll execute the whole file as one statement
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try using the REST API
      console.log('  ℹ️  RPC function not available, trying REST API...');
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      if (!response.ok) {
        // Last resort: try executing via pg directly
        console.log('  ℹ️  Trying direct SQL execution...');
        // We'll need to use a different approach
        console.error('  ⚠️  Cannot execute SQL directly via Supabase client');
        console.error('  Please run this migration in Supabase SQL Editor:');
        console.error(`  File: ${filePath}\n`);
        return false;
      }
    }
    
    console.log('  ✅ Migration completed');
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    console.error('  Please run this migration in Supabase SQL Editor:');
    console.error(`  File: ${filePath}\n`);
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

  for (const migration of migrations) {
    const filePath = path.join(process.cwd(), migration);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      continue;
    }
    
    // Read and display the SQL
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`\n📋 SQL to execute:\n${sql}\n`);
    
    // Since Supabase JS client doesn't support raw SQL execution,
    // we'll provide instructions
    console.log('⚠️  Supabase JS client cannot execute raw SQL directly.');
    console.log('   Please copy the SQL above and run it in Supabase SQL Editor.\n');
  }

  console.log('═══════════════════════════════════════');
  console.log('MIGRATION INSTRUCTIONS');
  console.log('═══════════════════════════════════════');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste each migration file');
  console.log('4. Execute each one\n');
}

main().catch(console.error);

