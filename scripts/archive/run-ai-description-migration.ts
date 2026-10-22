#!/usr/bin/env tsx

/**
 * Run AI Description Migration
 * 
 * This script runs the migration to add AI description columns to the bookstores table.
 * 
 * Usage:
 *   npx tsx scripts/run-ai-description-migration.ts
 * 
 * Environment Variables Required:
 *   - SUPABASE_URL: Your Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Running AI Description Migration...\n');

  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'migrations', 'add-ai-description-columns.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split the SQL into individual statements
  // Remove comments and split by semicolons
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty statements
    if (!statement || statement.trim().length === 0) {
      continue;
    }

    // Add semicolon back for execution
    const sql = statement + ';';

    try {
      console.log(`[${i + 1}/${statements.length}] Executing statement...`);
      
      // Execute the SQL statement
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
        // If exec_sql doesn't exist, try direct query (this won't work for DDL, but we'll try)
        // Actually, Supabase JS client doesn't support raw SQL execution directly
        // We need to use the REST API or execute via SQL Editor
        return { error: { message: 'Direct SQL execution not supported via JS client' } };
      });

      if (error) {
        // Try alternative: execute via REST API
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
          console.error(`  ❌ Error executing statement:`, error.message || 'Unknown error');
          errorCount++;
          continue;
        }
      }

      successCount++;
      console.log(`  ✅ Success`);
    } catch (error: any) {
      console.error(`  ❌ Error:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log(`\n⚠️  Some statements failed. You may need to run the migration manually in Supabase SQL Editor.`);
    console.log(`\nTo run manually:`);
    console.log(`1. Go to Supabase Dashboard → SQL Editor`);
    console.log(`2. Copy and paste the contents of: migrations/add-ai-description-columns.sql`);
    console.log(`3. Click Run`);
  } else {
    console.log(`\n✅ Migration completed successfully!`);
  }
}

// Alternative: Use Supabase Management API if available
async function runMigrationViaREST() {
  console.log('🚀 Running AI Description Migration via REST API...\n');

  const migrationPath = path.join(process.cwd(), 'migrations', 'add-ai-description-columns.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // For Supabase, we need to use the SQL Editor API or Management API
  // Since direct SQL execution isn't available via the JS client for DDL,
  // we'll provide instructions instead
  
  console.log('⚠️  Direct SQL execution via script is not supported for DDL statements.');
  console.log('Please run the migration manually in Supabase SQL Editor.\n');
  console.log('Steps:');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Navigate to SQL Editor');
  console.log('4. Click "New query"');
  console.log('5. Copy and paste the following SQL:\n');
  console.log('─'.repeat(60));
  console.log(migrationSQL);
  console.log('─'.repeat(60));
  console.log('\n6. Click "Run" (or press Cmd/Ctrl + Enter)');
  console.log('7. Verify the migration completed successfully\n');
}

// Check if we can execute SQL directly
// Since Supabase JS client doesn't support DDL execution, we'll provide manual instructions
runMigrationViaREST()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });



