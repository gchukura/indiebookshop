#!/usr/bin/env tsx

/**
 * List Bookshops That Failed Google Places API Enrichment
 * 
 * This script identifies bookshops that were unable to be enriched with Google Places data
 * and exports them to a CSV file for review.
 * 
 * Usage:
 *   npx tsx scripts/list-failed-enrichments.ts [--output=failed-bookshops.csv]
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

interface FailedBookshop {
  id: number;
  name: string;
  street: string | null;
  city: string;
  state: string;
  zip: string | null;
  phone: string | null;
  website: string | null;
  google_place_id: string | null;
  google_data_updated_at: string | null;
  failure_reason: string;
}

/**
 * Escape CSV field values
 */
function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If the field contains comma, quote, or newline, wrap it in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert array of bookshops to CSV format
 */
function toCsv(bookshops: FailedBookshop[]): string {
  const headers = [
    'ID',
    'Name',
    'Street',
    'City',
    'State',
    'ZIP',
    'Phone',
    'Website',
    'Google Place ID',
    'Google Data Updated At',
    'Failure Reason'
  ];
  
  const rows = bookshops.map(bookshop => [
    bookshop.id,
    bookshop.name,
    bookshop.street || '',
    bookshop.city,
    bookshop.state,
    bookshop.zip || '',
    bookshop.phone || '',
    bookshop.website || '',
    bookshop.google_place_id || '',
    bookshop.google_data_updated_at || '',
    bookshop.failure_reason
  ].map(escapeCsvField));
  
  return [headers.map(escapeCsvField).join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Get failed bookshops from database
 */
async function getFailedBookshops(): Promise<FailedBookshop[]> {
  console.log('🔍 Querying database for failed enrichments...\n');
  
  try {
    // Find live bookshops that don't have google_data_updated_at
    // This means the enrichment process never completed successfully
    const { data: bookshops, error } = await supabase
      .from('bookstores')
      .select('id, name, street, city, state, zip, phone, website, google_place_id, google_data_updated_at')
      .eq('live', true)
      .is('google_data_updated_at', null)
      .order('name');
    
    if (error) {
      console.error('❌ Error fetching bookshops:', error);
      return [];
    }
    
    if (!bookshops || bookshops.length === 0) {
      console.log('✅ No failed enrichments found! All bookshops have been successfully enriched.');
      return [];
    }
    
    // Determine failure reason for each bookshop
    const failedBookshops: FailedBookshop[] = bookshops.map(bookshop => {
      let failureReason = 'Unknown';
      
      if (!bookshop.google_place_id) {
        failureReason = 'Could not find Google Place ID - bookshop may not exist in Google Places database';
      } else {
        failureReason = 'Found Place ID but failed to fetch details - API may have returned error or no data';
      }
      
      return {
        id: bookshop.id,
        name: bookshop.name,
        street: bookshop.street,
        city: bookshop.city,
        state: bookshop.state,
        zip: bookshop.zip,
        phone: bookshop.phone,
        website: bookshop.website,
        google_place_id: bookshop.google_place_id,
        google_data_updated_at: bookshop.google_data_updated_at,
        failure_reason: failureReason
      };
    });
    
    return failedBookshops;
  } catch (error) {
    console.error('❌ Fatal error fetching bookshops:', error);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const outputArg = args.find(arg => arg.startsWith('--output='));
  const outputFile = outputArg 
    ? outputArg.split('=')[1] 
    : path.join(process.cwd(), 'failed-bookshops.csv');
  
  console.log('📋 Generating list of failed Google Places API enrichments...\n');
  
  const failedBookshops = await getFailedBookshops();
  
  if (failedBookshops.length === 0) {
    return;
  }
  
  console.log(`📊 Found ${failedBookshops.length} bookshops that failed enrichment\n`);
  
  // Generate CSV
  const csv = toCsv(failedBookshops);
  
  // Write to file
  try {
    fs.writeFileSync(outputFile, csv, 'utf-8');
    console.log(`✅ Exported ${failedBookshops.length} failed enrichments to: ${outputFile}\n`);
    
    // Print summary statistics
    const noPlaceId = failedBookshops.filter(b => !b.google_place_id).length;
    const hasPlaceId = failedBookshops.filter(b => b.google_place_id).length;
    
    console.log('📈 Summary:');
    console.log(`   Total failed: ${failedBookshops.length}`);
    console.log(`   - No Place ID found: ${noPlaceId}`);
    console.log(`   - Place ID found but details failed: ${hasPlaceId}`);
    console.log('');
    
    // Show first 10 examples
    console.log('📝 First 10 examples:');
    failedBookshops.slice(0, 10).forEach((bookshop, index) => {
      console.log(`   ${index + 1}. ${bookshop.name} (${bookshop.city}, ${bookshop.state}) - ${bookshop.failure_reason}`);
    });
    
    if (failedBookshops.length > 10) {
      console.log(`   ... and ${failedBookshops.length - 10} more`);
    }
    
  } catch (error) {
    console.error('❌ Error writing CSV file:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });




