#!/usr/bin/env tsx

/**
 * Re-fetch contact data for bookshops that have google_place_id but null contact fields
 * This will check if Google Places API now has data for those fields
 * Usage: npx tsx scripts/re-fetch-null-contact-data.ts [--limit=100]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_PLACES_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface GooglePlaceDetails {
  place_id?: string;
  formatted_phone_number?: string;
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

async function fetchContactData(placeId: string): Promise<any | null> {
  const fields = [
    'place_id',
    'formatted_phone_number',
    'website',
    'opening_hours',
    'url',
    'types',
    'formatted_address',
    'business_status'
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
    `place_id=${placeId}` +
    `&fields=${fields}` +
    `&language=en` +
    `&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return null;
    }

    const place: GooglePlaceDetails = data.result;

    return {
      formatted_phone: place.formatted_phone_number || null,
      website_verified: place.website || null,
      opening_hours_json: place.opening_hours ? {
        open_now: place.opening_hours.open_now || false,
        weekday_text: place.opening_hours.weekday_text || [],
        periods: place.opening_hours.periods || []
      } : null,
      google_maps_url: place.url || null,
      google_types: place.types || [],
      formatted_address_google: place.formatted_address || null,
      business_status: place.business_status || 'UNKNOWN',
      contact_data_fetched_at: new Date().toISOString()
    };
  } catch (error: any) {
    return null;
  }
}

async function main() {
  const limit = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '100');

  console.log('═══════════════════════════════════════');
  console.log('RE-FETCHING NULL CONTACT DATA');
  console.log('═══════════════════════════════════════\n');

  // Find bookshops with place_id but null contact fields
  // Fetch in batches
  let allBookshops: any[] = [];
  let offset = 0;
  const BATCH_SIZE = 1000;
  let hasMore = true;

  console.log('Finding bookshops with null contact fields...');
  while (hasMore && allBookshops.length < limit) {
    const { data: bookshops, error } = await supabase
      .from('bookstores')
      .select('id, name, google_place_id, formatted_phone, website_verified, opening_hours_json')
      .not('google_place_id', 'is', null)
      .or('formatted_phone.is.null,website_verified.is.null,opening_hours_json.is.null')
      .order('id')
      .range(offset, offset + BATCH_SIZE - 1)
      .limit(limit - allBookshops.length);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (!bookshops || bookshops.length === 0) {
      hasMore = false;
    } else {
      allBookshops = allBookshops.concat(bookshops);
      offset += BATCH_SIZE;
      hasMore = bookshops.length === BATCH_SIZE && allBookshops.length < limit;
      console.log(`  Found ${allBookshops.length} bookshops with null fields...`);
    }
  }

  if (allBookshops.length === 0) {
    console.log('✅ No bookshops with null contact fields found!\n');
    return;
  }

  console.log(`\nProcessing ${allBookshops.length} bookshops...\n`);

  let success = 0;
  let updated = 0;
  let noChange = 0;
  let failed = 0;

  for (let i = 0; i < allBookshops.length; i++) {
    const bookshop = allBookshops[i];
    const progress = `[${i + 1}/${allBookshops.length}]`;

    console.log(`${progress} ${bookshop.name} (ID: ${bookshop.id})`);

    if (!bookshop.google_place_id) {
      console.log('  ⚠️  Skipped: No google_place_id');
      continue;
    }

    try {
      const data = await fetchContactData(bookshop.google_place_id);

      if (!data) {
        console.log('  ✗ Failed to fetch data');
        failed++;
        continue;
      }

      // Check if we got new data for previously null fields
      const hadPhone = !!bookshop.formatted_phone;
      const hadWebsite = !!bookshop.website_verified;
      const hadHours = !!bookshop.opening_hours_json;

      const gotPhone = !!data.formatted_phone;
      const gotWebsite = !!data.website_verified;
      const gotHours = !!data.opening_hours_json;

      const newData = (!hadPhone && gotPhone) || (!hadWebsite && gotWebsite) || (!hadHours && gotHours);

      // Save using RPC function
      const { error: rpcError } = await supabase.rpc('update_google_contact_data', {
        p_bookshop_id: bookshop.id,
        p_formatted_phone: data.formatted_phone,
        p_website_verified: data.website_verified,
        p_opening_hours_json: data.opening_hours_json,
        p_google_maps_url: data.google_maps_url,
        p_google_types: data.google_types,
        p_formatted_address_google: data.formatted_address_google,
        p_business_status: data.business_status,
        p_contact_data_fetched_at: data.contact_data_fetched_at
      });

      if (rpcError) {
        console.log(`  ✗ Error saving: ${rpcError.message}`);
        failed++;
      } else {
        success++;
        if (newData) {
          updated++;
          const updates = [];
          if (!hadPhone && gotPhone) updates.push('phone');
          if (!hadWebsite && gotWebsite) updates.push('website');
          if (!hadHours && gotHours) updates.push('hours');
          console.log(`  ✓ Updated: ${updates.join(', ')}`);
        } else {
          noChange++;
          console.log('  ✓ No new data (fields still null in Google Places)');
        }
      }
    } catch (error: any) {
      console.log(`  ✗ Error: ${error.message}`);
      failed++;
    }

    // Rate limiting
    if (i < allBookshops.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('RE-FETCH COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`Total processed: ${allBookshops.length}`);
  console.log(`✓ Success: ${success}`);
  console.log(`  - Updated with new data: ${updated}`);
  console.log(`  - No change (still null): ${noChange}`);
  console.log(`✗ Failed: ${failed}`);
  console.log('═══════════════════════════════════════\n');
}

main().catch(console.error);

