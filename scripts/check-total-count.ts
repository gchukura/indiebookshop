#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTotalCount() {
  console.log('Checking total bookshop counts...\n');
  
  // Get total count (this uses count, not select, so it should work)
  const { count: totalCount, error: totalError } = await supabase
    .from('bookstores')
    .select('*', { count: 'exact', head: true });
  
  if (totalError) {
    console.error('Error getting total count:', totalError);
  } else {
    console.log(`Total bookshops in database: ${totalCount}`);
  }
  
  // Get count with location data
  const { count: withLocationCount, error: locationError } = await supabase
    .from('bookstores')
    .select('*', { count: 'exact', head: true })
    .not('city', 'is', null)
    .not('state', 'is', null);
  
  if (locationError) {
    console.error('Error getting location count:', locationError);
  } else {
    console.log(`Bookshops with location data: ${withLocationCount}`);
  }
  
  // Get count of live bookshops
  const { count: liveCount, error: liveError } = await supabase
    .from('bookstores')
    .select('*', { count: 'exact', head: true })
    .eq('live', true);
  
  if (liveError) {
    console.error('Error getting live count:', liveError);
  } else {
    console.log(`Live bookshops: ${liveCount}`);
  }
  
  // Get count of live bookshops with location
  const { count: liveWithLocationCount, error: liveLocationError } = await supabase
    .from('bookstores')
    .select('*', { count: 'exact', head: true })
    .eq('live', true)
    .not('city', 'is', null)
    .not('state', 'is', null);
  
  if (liveLocationError) {
    console.error('Error getting live with location count:', liveLocationError);
  } else {
    console.log(`Live bookshops with location: ${liveWithLocationCount}`);
  }
  
  // Check if we're hitting the limit
  if (withLocationCount && withLocationCount > 1000) {
    console.log(`\n⚠️  WARNING: There are ${withLocationCount} bookshops with location data, but Supabase queries are limited to 1000 rows by default.`);
    console.log('We need to paginate through results to see all bookshops.');
  }
  
  // Try to fetch all with pagination
  if (withLocationCount && withLocationCount > 1000) {
    console.log('\nFetching all bookshops with pagination...');
    let allBookshops: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('bookstores')
        .select('id, name, city, state, ai_generated_description, description_source, description_validated, live')
        .not('city', 'is', null)
        .not('state', 'is', null)
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error('Error fetching page:', error);
        break;
      }
      
      if (!data || data.length === 0) {
        break;
      }
      
      allBookshops = allBookshops.concat(data);
      console.log(`Fetched ${allBookshops.length} / ${withLocationCount} bookshops...`);
      
      if (data.length < pageSize) {
        break;
      }
      
      offset += pageSize;
    }
    
    console.log(`\nTotal fetched: ${allBookshops.length}`);
    
    const withDescription = allBookshops.filter(b => b.ai_generated_description !== null).length;
    const validated = allBookshops.filter(b => b.description_validated === true).length;
    const aiGenerated = allBookshops.filter(b => b.description_source === 'ai').length;
    const templateGenerated = allBookshops.filter(b => b.description_source === 'template').length;
    
    console.log(`\nActual statistics:`);
    console.log(`  With description: ${withDescription} (${(withDescription/allBookshops.length*100).toFixed(1)}%)`);
    console.log(`  Validated: ${validated} (${(validated/allBookshops.length*100).toFixed(1)}%)`);
    console.log(`  AI-generated: ${aiGenerated} (${(aiGenerated/allBookshops.length*100).toFixed(1)}%)`);
    console.log(`  Template-generated: ${templateGenerated} (${(templateGenerated/allBookshops.length*100).toFixed(1)}%)`);
  }
}

checkTotalCount().catch(console.error);

