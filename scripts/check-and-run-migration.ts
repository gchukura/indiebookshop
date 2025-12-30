#!/usr/bin/env tsx

/**
 * Check Migration Status and Provide SQL
 * 
 * This script checks if the AI description columns exist and provides
 * the SQL to run if they don't.
 * 
 * Usage:
 *   npx tsx scripts/check-and-run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkMigration() {
  console.log('🔍 Checking migration status...\n');

  try {
    // Try to query the ai_generated_description column
    // If it doesn't exist, we'll get an error
    const { data, error } = await supabase
      .from('bookstores')
      .select('ai_generated_description, description_generated_at, description_validated')
      .limit(1);

    if (error) {
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        console.log('❌ Migration has NOT been run yet.\n');
        console.log('📋 To run the migration:\n');
        console.log('1. Go to: https://supabase.com/dashboard');
        console.log('2. Select your project');
        console.log('3. Navigate to SQL Editor');
        console.log('4. Click "New query"');
        console.log('5. Copy and paste the SQL below:\n');
        console.log('─'.repeat(70));
        
        const migrationPath = path.join(process.cwd(), 'migrations', 'add-ai-description-columns.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
        console.log(migrationSQL);
        
        console.log('─'.repeat(70));
        console.log('\n6. Click "Run" (or press Cmd/Ctrl + Enter)');
        console.log('7. Verify success message appears\n');
        process.exit(1);
      } else {
        throw error;
      }
    } else {
      console.log('✅ Migration has been run! Columns exist.\n');
      
      // Check if the function exists by trying to call it (will fail but tell us if it exists)
      let funcExists = false;
      try {
        const { error: funcError } = await supabase.rpc('update_ai_description', {
          p_bookshop_id: 0,
          p_description: '',
          p_generated_at: new Date().toISOString()
        });
        // If no error about function not existing, it exists
        funcExists = !funcError?.message?.includes('does not exist') && !funcError?.message?.includes('function');
      } catch (e: any) {
        funcExists = !e.message?.includes('does not exist') && !e.message?.includes('function');
      }

      if (!funcExists) {
        console.log('⚠️  Columns exist but update function is missing.');
        console.log('   Run the migration again to create the function.\n');
      } else {
        console.log('✅ All migration components are in place!\n');
      }
      
      process.exit(0);
    }
  } catch (error: any) {
    console.error('❌ Error checking migration:', error.message);
    process.exit(1);
  }
}

checkMigration();

