#!/usr/bin/env tsx

/**
 * Enrich a single bookshop with Google Places contact data
 * Usage: npx tsx scripts/enrich-single-contact-data.ts <bookshop_id>
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

async function fetchAdditionalPlaceData(placeId: string): Promise<AdditionalPlaceData | null> {
  const fields = [
    'place_id',
    'formatted_phone_number',
    'international_phone_number',
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
      console.error(`  ⚠️  API Error: ${data.status}`);
      if (data.error_message) {
        console.error(`  Error message: ${data.error_message}`);
      }
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
    console.error(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  const bookshopId = parseInt(process.argv[2]);

  if (!bookshopId) {
    console.error('❌ Please provide a bookshop ID');
    console.log('Usage: npx tsx scripts/enrich-single-contact-data.ts <bookshop_id>');
    process.exit(1);
  }

  console.log(`Checking bookshop ID: ${bookshopId}\n`);

  // Get current data
  const { data: bookshop, error: fetchError } = await supabase
    .from('bookstores')
    .select('id, name, google_place_id, formatted_phone, website_verified, opening_hours_json, google_maps_url, google_types, formatted_address_google, business_status, contact_data_fetched_at')
    .eq('id', bookshopId)
    .single();

  if (fetchError || !bookshop) {
    console.error('❌ Error fetching bookshop:', fetchError);
    process.exit(1);
  }

  console.log('Current data:');
  console.log(`  Name: ${bookshop.name}`);
  console.log(`  Google Place ID: ${bookshop.google_place_id || 'NULL'}`);
  console.log(`  Phone: ${bookshop.formatted_phone || 'NULL'}`);
  console.log(`  Website: ${bookshop.website_verified || 'NULL'}`);
  console.log(`  Hours: ${bookshop.opening_hours_json ? 'Present' : 'NULL'}`);
  console.log(`  Maps URL: ${bookshop.google_maps_url || 'NULL'}`);
  console.log(`  Types: ${bookshop.google_types?.length || 0} types`);
  console.log(`  Address: ${bookshop.formatted_address_google || 'NULL'}`);
  console.log(`  Status: ${bookshop.business_status || 'NULL'}`);
  console.log(`  Fetched at: ${bookshop.contact_data_fetched_at || 'NULL'}\n`);

  if (!bookshop.google_place_id) {
    console.log('⚠️  This bookshop does not have a google_place_id.');
    console.log('   Attempting to find it first...\n');
    
    // Get full bookshop data including address
    const { data: fullBookshop, error: fullError } = await supabase
      .from('bookstores')
      .select('id, name, street, city, state, zip')
      .eq('id', bookshopId)
      .single();
    
    if (fullError || !fullBookshop) {
      console.error('❌ Error fetching bookshop address:', fullError);
      process.exit(1);
    }
    
    // Find Place ID
    const query = `${fullBookshop.name} ${fullBookshop.street} ${fullBookshop.city} ${fullBookshop.state} ${fullBookshop.zip}`;
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?` +
      `input=${encodeURIComponent(query)}` +
      `&inputtype=textquery` +
      `&fields=place_id` +
      `&key=${GOOGLE_PLACES_API_KEY}`;
    
    try {
      const response = await fetch(findUrl);
      const data = await response.json();
      
      if (data.status !== 'OK' || !data.candidates?.[0]?.place_id) {
        console.error(`❌ Could not find Google Place ID: ${data.status}`);
        process.exit(1);
      }
      
      const placeId = data.candidates[0].place_id;
      console.log(`✅ Found Place ID: ${placeId}\n`);
      
      // Save the place_id first (try RPC function, fallback to REST API)
      let placeIdSaved = false;
      
      // Try RPC function first
      const { error: rpcError } = await supabase.rpc('update_google_place_id', {
        p_bookshop_id: bookshopId,
        p_google_place_id: placeId
      });
      
      if (!rpcError) {
        placeIdSaved = true;
      } else {
        // Fallback to REST API
        console.log('  ℹ️  RPC function not available, trying REST API...');
        const placeIdResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/bookstores?id=eq.${bookshopId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE_KEY!,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ google_place_id: placeId })
          }
        );
        
        if (placeIdResponse.ok) {
          placeIdSaved = true;
        } else {
          const errorText = await placeIdResponse.text();
          console.error('❌ Error saving place_id:', errorText);
          console.error('   You may need to run: migrations/create-update-place-id-function.sql');
          process.exit(1);
        }
      }
      
      if (!placeIdSaved) {
        console.error('❌ Failed to save place_id');
        process.exit(1);
      }
      
      bookshop.google_place_id = placeId;
    } catch (error: any) {
      console.error('❌ Error finding Place ID:', error.message);
      process.exit(1);
    }
  }

  console.log(`Fetching contact data from Google Places API...\n`);

  const additionalData = await fetchAdditionalPlaceData(bookshop.google_place_id);

  if (!additionalData) {
    console.error('❌ Failed to fetch data from Google Places API');
    process.exit(1);
  }

  console.log('Fetched data:');
  console.log(`  Phone: ${additionalData.formatted_phone || 'NULL'}`);
  console.log(`  Website: ${additionalData.website_verified || 'NULL'}`);
  console.log(`  Hours: ${additionalData.opening_hours_json ? 'Present' : 'NULL'}`);
  console.log(`  Maps URL: ${additionalData.google_maps_url || 'NULL'}`);
  console.log(`  Types: ${additionalData.google_types.length} types`);
  console.log(`  Address: ${additionalData.formatted_address_google || 'NULL'}`);
  console.log(`  Status: ${additionalData.business_status}\n`);

  // Try to save using RPC function first (avoids geography trigger issues)
  console.log('Saving to database...');
  let saved = false;
  
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
    console.log('✅ Successfully saved using RPC function\n');
    saved = true;
  } else {
    console.log('  ℹ️  RPC function failed, trying REST API...');
    console.log(`  Error: ${rpcError.message}`);
    
    // Fallback to REST API (this will still hit geography error if triggers are active)
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/bookstores?id=eq.${bookshopId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          formatted_phone: additionalData.formatted_phone,
          website_verified: additionalData.website_verified,
          opening_hours_json: additionalData.opening_hours_json,
          google_maps_url: additionalData.google_maps_url,
          google_types: additionalData.google_types,
          formatted_address_google: additionalData.formatted_address_google,
          business_status: additionalData.business_status,
          contact_data_fetched_at: additionalData.contact_data_fetched_at
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Error saving:', errorText);
      console.error('\n⚠️  The database functions may not be created yet.');
      console.error('   Please run: migrations/run-contact-data-functions.sql in Supabase SQL Editor\n');
      process.exit(1);
    } else {
      console.log('✅ Successfully saved using REST API\n');
      saved = true;
    }
  }
  
  if (!saved) {
    console.error('❌ Failed to save data');
    process.exit(1);
  }

  // Verify the update
  const { data: updated, error: verifyError } = await supabase
    .from('bookstores')
    .select('formatted_phone, website_verified, opening_hours_json, google_maps_url, google_types, formatted_address_google, business_status, contact_data_fetched_at')
    .eq('id', bookshopId)
    .single();

  if (verifyError) {
    console.error('❌ Error verifying update:', verifyError);
  } else {
    console.log('Verified updated data:');
    console.log(`  Phone: ${updated.formatted_phone || 'NULL'}`);
    console.log(`  Website: ${updated.website_verified || 'NULL'}`);
    console.log(`  Hours: ${updated.opening_hours_json ? 'Present' : 'NULL'}`);
    console.log(`  Maps URL: ${updated.google_maps_url || 'NULL'}`);
    console.log(`  Types: ${updated.google_types?.length || 0} types`);
    console.log(`  Address: ${updated.formatted_address_google || 'NULL'}`);
    console.log(`  Status: ${updated.business_status || 'NULL'}`);
    console.log(`  Fetched at: ${updated.contact_data_fetched_at || 'NULL'}\n`);
  }
}

main().catch(console.error);

