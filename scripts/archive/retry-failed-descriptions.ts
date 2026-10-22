#!/usr/bin/env tsx

/**
 * Retry AI description generation for failed bookshops
 * Reads from the error log JSON file and retries each failed bookshop
 * 
 * Usage:
 *   npx tsx scripts/retry-failed-descriptions.ts [error-log-file.json]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Get the error log file from command line or use the most recent one
const args = process.argv.slice(2);
let errorLogFile = args[0];

if (!errorLogFile) {
  // Find the most recent error log file
  const files = fs.readdirSync(process.cwd())
    .filter(f => f.startsWith('generation-errors-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.error('❌ No error log file found. Please specify one:');
    console.error('   npx tsx scripts/retry-failed-descriptions.ts generation-errors-YYYY-MM-DD.json');
    process.exit(1);
  }
  
  errorLogFile = files[0];
  console.log(`Using most recent error log: ${errorLogFile}\n`);
}

// Read and parse the error log
let errorLog: any;
try {
  const errorLogContent = fs.readFileSync(errorLogFile, 'utf-8');
  errorLog = JSON.parse(errorLogContent);
} catch (error: any) {
  console.error(`❌ Error reading error log file: ${errorLogFile}`);
  console.error(error.message);
  process.exit(1);
}

if (!errorLog.errors || !Array.isArray(errorLog.errors)) {
  console.error('❌ Invalid error log format');
  process.exit(1);
}

console.log('\n===========================================');
console.log('RETRY FAILED DESCRIPTIONS');
console.log('===========================================\n');
console.log(`Found ${errorLog.errors.length} failed bookshops in error log\n`);

async function retryFailedBookshops() {
  // Extract unique IDs
  const failedIds = [...new Set(errorLog.errors.map((e: any) => e.id))];
  console.log(`Unique bookshop IDs: ${failedIds.length}\n`);

  // Check which ones still need descriptions (fetch in batches due to Supabase limit)
  let bookshopsToRetry: any[] = [];
  let offset = 0;
  const BATCH_SIZE = 1000;

  while (offset < failedIds.length) {
    const batchIds = failedIds.slice(offset, offset + BATCH_SIZE);
    
    const { data: bookshops, error } = await supabase
      .from('bookstores')
      .select('id, name, city, state')
      .in('id', batchIds)
      .is('ai_generated_description', null)
      .eq('live', true);

    if (error) {
      console.error('Error checking bookshops:', error);
      break;
    }

    if (bookshops && bookshops.length > 0) {
      bookshopsToRetry = bookshopsToRetry.concat(bookshops);
    }

    offset += BATCH_SIZE;
  }

  if (bookshopsToRetry.length === 0) {
    console.log('✓ All failed bookshops now have descriptions (may have been fixed manually)\n');
    return;
  }

  console.log(`Found ${bookshopsToRetry.length} bookshops still needing descriptions\n`);

  // Write IDs to a file that the batch script can read
  const idsFile = 'retry-ids.json';
  const idsToRetry = bookshopsToRetry.map(b => b.id);
  fs.writeFileSync(idsFile, JSON.stringify(idsToRetry, null, 2));

  console.log(`Written ${idsToRetry.length} IDs to ${idsFile}\n`);
  console.log('Now calling batch generation script with these IDs...\n');
  console.log('===========================================\n');

  // Call the batch script with the IDs file
  try {
    const command = `npx tsx scripts/generate-bookshop-descriptions.ts --batch --ids-file=${idsFile}`;
    const { stdout, stderr } = await execAsync(command);
    
    console.log(stdout);
    if (stderr) {
      console.error(stderr);
    }
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(idsFile);
    } catch (e) {
      // Ignore cleanup errors
    }
    
  } catch (error: any) {
    console.error('Error running batch script:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

retryFailedBookshops().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
