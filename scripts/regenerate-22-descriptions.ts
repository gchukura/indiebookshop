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

function generateTemplateDescription(bookstore: any): string {
  const { name, city, state, google_rating, google_review_count } = bookstore;
  
  // Format review count with commas to avoid year detection false positives
  const formatReviewCount = (count: number) => count.toLocaleString();
  
  if (google_rating && google_rating >= 4.5 && google_review_count && google_review_count >= 50) {
    return `${name} is a highly-rated independent bookstore in ${city}, ${state}, with a ${google_rating}-star rating from ${formatReviewCount(google_review_count)} Google reviews. This community bookshop offers a curated selection and welcoming atmosphere for readers.`;
  } else if (google_rating && google_rating >= 4.0 && google_review_count && google_review_count >= 10) {
    return `${name} serves the ${city}, ${state} community as an independent bookstore with a ${google_rating}-star rating from ${formatReviewCount(google_review_count)} customers. This locally-owned bookshop provides a personalized experience and carefully selected books.`;
  } else if (google_rating && google_rating >= 4.0) {
    return `Located in ${city}, ${state}, ${name} is a community-focused independent bookstore with a ${google_rating}-star customer rating. This local bookshop offers a thoughtfully curated selection for readers of all ages.`;
  } else {
    return `${name} is an independent bookstore serving ${city}, ${state}. As a locally-owned bookshop, they offer a personalized selection and welcoming environment for readers.`;
  }
}

function validateTemplateDescription(description: string, bookstore: any): boolean {
  return description.includes(bookstore.name) &&
         description.includes(bookstore.city) &&
         description.includes(bookstore.state) &&
         description.length >= 100 && 
         description.length <= 400 &&
         !description.includes('undefined') &&
         !description.includes('null') &&
         description.split(' ').length >= 15;
}

async function regenerateDescriptions() {
  console.log('🔄 Regenerating 22 descriptions without source tracking...\n');
  
  // Fetch the 22 bookshops that need regeneration
  const { data: bookshops, error } = await supabase
    .from('bookstores')
    .select('id, name, city, state, google_description, google_rating, google_review_count, description_validated, description_source')
    .not('city', 'is', null)
    .not('state', 'is', null)
    .eq('description_validated', false)
    .is('description_source', null);
  
  if (error) {
    console.error('Error fetching bookshops:', error);
    return;
  }
  
  if (!bookshops || bookshops.length === 0) {
    console.log('✅ No bookshops need regeneration');
    return;
  }
  
  console.log(`Found ${bookshops.length} bookshops to regenerate\n`);
  
  const results = {
    success: 0,
    failed: 0,
    total: bookshops.length
  };
  
  for (let i = 0; i < bookshops.length; i++) {
    const bookshop = bookshops[i];
    console.log(`[${i + 1}/${bookshops.length}] ${bookshop.name} (${bookshop.city}, ${bookshop.state})`);
    
    try {
      const description = generateTemplateDescription(bookshop);
      const valid = validateTemplateDescription(description, bookshop);
      
      const { error: updateError } = await supabase
        .from('bookstores')
        .update({
          ai_generated_description: description,
          description_validated: valid,
          description_source: 'template',
          description_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', bookshop.id);
      
      if (updateError) {
        console.error(`  ❌ Update failed:`, updateError);
        results.failed++;
      } else {
        console.log(`  ✅ Regenerated template (${description.length} chars, validated: ${valid})`);
        results.success++;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
      results.failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 REGENERATION RESULTS');
  console.log('='.repeat(60));
  console.log(`Total processed: ${results.total}`);
  console.log(`✅ Success: ${results.success} (${(results.success/results.total*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${results.failed} (${(results.failed/results.total*100).toFixed(1)}%)`);
  console.log('='.repeat(60));
}

regenerateDescriptions().catch(console.error);

