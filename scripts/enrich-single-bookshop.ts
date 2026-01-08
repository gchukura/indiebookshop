#!/usr/bin/env tsx

/**
 * Enrich a Single Bookshop with Google Places Data
 * 
 * This script enriches a specific bookshop by ID with Google Places API data.
 * 
 * Usage:
 *   npx tsx scripts/enrich-single-bookshop.ts <bookshop-id>
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
async function enrichBookshop(bookshop: Bookshop): Promise<boolean> {
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
      await new Promise(resolve => setTimeout(resolve, 200));
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
    
    const { error } = await supabase
      .from('bookstores')
      .update(updateData)
      .eq('id', bookshop.id);
    
    if (error) {
      console.error(`  ❌ Error updating ${bookshop.name}:`, error);
      return false;
    }
    
    console.log(`  ✅ Enriched ${bookshop.name} (Rating: ${place.rating || 'N/A'}, Reviews: ${place.user_ratings_total || 0})`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error enriching ${bookshop.name}:`, error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const bookshopId = process.argv[2];
  
  if (!bookshopId) {
    console.error('❌ Please provide a bookshop ID');
    console.log('Usage: npx tsx scripts/enrich-single-bookshop.ts <bookshop-id>');
    process.exit(1);
  }
  
  const id = parseInt(bookshopId);
  if (isNaN(id)) {
    console.error('❌ Invalid bookshop ID. Please provide a number.');
    process.exit(1);
  }
  
  console.log(`🔍 Fetching bookshop with ID: ${id}...\n`);
  
  try {
    const { data: bookshop, error } = await supabase
      .from('bookstores')
      .select('id, name, street, city, state, zip, google_place_id')
      .eq('id', id)
      .single();
    
    if (error || !bookshop) {
      console.error('❌ Error fetching bookshop:', error || 'Bookshop not found');
      return;
    }
    
    console.log(`📋 Bookshop: ${bookshop.name}`);
    console.log(`   Address: ${bookshop.street}, ${bookshop.city}, ${bookshop.state} ${bookshop.zip}\n`);
    
    console.log('🚀 Starting enrichment...\n');
    
    const success = await enrichBookshop(bookshop);
    
    if (success) {
      console.log('\n✅ Enrichment complete!');
    } else {
      console.log('\n❌ Enrichment failed. Check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
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




