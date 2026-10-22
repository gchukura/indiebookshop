#!/usr/bin/env tsx

/**
 * Update Bookshop Information
 * 
 * This script updates a specific bookshop's information in the database.
 * 
 * Usage:
 *   npx tsx scripts/update-bookshop.ts [bookshop-id]
 * 
 * Examples:
 *   npx tsx scripts/update-bookshop.ts 170  # Update bookshop by ID
 *   npx tsx scripts/update-bookshop.ts      # Update using hardcoded search
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
 * Main function
 */
async function main() {
  console.log('📝 Updating bookshop information...\n');
  
  // Get bookshop ID from command line or use default
  const bookshopId = process.argv[2] ? parseInt(process.argv[2]) : null;
  
  // Bookshop update data for ID 170
  const updates = {
    name: "Babycake's Book Stack",
    street: "123 Bookmobile St. (Call for mailing address/See calendar for bookmobile location)",
    city: "St. Paul",
    state: "MN",
    zip: "55102",
    phone: "651-321-3436",
    website: "https://babycakesbookstack.com/"
  };
  
  try {
    let bookshop;
    
    if (bookshopId) {
      // Find by ID
      console.log(`🔍 Looking for bookshop with ID: ${bookshopId}...`);
      
      const { data, error } = await supabase
        .from('bookstores')
        .select('id, name, street, city, state, zip, phone, website')
        .eq('id', bookshopId)
        .single();
      
      if (error || !data) {
        console.error(`❌ Bookshop with ID ${bookshopId} not found:`, error);
        return;
      }
      
      bookshop = data;
    } else {
      // Fallback: search by name (original behavior)
      const bookshopName = "Babycake's Book Stack";
      console.log(`🔍 Looking for bookshop: "${bookshopName}"...`);
      
      const { data: bookshops, error: searchError } = await supabase
        .from('bookstores')
        .select('id, name, street, city, state, zip, phone, website')
        .ilike('name', `%${bookshopName}%`)
        .limit(5);
      
      if (searchError) {
        console.error('❌ Error searching for bookshop:', searchError);
        return;
      }
      
      if (!bookshops || bookshops.length === 0) {
        console.error(`❌ Bookshop "${bookshopName}" not found`);
        return;
      }
      
      if (bookshops.length === 1) {
        bookshop = bookshops[0];
      } else {
        console.log('⚠️  Multiple matches found. Please select:');
        bookshops.forEach((b, i) => {
          console.log(`   ${i + 1}. ${b.name} - ${b.street}, ${b.city}, ${b.state} ${b.zip}`);
        });
        return;
      }
    }
    
    console.log(`✅ Found bookshop: ${bookshop.name} (ID: ${bookshop.id})`);
    console.log(`   Current: ${bookshop.street || 'N/A'}, ${bookshop.city}, ${bookshop.state} ${bookshop.zip}\n`);
    
    // Show what will be updated
    console.log('📋 Updates to apply:');
    console.log(`   Name: "${bookshop.name}" → "${updates.name}"`);
    console.log(`   Street: "${bookshop.street || 'N/A'}" → "${updates.street}"`);
    console.log(`   City: "${bookshop.city}" → "${updates.city}"`);
    console.log(`   State: "${bookshop.state}" → "${updates.state}"`);
    console.log(`   ZIP: "${bookshop.zip || 'N/A'}" → "${updates.zip}"`);
    console.log(`   Phone: "${bookshop.phone || 'N/A'}" → "${updates.phone}"`);
    if (updates.website) {
      console.log(`   Website: "${bookshop.website || 'N/A'}" → "${updates.website}"`);
    }
    console.log('');
    
    // Update the bookshop
    console.log('💾 Updating database...');
    
    // Prepare update data
    const updateData: any = {
      name: updates.name,
      street: updates.street,
      city: updates.city,
      state: updates.state,
      zip: updates.zip,
      phone: updates.phone,
      // Clear Google Places data since address changed - will need to re-enrich
      google_place_id: null,
      google_data_updated_at: null
    };
    
    // Add website if provided
    if (updates.website) {
      updateData.website = updates.website;
    }
    
    // Add hours if provided
    if ((updates as any).hours) {
      updateData.hours_json = (updates as any).hours;
    }
    
    const { data: updatedBookshop, error: updateError } = await supabase
      .from('bookstores')
      .update(updateData)
      .eq('id', bookshop.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating bookshop:', updateError);
      return;
    }
    
    if (!updatedBookshop) {
      console.error('❌ Update completed but no data returned');
      return;
    }
    
    console.log('✅ Bookshop updated successfully!\n');
    console.log('📊 Updated information:');
    console.log(`   ID: ${updatedBookshop.id}`);
    console.log(`   Name: ${updatedBookshop.name}`);
    console.log(`   Address: ${updatedBookshop.street}, ${updatedBookshop.city}, ${updatedBookshop.state} ${updatedBookshop.zip}`);
    console.log(`   Phone: ${updatedBookshop.phone || 'N/A'}`);
    console.log(`   Website: ${updatedBookshop.website || 'N/A'}`);
    if ((updatedBookshop as any).hours_json) {
      console.log(`   Hours: ${JSON.stringify((updatedBookshop as any).hours_json)}`);
    }
    console.log('');
    
    console.log('💡 Note: Google Places data has been cleared. Run enrichment script to fetch new data:');
    console.log(`   npx tsx scripts/enrich-google-data.ts --batch-size=1 --delay=200\n`);
    
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

