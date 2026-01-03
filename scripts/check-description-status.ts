#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkStatus() {
  console.log('📊 Checking description status...\n');
  
  // Get all bookshops with location data (with pagination to handle >1000 rows)
  let allBookshops: any[] = [];
  let offset = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error: allError } = await supabase
      .from('bookstores')
      .select('id, name, city, state, ai_generated_description, description_source, description_validated, live')
      .not('city', 'is', null)
      .not('state', 'is', null)
      .range(offset, offset + pageSize - 1);
    
    if (allError) {
      console.error('Error fetching bookshops:', allError);
      return;
    }
    
    if (!data || data.length === 0) {
      break;
    }
    
    allBookshops = allBookshops.concat(data);
    
    if (data.length < pageSize) {
      break;
    }
    
    offset += pageSize;
  }
  
  if (allBookshops.length === 0) {
    console.log('No bookshops found');
    return;
  }
  
  const total = allBookshops.length;
  const live = allBookshops.filter(b => b.live).length;
  
  // Categorize by description status
  const withDescription = allBookshops.filter(b => b.ai_generated_description !== null);
  const withoutDescription = allBookshops.filter(b => b.ai_generated_description === null);
  
  // By source
  const aiGenerated = allBookshops.filter(b => b.description_source === 'ai');
  const templateGenerated = allBookshops.filter(b => b.description_source === 'template');
  const noSource = allBookshops.filter(b => b.description_source === null && b.ai_generated_description !== null);
  
  // By validation status
  const validated = allBookshops.filter(b => b.description_validated === true);
  const notValidated = allBookshops.filter(b => b.description_validated === false);
  const validationNull = allBookshops.filter(b => b.description_validated === null);
  
  // Live bookshops only
  const liveWithDescription = allBookshops.filter(b => b.live && b.ai_generated_description !== null);
  const liveWithoutDescription = allBookshops.filter(b => b.live && b.ai_generated_description === null);
  const liveValidated = allBookshops.filter(b => b.live && b.description_validated === true);
  
  console.log('='.repeat(60));
  console.log('OVERALL STATISTICS');
  console.log('='.repeat(60));
  console.log(`Total bookshops with location data: ${total}`);
  console.log(`  - Live: ${live}`);
  console.log(`  - Not live: ${total - live}`);
  console.log('');
  
  console.log('DESCRIPTION STATUS');
  console.log('-'.repeat(60));
  console.log(`✅ With description: ${withDescription.length} (${(withDescription.length/total*100).toFixed(1)}%)`);
  console.log(`❌ Without description: ${withoutDescription.length} (${(withoutDescription.length/total*100).toFixed(1)}%)`);
  console.log('');
  
  console.log('BY SOURCE');
  console.log('-'.repeat(60));
  console.log(`🤖 AI-generated: ${aiGenerated.length} (${(aiGenerated.length/total*100).toFixed(1)}%)`);
  console.log(`📝 Template-generated: ${templateGenerated.length} (${(templateGenerated.length/total*100).toFixed(1)}%)`);
  console.log(`❓ No source tracked: ${noSource.length} (${(noSource.length/total*100).toFixed(1)}%)`);
  console.log('');
  
  console.log('VALIDATION STATUS');
  console.log('-'.repeat(60));
  console.log(`✅ Validated: ${validated.length} (${(validated.length/total*100).toFixed(1)}%)`);
  console.log(`❌ Not validated: ${notValidated.length} (${(notValidated.length/total*100).toFixed(1)}%)`);
  console.log(`❓ Validation null: ${validationNull.length} (${(validationNull.length/total*100).toFixed(1)}%)`);
  console.log('');
  
  console.log('LIVE BOOKSHOPS ONLY');
  console.log('-'.repeat(60));
  console.log(`Total live: ${live}`);
  console.log(`✅ With description: ${liveWithDescription.length} (${(liveWithDescription.length/live*100).toFixed(1)}%)`);
  console.log(`❌ Without description: ${liveWithoutDescription.length} (${(liveWithoutDescription.length/live*100).toFixed(1)}%)`);
  console.log(`✅ Validated: ${liveValidated.length} (${(liveValidated.length/live*100).toFixed(1)}%)`);
  console.log('');
  
  // Show breakdown of live bookshops without descriptions
  if (liveWithoutDescription.length > 0 && liveWithoutDescription.length <= 20) {
    console.log('LIVE BOOKSHOPS WITHOUT DESCRIPTIONS:');
    console.log('-'.repeat(60));
    liveWithoutDescription.forEach(b => {
      console.log(`  - ID ${b.id}: ${b.name} (${b.city}, ${b.state})`);
    });
  } else if (liveWithoutDescription.length > 20) {
    console.log(`LIVE BOOKSHOPS WITHOUT DESCRIPTIONS: ${liveWithoutDescription.length} (showing first 10)`);
    console.log('-'.repeat(60));
    liveWithoutDescription.slice(0, 10).forEach(b => {
      console.log(`  - ID ${b.id}: ${b.name} (${b.city}, ${b.state})`);
    });
  }
  
  // Show breakdown of not validated
  if (notValidated.length > 0 && notValidated.length <= 20) {
    console.log('\nNOT VALIDATED DESCRIPTIONS:');
    console.log('-'.repeat(60));
    notValidated.forEach(b => {
      console.log(`  - ID ${b.id}: ${b.name} (${b.city}, ${b.state}) - Source: ${b.description_source || 'unknown'}`);
    });
  } else if (notValidated.length > 20) {
    console.log(`\nNOT VALIDATED DESCRIPTIONS: ${notValidated.length} (showing first 10)`);
    console.log('-'.repeat(60));
    notValidated.slice(0, 10).forEach(b => {
      console.log(`  - ID ${b.id}: ${b.name} (${b.city}, ${b.state}) - Source: ${b.description_source || 'unknown'}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

checkStatus().catch(console.error);
