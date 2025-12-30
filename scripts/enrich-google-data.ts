#!/usr/bin/env tsx

/**
 * Google Places API Enrichment Script
 * 
 * This script enriches bookshop data with information from Google Places API:
 * - Ratings and review counts
 * - Editorial descriptions
 * - Photos
 * - Customer reviews
 * - Price levels
 * 
 * Usage:
 *   tsx scripts/enrich-google-data.ts [--batch-size=100] [--delay=100] [--refresh-stale]
 * 
 * Environment Variables Required:
 *   - GOOGLE_PLACES_API_KEY: Your Google Places API key
 *   - SUPABASE_URL: Your Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

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

interface GooglePlace {
  place_id: string;
  rating?: number;
  user_ratings_total?: number;
  editorial_summary?: { overview?: string };
  photos?: Array<{ photo_reference: string }>;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  price_level?: number;
}

interface Bookshop {
  id: number;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  google_place_id?: string | null;
}

/**
 * Find Google Place ID for a bookshop using Text Search
 */
async function findPlaceId(bookshop: Bookshop): Promise<string | null> {
  try {
    const query = `${bookshop.name} ${bookshop.street} ${bookshop.city} ${bookshop.state} ${bookshop.zip}`;
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?` +
      `input=${encodeURIComponent(query)}` +
      `&inputtype=textquery` +
      `&fields=place_id` +
      `&key=${GOOGLE_PLACES_API_KEY}`
    );
    
    if (!response.ok) {
      console.error(`  ⚠️  API request failed with status ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === 'ZERO_RESULTS') {
      return null;
    }
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`  ⚠️  API returned status: ${data.status}`);
      return null;
    }
    
    return data.candidates?.[0]?.place_id || null;
  } catch (error) {
    console.error(`  ❌ Error finding Place ID:`, error);
    return null;
  }
}

/**
 * Get detailed place information from Google Places API
 */
async function getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
  try {
    const fields = [
      'place_id',
      'rating',
      'user_ratings_total',
      'editorial_summary',
      'photos',
      'reviews',
      'price_level'
    ].join(',');
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${placeId}` +
      `&fields=${fields}` +
      `&key=${GOOGLE_PLACES_API_KEY}`
    );
    
    if (!response.ok) {
      console.error(`  ⚠️  API request failed with status ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error(`  ⚠️  API returned status: ${data.status}`);
      return null;
    }
    
    return data.result || null;
  } catch (error) {
    console.error(`  ❌ Error fetching place details:`, error);
    return null;
  }
}

/**
 * Enrich a single bookshop with Google Places data
 */
async function enrichBookshop(bookshop: Bookshop, delayMs: number = 100): Promise<boolean> {
  try {
    // Step 1: Find Google Place ID if we don't have it
    let placeId = bookshop.google_place_id;
    if (!placeId) {
      console.log(`  🔍 Finding Place ID for ${bookshop.name}...`);
      placeId = await findPlaceId(bookshop);
      
      if (!placeId) {
        console.log(`  ⚠️  No Place ID found for ${bookshop.name}`);
        return false;
      }
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    // Step 2: Get Place Details
    console.log(`  📥 Fetching details for Place ID: ${placeId}...`);
    const place = await getPlaceDetails(placeId);
    
    if (!place) {
      console.log(`  ⚠️  No details found for ${bookshop.name}`);
      return false;
    }
    
    // Step 3: Update Supabase
    const updateData: any = {
      google_place_id: place.place_id,
      google_rating: place.rating?.toString() || null,
      google_review_count: place.user_ratings_total || null,
      google_description: place.editorial_summary?.overview || null,
      google_photos: place.photos?.slice(0, 5).map(p => ({ photo_reference: p.photo_reference })) || null,
      google_reviews: place.reviews?.slice(0, 5).map(r => ({
        author_name: r.author_name,
        rating: r.rating,
        text: r.text,
        time: r.time
      })) || null,
      google_price_level: place.price_level || null,
      google_data_updated_at: new Date().toISOString()
    };
    
    // Try RPC function first (avoids geography trigger issues)
    const { error: rpcError } = await supabase.rpc('update_google_places_data', {
      p_bookshop_id: bookshop.id,
      p_google_place_id: updateData.google_place_id,
      p_google_rating: updateData.google_rating,
      p_google_review_count: updateData.google_review_count,
      p_google_description: updateData.google_description,
      p_google_photos: updateData.google_photos,
      p_google_reviews: updateData.google_reviews,
      p_google_price_level: updateData.google_price_level,
      p_google_data_updated_at: updateData.google_data_updated_at
    });

    if (rpcError) {
      // Fallback to REST API
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/bookstores?id=eq.${bookshop.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`  ❌ Error updating ${bookshop.name}:`, errorText);
        if (errorText.includes('geography')) {
          console.error(`  ⚠️  Database function may not exist. Run: migrations/create-update-google-places-function.sql`);
        }
        return false;
      }
    }
    
    console.log(`  ✅ Enriched ${bookshop.name} (Rating: ${place.rating || 'N/A'}, Reviews: ${place.user_ratings_total || 0})`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error enriching ${bookshop.name}:`, error);
    return false;
  }
}

/**
 * Enrich all bookshops (or those without Google data)
 */
async function enrichAllBookshops(options: {
  batchSize?: number;
  delayMs?: number;
  refreshStale?: boolean;
} = {}) {
  const { batchSize = 100, delayMs = 100, refreshStale = false } = options;
  
  console.log('🚀 Starting Google Places API enrichment...\n');
  
  try {
    // Process in batches to handle Supabase's 1000 row limit
    const BATCH_SIZE_FETCH = batchSize || 1000;
    let allBookshops: Bookshop[] = [];
    let offset = 0;
    let hasMore = true;

    console.log('📝 Enriching bookshops without Google Places data...\n');

    while (hasMore && allBookshops.length < BATCH_SIZE_FETCH) {
      let query = supabase
        .from('bookstores')
        .select('id, name, street, city, state, zip, google_place_id')
        .is('google_place_id', null)
        .order('id')
        .range(offset, offset + 1000 - 1)
        .limit(Math.min(1000, BATCH_SIZE_FETCH - allBookshops.length));

      if (refreshStale) {
        // Refresh data older than 3 months
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        query = query.or(`google_data_updated_at.is.null,google_data_updated_at.lt.${threeMonthsAgo.toISOString()}`);
        console.log('🔄 Refreshing stale data (older than 3 months)...\n');
      }

      const { data: bookshops, error } = await query;

      if (error) {
        console.error('❌ Error fetching bookshops:', error);
        return;
      }

      if (!bookshops || bookshops.length === 0) {
        hasMore = false;
      } else {
        allBookshops = allBookshops.concat(bookshops);
        offset += 1000;
        hasMore = bookshops.length === 1000 && allBookshops.length < BATCH_SIZE_FETCH;
      }
    }

    const bookshops = allBookshops;

    if (!bookshops || bookshops.length === 0) {
      console.log('✅ No bookshops to enrich!');
      return;
    }
    
    console.log(`📊 Found ${bookshops.length} bookshops to enrich\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < bookshops.length; i++) {
      const bookshop = bookshops[i];
      console.log(`[${i + 1}/${bookshops.length}] Processing: ${bookshop.name}`);
      
      const success = await enrichBookshop(bookshop, delayMs);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Rate limiting: wait between requests (except for the last one)
      if (i < bookshops.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.log(`\n✅ Enrichment complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`   Total: ${bookshops.length}`);
  } catch (error) {
    console.error('❌ Fatal error during enrichment:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100');
const delayMs = parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1] || '100');
const refreshStale = args.includes('--refresh-stale');

// Run the enrichment
enrichAllBookshops({ batchSize, delayMs, refreshStale })
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });


