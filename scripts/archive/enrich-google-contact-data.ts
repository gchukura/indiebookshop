#!/usr/bin/env tsx

/**
 * Google Places API Contact & Basic Data Enrichment Script
 * 
 * This script enriches bookshop data with additional information from Google Places API:
 * - Contact data: phone, website, opening hours
 * - Basic data: Google Maps URL, types, formatted address, business status
 * 
 * This script only processes bookshops that:
 * 1. Have a google_place_id (already enriched once)
 * 2. Missing contact_data_fetched_at (haven't fetched contact data yet)
 * 
 * Usage:
 *   tsx scripts/enrich-google-contact-data.ts [--batch-size=100] [--delay=350]
 * 
 * Environment Variables Required:
 *   - GOOGLE_PLACES_API_KEY: Your Google Places API key
 *   - SUPABASE_URL: Your Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 * 
 * Cost Estimate:
 *   - Contact fields: $0.003 per bookshop
 *   - Basic fields: FREE (included)
 *   - Total for 2,259 bookshops: ~$6.78
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ GOOGLE_PLACES_API_KEY environment variable is required');
  process.exit(1);
}

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

interface GooglePlaceDetails {
  place_id?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  url?: string;
  types?: string[];
  formatted_address?: string;
  business_status?: string;
}

interface AdditionalPlaceData {
  formatted_phone: string | null;
  website_verified: string | null;
  opening_hours_json: {
    open_now: boolean;
    weekday_text: string[];
    periods: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  } | null;
  google_maps_url: string | null;
  google_types: string[];
  formatted_address_google: string | null;
  business_status: string;
  contact_data_fetched_at: string;
}

interface Bookshop {
  id: number;
  name: string;
  google_place_id: string | null;
}

interface EnrichmentStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{
    bookshop: string;
    id: number;
    error: string;
  }>;
}

/**
 * Fetch additional Contact and Basic fields from Google Places
 * Uses existing google_place_id (no need to search again)
 */
async function fetchAdditionalPlaceData(placeId: string): Promise<AdditionalPlaceData | null> {
  if (!placeId) {
    throw new Error('Place ID required');
  }

  // Combine Contact ($0.003) and Basic (free) fields
  // Note: place_id is required in the fields list
  const fields = [
    'place_id',               // Required field
    // Contact Data ($0.003 per request)
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'opening_hours',
    
    // Basic Data (FREE)
    'url',                    // Google Maps URL
    'types',                  // Categories
    'formatted_address',      // Full address string
    'business_status'         // OPERATIONAL, CLOSED_TEMPORARILY, etc.
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
    `place_id=${placeId}` +
    `&fields=${fields}` +
    `&language=en` +
    `&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`  ⚠️  API request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error(`  ⚠️  API Error for ${placeId}: ${data.status}`);
      if (data.error_message) {
        console.error(`  Error message: ${data.error_message}`);
      }
      return null;
    }

    const place: GooglePlaceDetails = data.result;

    // Structure the additional data
    return {
      // Contact information
      formatted_phone: place.formatted_phone_number || null,
      website_verified: place.website || null,
      
      // Opening hours (full structure)
      opening_hours_json: place.opening_hours ? {
        open_now: place.opening_hours.open_now || false,
        weekday_text: place.opening_hours.weekday_text || [],
        periods: place.opening_hours.periods || []
      } : null,
      
      // Navigation & classification
      google_maps_url: place.url || null,
      google_types: place.types || [],
      formatted_address_google: place.formatted_address || null,
      
      // Business status
      business_status: place.business_status || 'UNKNOWN',
      
      // Metadata
      contact_data_fetched_at: new Date().toISOString()
    };

  } catch (error: any) {
    console.error(`  ❌ Error fetching place data for ${placeId}:`, error.message);
    return null;
  }
}

/**
 * Save additional place data to database
 * Uses a database function to avoid geography type errors
 */
async function saveAdditionalPlaceData(bookshopId: number, additionalData: AdditionalPlaceData): Promise<boolean> {
  try {
    // Try using the database function first (avoids geography trigger issues)
    const { error: rpcError } = await supabase.rpc('update_google_contact_data', {
      p_bookshop_id: bookshopId,
      p_formatted_phone: additionalData.formatted_phone,
      p_website_verified: additionalData.website_verified,
      p_opening_hours_json: additionalData.opening_hours_json,
      p_google_maps_url: additionalData.google_maps_url,
      p_google_types: additionalData.google_types,
      p_formatted_address_google: additionalData.formatted_address_google,
      p_business_status: additionalData.business_status,
      p_contact_data_fetched_at: additionalData.contact_data_fetched_at
    });

    if (!rpcError) {
      return true;
    }

    // If RPC fails (especially with geography error), try REST API PATCH directly
    if (rpcError.code === '42704' || rpcError.message?.includes('geography') || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
      console.log(`  ℹ️  Using REST API workaround for geography issue...`);
      
      // Use REST API directly with only the fields we want to update
      const { error: updateError } = await supabase
        .from('bookstores')
        .update({
          formatted_phone: additionalData.formatted_phone,
          website_verified: additionalData.website_verified,
          opening_hours_json: additionalData.opening_hours_json,
          google_maps_url: additionalData.google_maps_url,
          google_types: additionalData.google_types,
          formatted_address_google: additionalData.formatted_address_google,
          business_status: additionalData.business_status,
          contact_data_fetched_at: additionalData.contact_data_fetched_at
        })
        .eq('id', bookshopId);

      if (updateError) {
        console.error(`  ❌ Error saving data for bookshop ${bookshopId}:`, updateError);
        return false;
      }

      return true;
    }

    console.error(`  ❌ Error saving data for bookshop ${bookshopId}:`, rpcError);
    return false;
  } catch (error: any) {
    console.error(`  ❌ Exception saving data for bookshop ${bookshopId}:`, error);
    return false;
  }
}

/**
 * Batch enrich bookshops with additional Google Places data
 * Only processes bookshops that:
 * 1. Have a google_place_id (already enriched once)
 * 2. Missing contact_data_fetched_at (haven't fetched contact data yet)
 */
async function batchEnrichAdditionalData(options: {
  batchSize?: number;
  delayMs?: number;
} = {}): Promise<EnrichmentStats> {
  const { batchSize, delayMs = 350 } = options;

  console.log('═══════════════════════════════════════');
  console.log('GOOGLE PLACES ADDITIONAL DATA ENRICHMENT');
  console.log('═══════════════════════════════════════\n');

  // Get bookshops that need contact data enrichment
  // Process in batches to handle Supabase's 1000 row limit
  const BATCH_SIZE = batchSize || 1000;
  let allBookshops: Bookshop[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: bookshops, error: fetchError } = await supabase
      .from('bookstores')
      .select('id, name, google_place_id')
      .not('google_place_id', 'is', null)
      .is('contact_data_fetched_at', null)
      .order('id')
      .range(offset, offset + BATCH_SIZE - 1);

    if (fetchError) {
      console.error('❌ Error fetching bookshops:', fetchError);
      throw fetchError;
    }

    if (!bookshops || bookshops.length === 0) {
      hasMore = false;
    } else {
      allBookshops = allBookshops.concat(bookshops);
      offset += BATCH_SIZE;
      hasMore = bookshops.length === BATCH_SIZE; // If we got a full batch, there might be more
    }
  }

  const bookshops = allBookshops;

  if (!bookshops || bookshops.length === 0) {
    console.log('✓ All bookshops already have contact data\n');
    return {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }

  console.log(`Found ${bookshops.length} bookshops needing contact data\n`);
  console.log(`Estimated cost: $${(bookshops.length * 0.003).toFixed(2)}\n`);

  const stats: EnrichmentStats = {
    total: bookshops.length,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  let totalCost = 0;

  // Process each bookshop
  for (let i = 0; i < bookshops.length; i++) {
    const bookshop = bookshops[i];
    const progress = `[${i + 1}/${bookshops.length}]`;

    console.log(`${progress} Processing: ${bookshop.name}`);

    if (!bookshop.google_place_id) {
      stats.skipped++;
      console.log(`  ⚠️  Skipped: No google_place_id`);
      continue;
    }

    try {
      // Fetch additional data
      const additionalData = await fetchAdditionalPlaceData(bookshop.google_place_id);

      if (!additionalData) {
        stats.failed++;
        console.log(`  ✗ Failed to fetch data`);
        stats.errors.push({
          bookshop: bookshop.name,
          id: bookshop.id,
          error: 'API returned no data'
        });
        continue;
      }

      // Save to database
      const saved = await saveAdditionalPlaceData(bookshop.id, additionalData);

      if (saved) {
        stats.success++;
        totalCost += 0.003;

        // Log what we got
        const hasPhone = additionalData.formatted_phone ? '✓ phone' : '✗ phone';
        const hasWebsite = additionalData.website_verified ? '✓ website' : '✗ website';
        const hasHours = additionalData.opening_hours_json ? '✓ hours' : '✗ hours';

        console.log(`  ✓ Saved: ${hasPhone}, ${hasWebsite}, ${hasHours}`);
      } else {
        stats.failed++;
        console.log(`  ✗ Failed to save data`);
        stats.errors.push({
          bookshop: bookshop.name,
          id: bookshop.id,
          error: 'Database save failed'
        });
      }

    } catch (error: any) {
      stats.failed++;
      console.error(`  ✗ Error: ${error.message}`);
      stats.errors.push({
        bookshop: bookshop.name,
        id: bookshop.id,
        error: error.message
      });
    }

    // Rate limiting: Google allows 200/min, we'll do ~170/min to be safe
    if (i < bookshops.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Progress report every 100
    if ((i + 1) % 100 === 0) {
      console.log('\n--- Progress Report ---');
      console.log(`Processed: ${i + 1}/${bookshops.length}`);
      console.log(`Success: ${stats.success}`);
      console.log(`Failed: ${stats.failed}`);
      console.log(`Cost so far: $${totalCost.toFixed(2)}\n`);
    }
  }

  // Final report
  printEnrichmentReport(stats, totalCost);

  // Save detailed error log if there were failures
  if (stats.errors.length > 0) {
    saveErrorLog(stats.errors);
  }

  return stats;
}

/**
 * Print final enrichment report
 */
function printEnrichmentReport(stats: EnrichmentStats, totalCost: number) {
  console.log('\n═══════════════════════════════════════');
  console.log('ENRICHMENT COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`Total processed: ${stats.total}`);
  console.log(`✓ Successful: ${stats.success} (${stats.total > 0 ? Math.round(stats.success/stats.total*100) : 0}%)`);
  console.log(`✗ Failed: ${stats.failed} (${stats.total > 0 ? Math.round(stats.failed/stats.total*100) : 0}%)`);
  console.log(`⚠ Skipped: ${stats.skipped}`);
  console.log(`─────────────────────────────────────────`);
  console.log(`Total cost: $${totalCost.toFixed(2)}`);
  console.log('═══════════════════════════════════════\n');

  if (stats.failed > 0) {
    console.log(`⚠ ${stats.failed} bookshops failed to enrich`);
    console.log('Check enrichment-errors-*.json for details\n');
  }
}

/**
 * Save error log to file for review
 */
function saveErrorLog(errors: Array<{ bookshop: string; id: number; error: string }>) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(process.cwd(), `enrichment-errors-${timestamp}.json`);

  const errorReport = {
    timestamp: new Date().toISOString(),
    totalErrors: errors.length,
    errors: errors
  };

  fs.writeFileSync(filename, JSON.stringify(errorReport, null, 2));
  console.log(`Error log saved to: ${filename}\n`);
}

/**
 * Check data quality after enrichment
 */
async function checkEnrichmentQuality() {
  console.log('Checking enrichment data quality...\n');

  // Fetch all bookshops in batches to handle Supabase's 1000 row limit
  let allBookshops: any[] = [];
  let offset = 0;
  const BATCH_SIZE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: bookshops, error } = await supabase
      .from('bookstores')
      .select('*')
      .not('google_place_id', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Error fetching bookshops:', error);
      return;
    }

    if (!bookshops || bookshops.length === 0) {
      hasMore = false;
    } else {
      allBookshops = allBookshops.concat(bookshops);
      offset += BATCH_SIZE;
      hasMore = bookshops.length === BATCH_SIZE;
    }
  }

  const bookshops = allBookshops;

  if (!bookshops || bookshops.length === 0) {
    console.log('No bookshops with Google Places data found');
    return;
  }

  const stats = {
    total: bookshops.length,
    hasPhone: 0,
    hasWebsite: 0,
    hasHours: 0,
    hasMapUrl: 0,
    hasTypes: 0,
    hasAllData: 0,
    operational: 0,
    closed: 0
  };

  bookshops.forEach((b: any) => {
    if (b.formatted_phone) stats.hasPhone++;
    if (b.website_verified) stats.hasWebsite++;
    if (b.opening_hours_json) stats.hasHours++;
    if (b.google_maps_url) stats.hasMapUrl++;
    if (b.google_types?.length > 0) stats.hasTypes++;

    if (b.formatted_phone && b.website_verified && b.opening_hours_json && b.google_maps_url) {
      stats.hasAllData++;
    }

    if (b.business_status === 'OPERATIONAL') stats.operational++;
    if (b.business_status === 'CLOSED_PERMANENTLY') stats.closed++;
  });

  console.log('DATA QUALITY REPORT');
  console.log('═══════════════════════════════════════');
  console.log(`Total bookshops: ${stats.total}`);
  console.log(`\nField Coverage:`);
  console.log(`  Phone: ${stats.hasPhone} (${Math.round(stats.hasPhone/stats.total*100)}%)`);
  console.log(`  Website: ${stats.hasWebsite} (${Math.round(stats.hasWebsite/stats.total*100)}%)`);
  console.log(`  Hours: ${stats.hasHours} (${Math.round(stats.hasHours/stats.total*100)}%)`);
  console.log(`  Maps URL: ${stats.hasMapUrl} (${Math.round(stats.hasMapUrl/stats.total*100)}%)`);
  console.log(`  Types: ${stats.hasTypes} (${Math.round(stats.hasTypes/stats.total*100)}%)`);
  console.log(`\nComplete Data: ${stats.hasAllData} (${Math.round(stats.hasAllData/stats.total*100)}%)`);
  console.log(`\nBusiness Status:`);
  console.log(`  Operational: ${stats.operational}`);
  console.log(`  Closed: ${stats.closed}`);
  console.log('═══════════════════════════════════════\n');

  return stats;
}

// Parse command line arguments
const args = process.argv.slice(2);
const batchSize = args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1];
const delayMs = parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1] || '350');
const checkQuality = args.includes('--check-quality');
const testMode = args.includes('--test');

// Main execution
async function main() {
  if (checkQuality) {
    await checkEnrichmentQuality();
    return;
  }

  if (testMode) {
    // Test on 10 bookshops
    console.log('🧪 TEST MODE: Processing 10 bookshops\n');
    const { data: testBookshops } = await supabase
      .from('bookstores')
      .select('id, name, google_place_id')
      .not('google_place_id', 'is', null)
      .is('contact_data_fetched_at', null)
      .limit(10);

    if (testBookshops && testBookshops.length > 0) {
      console.log(`Found ${testBookshops.length} test bookshops\n`);
      for (const bookshop of testBookshops) {
        if (bookshop.google_place_id) {
          const data = await fetchAdditionalPlaceData(bookshop.google_place_id);
          console.log(`${bookshop.name}:`, {
            phone: data?.formatted_phone ? '✓' : '✗',
            website: data?.website_verified ? '✓' : '✗',
            hours: data?.opening_hours_json ? '✓' : '✗',
            mapsUrl: data?.google_maps_url ? '✓' : '✗'
          });
        }
      }
    } else {
      console.log('No test bookshops found');
    }
    return;
  }

  // Run full batch enrichment
  await batchEnrichAdditionalData({
    batchSize: batchSize ? parseInt(batchSize) : undefined,
    delayMs
  });
}

main()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

