#!/usr/bin/env tsx

/**
 * Check which bookshops have null contact data fields
 * Usage: npx tsx scripts/check-null-contact-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkNulls() {
  console.log('Checking for bookshops with null contact data...\n');

  // Get all bookshops in batches (Supabase has 1000 row limit)
  let allBookshops: any[] = [];
  let offset = 0;
  const BATCH_SIZE = 1000;
  let hasMore = true;

  console.log('Fetching all bookshops...');
  while (hasMore) {
    const { data: bookshops, error: batchError } = await supabase
      .from('bookstores')
      .select('id, name, google_place_id, formatted_phone, website_verified, opening_hours_json, google_maps_url, contact_data_fetched_at')
      .order('id')
      .range(offset, offset + BATCH_SIZE - 1);

    if (batchError) {
      console.error('❌ Error:', batchError);
      return;
    }

    if (!bookshops || bookshops.length === 0) {
      hasMore = false;
    } else {
      allBookshops = allBookshops.concat(bookshops);
      offset += BATCH_SIZE;
      hasMore = bookshops.length === BATCH_SIZE;
      console.log(`  Fetched ${allBookshops.length} bookshops...`);
    }
  }

  if (!allBookshops || allBookshops.length === 0) {
    console.log('No bookshops found');
    return;
  }

  console.log(`Total bookshops: ${allBookshops.length}\n`);

  // Count by category
  const stats = {
    total: allBookshops.length,
    withPlaceId: 0,
    withoutPlaceId: 0,
    withPlaceIdButNoContactData: 0,
    missingPhone: 0,
    missingWebsite: 0,
    missingHours: 0,
    missingMapsUrl: 0,
    missingAllContactData: 0
  };

  const missingContactData: any[] = [];

  allBookshops.forEach((b: any) => {
    if (b.google_place_id) {
      stats.withPlaceId++;
      
      const hasPhone = !!b.formatted_phone;
      const hasWebsite = !!b.website_verified;
      const hasHours = !!b.opening_hours_json;
      const hasMapsUrl = !!b.google_maps_url;
      const hasContactDataFetched = !!b.contact_data_fetched_at;

      if (!hasPhone) stats.missingPhone++;
      if (!hasWebsite) stats.missingWebsite++;
      if (!hasHours) stats.missingHours++;
      if (!hasMapsUrl) stats.missingMapsUrl++;

      // If they have place_id but no contact_data_fetched_at, they need enrichment
      if (!hasContactDataFetched) {
        stats.withPlaceIdButNoContactData++;
        missingContactData.push({
          id: b.id,
          name: b.name,
          google_place_id: b.google_place_id,
          missing: {
            phone: !hasPhone,
            website: !hasWebsite,
            hours: !hasHours,
            mapsUrl: !hasMapsUrl,
            contactDataFetched: !hasContactDataFetched
          }
        });
      }

      // Missing all contact data
      if (!hasPhone && !hasWebsite && !hasHours && !hasMapsUrl) {
        stats.missingAllContactData++;
      }
    } else {
      stats.withoutPlaceId++;
    }
  });

  console.log('═══════════════════════════════════════');
  console.log('CONTACT DATA ANALYSIS');
  console.log('═══════════════════════════════════════');
  console.log(`Total bookshops: ${stats.total}`);
  console.log(`  With google_place_id: ${stats.withPlaceId}`);
  console.log(`  Without google_place_id: ${stats.withoutPlaceId}`);
  console.log(`\nBookshops with place_id but missing contact_data_fetched_at: ${stats.withPlaceIdButNoContactData}`);
  console.log(`\nMissing fields (for bookshops with place_id):`);
  console.log(`  Phone: ${stats.missingPhone}`);
  console.log(`  Website: ${stats.missingWebsite}`);
  console.log(`  Hours: ${stats.missingHours}`);
  console.log(`  Maps URL: ${stats.missingMapsUrl}`);
  console.log(`  Missing ALL contact data: ${stats.missingAllContactData}`);
  console.log('═══════════════════════════════════════\n');

  if (missingContactData.length > 0) {
    console.log(`\n📋 Bookshops that need contact data enrichment (${missingContactData.length}):\n`);
    missingContactData.slice(0, 20).forEach((b: any) => {
      console.log(`  ID ${b.id}: ${b.name}`);
      console.log(`    Place ID: ${b.google_place_id}`);
      console.log(`    Missing: phone=${b.missing.phone}, website=${b.missing.website}, hours=${b.missing.hours}, mapsUrl=${b.missing.mapsUrl}`);
    });
    
    if (missingContactData.length > 20) {
      console.log(`  ... and ${missingContactData.length - 20} more\n`);
    }

    console.log(`\n✅ Run enrichment for these: npx tsx scripts/enrich-google-contact-data.ts\n`);
  } else {
    console.log('✅ All bookshops with google_place_id have contact_data_fetched_at\n');
  }

  // Also check for bookshops with place_id but null fields (even if fetched_at exists)
  const withNullFields = allBookshops.filter((b: any) => 
    b.google_place_id && 
    b.contact_data_fetched_at && 
    (!b.formatted_phone || !b.website_verified || !b.opening_hours_json || !b.google_maps_url)
  );

  if (withNullFields.length > 0) {
    console.log(`\n⚠️  ${withNullFields.length} bookshops have contact_data_fetched_at but some fields are still null:`);
    withNullFields.slice(0, 10).forEach((b: any) => {
      const missing = [];
      if (!b.formatted_phone) missing.push('phone');
      if (!b.website_verified) missing.push('website');
      if (!b.opening_hours_json) missing.push('hours');
      if (!b.google_maps_url) missing.push('mapsUrl');
      console.log(`  ID ${b.id}: ${b.name} - missing: ${missing.join(', ')}`);
    });
    if (withNullFields.length > 10) {
      console.log(`  ... and ${withNullFields.length - 10} more`);
    }
    console.log('\n  These may have been enriched but Google Places API didn\'t return data for those fields.\n');
  }
}

checkNulls().catch(console.error);

