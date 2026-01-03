#!/usr/bin/env tsx

/**
 * Condense AI-generated descriptions to optimal length (150-250 characters)
 * PREVIEW MODE - Does not save changes, only shows results
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

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

function condenseDescription(fullText: string, bookstoreName: string): string {
  // Split by double newlines (paragraphs)
  const paragraphs = fullText.split(/\n\n+/);
  
  // Get first paragraph (usually has name, location, and rating)
  let firstPara = paragraphs[0];
  
  // Extract the rating if present
  const ratingMatch = firstPara.match(/(\d\.\d-star rating from \d+[,\d]* reviews?)/);
  const ratingText = ratingMatch ? ratingMatch[1] : '';
  
  // Split first paragraph into sentences
  const sentences = firstPara.split(/\.\s+/).filter(s => s.trim().length > 0);
  
  // Start with first sentence
  let result = sentences[0];
  if (!result.endsWith('.')) result += '.';
  
  // Clean up formulaic language while preserving meaning
  result = result.replace(/is an independent bookshop in/, 'is an independent bookstore in');
  result = result.replace(/offering readers access to/, 'offering');
  result = result.replace(/offering a thoughtfully curated selection of books across various genres and subjects/, 'offering a curated selection of books');
  result = result.replace(/offering books across a range of genres and subjects/, 'offering books across multiple genres');
  result = result.replace(/offering books across various genres and subjects/, 'offering a diverse selection of books');
  result = result.replace(/This locally-owned establishment provides/, 'They provide');
  result = result.replace(/This establishment operates/, 'Operating');
  result = result.replace(/This locally-owned establishment/, 'This bookstore');
  result = result.replace(/This distinctive establishment/, 'This bookstore');
  
  // Fix grammar issues
  result = result.replace(/they provides/g, 'they provide');
  result = result.replace(/they serves/g, 'they serve');
  result = result.replace(/they offers/g, 'they offer');
  
  // If we have a rating and it's not already in the result, add it
  if (ratingText && !result.includes('star rating')) {
    result += ` With a ${ratingText}`;
  }
  
  // If result is still too short (<150), try to add a second sentence
  if (result.length < 150 && sentences.length > 1) {
    // Take second sentence and condense it
    let secondSentence = sentences[1];
    
    // Condense common phrases in second sentence
    secondSentence = secondSentence.replace(/This locally-owned establishment provides/, 'They provide');
    secondSentence = secondSentence.replace(/creating a welcoming space for/, 'serving');
    secondSentence = secondSentence.replace(/creating a welcoming environment where/, 'where');
    secondSentence = secondSentence.replace(/creating a unique destination for/, 'serving');
    
    // Remove redundant phrases
    secondSentence = secondSentence.replace(/for readers throughout the community/g, '');
    secondSentence = secondSentence.replace(/for the community's book lovers/g, '');
    
    // Add if it adds meaningful content and doesn't make it too long
    const combined = result + ' ' + secondSentence;
    if (combined.length <= 250 && secondSentence.length > 20) {
      result = combined;
      if (!result.endsWith('.')) result += '.';
    }
  }
  
  // If still too short, add a generic closing
  if (result.length < 150) {
    result += ' This bookstore offers a personalized selection and welcoming environment for readers.';
  }
  
  // Clean up spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  // If too long (>250), intelligently truncate
  if (result.length > 250) {
    // Try to find a good truncation point at a sentence boundary
    const truncatePoint = result.lastIndexOf('.', 250);
    if (truncatePoint > 150) {
      result = result.substring(0, truncatePoint + 1);
    } else {
      // If no good sentence break, truncate at word boundary
      const wordBoundary = result.lastIndexOf(' ', 250);
      if (wordBoundary > 150) {
        result = result.substring(0, wordBoundary) + '.';
      } else {
        // Last resort: hard truncate
        result = result.substring(0, 247) + '...';
      }
    }
  }
  
  return result;
}

async function condenseAllDescriptions() {
  console.log('🔄 Condensing AI descriptions (PREVIEW MODE - no changes will be saved)...\n');
  
  // Fetch all AI descriptions
  const { data: bookshops, error } = await supabase
    .from('bookstores')
    .select('id, name, city, state, ai_generated_description, description_source')
    .eq('description_source', 'ai')
    .not('ai_generated_description', 'is', null)
    .limit(100); // Preview with first 100 for testing
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!bookshops || bookshops.length === 0) {
    console.log('No AI descriptions found');
    return;
  }
  
  console.log(`Found ${bookshops.length} AI descriptions to condense (preview mode)\n`);
  
  const stats = {
    success: 0,
    errors: 0,
    avgOriginalLength: 0,
    avgNewLength: 0,
    inTargetRange: 0, // 150-250 chars
    tooShort: 0, // <150 chars
    tooLong: 0, // >250 chars
  };
  
  // First pass: calculate and preview
  const previews: any[] = [];
  
  for (const bookshop of bookshops) {
    const original = bookshop.ai_generated_description;
    const condensed = condenseDescription(original, bookshop.name);
    
    stats.avgOriginalLength += original.length;
    stats.avgNewLength += condensed.length;
    
    // Check length category
    if (condensed.length >= 150 && condensed.length <= 250) {
      stats.inTargetRange++;
    } else if (condensed.length < 150) {
      stats.tooShort++;
    } else {
      stats.tooLong++;
    }
    
    // Validate condensed description has required elements
    const hasName = condensed.includes(bookshop.name);
    const hasCity = bookshop.city ? condensed.includes(bookshop.city) : true;
    const hasState = bookshop.state ? condensed.includes(bookshop.state) : true;
    
    if (previews.length < 15) {
      previews.push({
        id: bookshop.id,
        name: bookshop.name,
        city: bookshop.city,
        state: bookshop.state,
        originalLength: original.length,
        newLength: condensed.length,
        inTargetRange: condensed.length >= 150 && condensed.length <= 250,
        hasRequiredElements: hasName && hasCity && hasState,
        original: original.substring(0, 200) + '...',
        condensed: condensed
      });
    }
  }
  
  stats.avgOriginalLength = Math.round(stats.avgOriginalLength / bookshops.length);
  stats.avgNewLength = Math.round(stats.avgNewLength / bookshops.length);
  
  console.log('📊 PREVIEW (first 15):');
  console.log('='.repeat(80));
  previews.forEach((p, i) => {
    console.log(`\n[${i + 1}] ${p.name} (ID: ${p.id})`);
    console.log(`  Location: ${p.city}, ${p.state}`);
    console.log(`  Length: ${p.originalLength} → ${p.newLength} chars ${p.inTargetRange ? '✅' : '⚠️'}`);
    console.log(`  Required elements: ${p.hasRequiredElements ? '✅' : '❌'}`);
    console.log(`  Original: "${p.original}"`);
    console.log(`  Condensed: "${p.condensed}"`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY STATISTICS');
  console.log('='.repeat(80));
  console.log(`Total descriptions: ${bookshops.length}`);
  console.log(`Average reduction: ${stats.avgOriginalLength} → ${stats.avgNewLength} chars`);
  console.log(`Reduction: ${Math.round((1 - stats.avgNewLength / stats.avgOriginalLength) * 100)}%`);
  console.log('');
  console.log('Length distribution:');
  console.log(`  ✅ In target range (150-250): ${stats.inTargetRange} (${(stats.inTargetRange/bookshops.length*100).toFixed(1)}%)`);
  console.log(`  ⚠️  Too short (<150): ${stats.tooShort} (${(stats.tooShort/bookshops.length*100).toFixed(1)}%)`);
  console.log(`  ⚠️  Too long (>250): ${stats.tooLong} (${(stats.tooLong/bookshops.length*100).toFixed(1)}%)`);
  console.log('');
  console.log('='.repeat(80));
  console.log('⚠️  PREVIEW MODE - No changes have been saved to the database');
  console.log('To apply changes, modify this script to uncomment the update section');
  console.log('='.repeat(80));
  
  // Save preview to file for review
  const previewReport = {
    timestamp: new Date().toISOString(),
    total: bookshops.length,
    stats: {
      avgOriginalLength: stats.avgOriginalLength,
      avgNewLength: stats.avgNewLength,
      reduction: Math.round((1 - stats.avgNewLength / stats.avgOriginalLength) * 100),
      inTargetRange: stats.inTargetRange,
      tooShort: stats.tooShort,
      tooLong: stats.tooLong
    },
    previews: previews.map(p => ({
      id: p.id,
      name: p.name,
      city: p.city,
      state: p.state,
      originalLength: p.originalLength,
      newLength: p.newLength,
      inTargetRange: p.inTargetRange,
      hasRequiredElements: p.hasRequiredElements,
      original: bookshops.find(b => b.id === p.id)?.ai_generated_description || '',
      condensed: p.condensed
    }))
  };
  
  const filename = `condense-preview-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(previewReport, null, 2));
  console.log(`\n📄 Preview saved to: ${filename}`);
  console.log(`   Review the file to see all condensed descriptions before applying changes.`);
  
  /* UNCOMMENT THIS SECTION TO ACTUALLY UPDATE THE DATABASE
  
  console.log('\n🔄 Starting database updates...\n');
  
  for (let i = 0; i < bookshops.length; i++) {
    const bookshop = bookshops[i];
    const condensed = condenseDescription(bookshop.ai_generated_description, bookshop.name);
    
    const { error: updateError } = await supabase
      .from('bookstores')
      .update({
        ai_generated_description: condensed,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookshop.id);
    
    if (updateError) {
      stats.errors++;
      console.error(`❌ [${i + 1}/${bookshops.length}] ${bookshop.name}: ${updateError.message}`);
    } else {
      stats.success++;
      if ((i + 1) % 100 === 0) {
        console.log(`✅ Progress: ${i + 1}/${bookshops.length}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(80));
  console.log(`✅ Success: ${stats.success}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log(`📉 Average length reduction: ${stats.avgOriginalLength} → ${stats.avgNewLength} chars`);
  console.log('='.repeat(80));
  
  */
}

condenseAllDescriptions().catch(console.error);

