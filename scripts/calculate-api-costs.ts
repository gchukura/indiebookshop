#!/usr/bin/env tsx

/**
 * Calculate Google Places API Costs
 * 
 * This script calculates the estimated cost of the Google Places API calls
 * made during the enrichment process.
 * 
 * Usage:
 *   npx tsx scripts/calculate-api-costs.ts
 * 
 * Environment Variables Required:
 *   - SUPABASE_URL: Your Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

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

/**
 * Google Places API Pricing (as of 2024)
 * Source: https://developers.google.com/maps/billing-and-pricing/pricing
 */
const PRICING = {
  // Find Place From Text (per request)
  findPlaceFromText: {
    pricePer1000: 17.00, // $17.00 per 1,000 requests
    sku: 'Places.FindPlaceFromText'
  },
  // Place Details (per request)
  placeDetails: {
    pricePer1000: 17.00, // $17.00 per 1,000 requests
    sku: 'Places.PlaceDetails'
  },
  // Monthly credit (applied automatically)
  monthlyCredit: 200.00 // $200.00 free credit per month
};

/**
 * Calculate cost for a number of requests
 */
function calculateCost(requests: number, pricePer1000: number): number {
  return (requests / 1000) * pricePer1000;
}

/**
 * Main function
 */
async function main() {
  console.log('💰 Calculating Google Places API costs...\n');
  
  try {
    // Get total live bookshops
    const { data: allBookshops, error: allError } = await supabase
      .from('bookstores')
      .select('id')
      .eq('live', true);
    
    if (allError) {
      console.error('❌ Error fetching all bookshops:', allError);
      return;
    }
    
    const totalLiveBookshops = allBookshops?.length || 0;
    
    // Get successfully enriched bookshops (have google_data_updated_at)
    const { data: enrichedBookshops, error: enrichedError } = await supabase
      .from('bookstores')
      .select('id, google_place_id')
      .eq('live', true)
      .not('google_data_updated_at', 'is', null);
    
    if (enrichedError) {
      console.error('❌ Error fetching enriched bookshops:', enrichedError);
      return;
    }
    
    const successfullyEnriched = enrichedBookshops?.length || 0;
    
    // Get failed enrichments (no google_data_updated_at)
    const { data: failedBookshops, error: failedError } = await supabase
      .from('bookstores')
      .select('id, google_place_id')
      .eq('live', true)
      .is('google_data_updated_at', null);
    
    if (failedError) {
      console.error('❌ Error fetching failed bookshops:', failedError);
      return;
    }
    
    const failedEnrichments = failedBookshops?.length || 0;
    
    // Count how many successfully enriched bookshops have Place IDs (all should have them)
    const enrichedWithPlaceId = enrichedBookshops?.filter(b => b.google_place_id).length || 0;
    
    // Calculate API calls based on actual enrichment process:
    // 1. findPlaceFromText calls: Made for every bookshop that didn't have a Place ID
    //    - Failed enrichments: All attempted findPlaceFromText (67)
    //    - Successful enrichments: Only those that didn't already have Place ID
    //    Since we started with no Place IDs, we attempted findPlaceFromText for all
    const findPlaceFromTextCalls = totalLiveBookshops; // Attempted for all bookshops
    
    // 2. placeDetails calls: Only made when we found or had a Place ID
    //    - Only successful enrichments got placeDetails calls
    //    - Failed ones never found a Place ID, so no placeDetails call
    const placeDetailsCalls = successfullyEnriched;
    
    // Calculate costs
    const findPlaceFromTextCost = calculateCost(findPlaceFromTextCalls, PRICING.findPlaceFromText.pricePer1000);
    const placeDetailsCost = calculateCost(placeDetailsCalls, PRICING.placeDetails.pricePer1000);
    const totalCost = findPlaceFromTextCost + placeDetailsCost;
    const costAfterCredit = Math.max(0, totalCost - PRICING.monthlyCredit);
    
    // Display results
    console.log('📊 Enrichment Statistics:');
    console.log(`   Total live bookshops: ${totalLiveBookshops}`);
    console.log(`   Successfully enriched: ${successfullyEnriched}`);
    console.log(`   Failed enrichments: ${failedEnrichments}`);
    console.log(`   Enriched with Place ID: ${enrichedWithPlaceId}\n`);
    
    console.log('📞 API Calls Made:');
    console.log(`   Find Place From Text: ${findPlaceFromTextCalls.toLocaleString()} calls`);
    console.log(`   Place Details: ${placeDetailsCalls.toLocaleString()} calls`);
    console.log(`   Total API calls: ${(findPlaceFromTextCalls + placeDetailsCalls).toLocaleString()}\n`);
    
    console.log('💰 Cost Breakdown:');
    console.log(`   Find Place From Text: $${findPlaceFromTextCost.toFixed(2)}`);
    console.log(`   Place Details: $${placeDetailsCost.toFixed(2)}`);
    console.log(`   Subtotal: $${totalCost.toFixed(2)}`);
    console.log(`   Monthly Credit: -$${PRICING.monthlyCredit.toFixed(2)}`);
    console.log(`   ─────────────────────`);
    console.log(`   Estimated Cost: $${costAfterCredit.toFixed(2)}\n`);
    
    if (costAfterCredit === 0) {
      console.log('✅ All costs covered by the $200 monthly credit!');
      console.log(`   Remaining credit: $${(PRICING.monthlyCredit - totalCost).toFixed(2)}\n`);
    } else {
      console.log(`⚠️  Cost exceeds monthly credit by $${costAfterCredit.toFixed(2)}`);
      console.log(`   This would be charged to your billing account.\n`);
    }
    
    // Additional metrics
    const costPerBookshop = totalCost / totalLiveBookshops;
    const costPerSuccessful = totalCost / successfullyEnriched;
    
    console.log('📈 Cost Metrics:');
    console.log(`   Cost per bookshop (all): $${costPerBookshop.toFixed(4)}`);
    console.log(`   Cost per successful enrichment: $${costPerSuccessful.toFixed(4)}`);
    console.log(`   Success rate: ${((successfullyEnriched / totalLiveBookshops) * 100).toFixed(1)}%\n`);
    
    console.log('💡 Note:');
    console.log('   - Pricing based on Google Places API rates as of 2024');
    console.log('   - $200 monthly credit applies automatically');
    console.log('   - Actual costs may vary based on your billing account settings');
    console.log('   - Check Google Cloud Console for exact usage and billing\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

