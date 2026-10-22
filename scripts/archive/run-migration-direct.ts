#!/usr/bin/env tsx

/**
 * Run AI Description Migration - Direct PostgreSQL Connection
 * 
 * This script runs the migration using a direct PostgreSQL connection.
 * 
 * Usage:
 *   npx tsx scripts/run-migration-direct.ts
 * 
 * Environment Variables Required:
 *   - SUPABASE_URL: Your Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

// Extract database connection details from Supabase URL
// Supabase URL format: https://[project-ref].supabase.co
// Connection string format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
// But we need the direct connection, not the pooler

async function runMigration() {
  console.log('🚀 Running AI Description Migration...\n');

  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'migrations', 'add-ai-description-columns.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Try to construct connection string from Supabase URL
  // For Supabase, we typically need:
  // - Host: db.[project-ref].supabase.co
  // - Port: 5432
  // - Database: postgres
  // - User: postgres
  // - Password: [service_role_key or a separate DB password]
  
  // Extract project ref from URL
  const urlMatch = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) {
    console.error('❌ Could not extract project reference from SUPABASE_URL');
    console.error('   Please run the migration manually in Supabase SQL Editor');
    console.error('   See: migrations/add-ai-description-columns.sql');
    process.exit(1);
  }

  const projectRef = urlMatch[1];
  const dbHost = `db.${projectRef}.supabase.co`;
  const dbPort = 5432;
  const dbDatabase = 'postgres';
  const dbUser = 'postgres';
  
  // Note: Service role key is NOT the database password
  // We need the actual database password, which is different
  // For security, Supabase doesn't expose this in the service role key
  
  console.log('⚠️  Direct PostgreSQL connection requires the database password,');
  console.log('   which is different from the service role key.\n');
  console.log('📋 Please run the migration manually:\n');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to Settings → Database');
  console.log('4. Find "Connection string" and copy the "URI" format');
  console.log('5. Or use SQL Editor (recommended):\n');
  console.log('   a. Navigate to SQL Editor');
  console.log('   b. Click "New query"');
  console.log('   c. Copy and paste the SQL from: migrations/add-ai-description-columns.sql');
  console.log('   d. Click "Run"\n');
  
  // Display the SQL for easy copying
  console.log('─'.repeat(70));
  console.log('SQL to execute:');
  console.log('─'.repeat(70));
  console.log(migrationSQL);
  console.log('─'.repeat(70));
  
  process.exit(0);
}

runMigration()
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });



