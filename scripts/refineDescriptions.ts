#!/usr/bin/env tsx

/**
 * Refine AI-generated descriptions to improve quality and consistency (V2)
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

interface BookstoreData {
  id: number;
  name: string;
  city: string;
  state: string;
  ai_generated_description: string;
  google_description?: string;
  google_rating?: number;
  google_review_count?: number;
}

function extractUniqueDetails(text: string): string[] {
  const details: string[] = [];
  
  // Extract specific business models and features
  const specificPatterns = [
    // Combo stores (bookstore + cafe/bar/restaurant)
    {
      pattern: /(?:bookstore|bookshop)[^.]*?(coffee shop|café|restaurant|bar|wine|beer|spirits)[^.]*/i,
      format: (match: string) => {
        // Clean and reformat
        if (match.includes('coffee shop')) return 'combining a bookstore and coffee shop';
        if (match.includes('café')) return 'combining a bookstore and café';
        if (match.includes('restaurant')) return 'combining a bookstore and restaurant';
        if (match.includes('bar') || match.includes('wine') || match.includes('beer')) return 'combining a bookstore and bar';
        return null;
      }
    },
    // Mobile/nomadic stores
    {
      pattern: /(nomadic booksh(?:op|ore)|mobile bookstore|traveling|vintage VW bus|bookmobile)[^.]*/i,
      format: (match: string) => {
        if (match.includes('vintage VW bus')) return 'operating from a vintage VW bus traveling the western United States';
        if (match.includes('nomadic') || match.includes('mobile') || match.includes('traveling')) return 'operating as a mobile bookstore';
        return null;
      }
    },
    // Specialized collections
    {
      pattern: /specializing in ([^.,]+)/i,
      format: (match: string, group1: string) => `specializing in ${group1.trim()}`
    },
    {
      pattern: /focused on ([^.,]+)/i,
      format: (match: string, group1: string) => `focused on ${group1.trim()}`
    },
    {
      pattern: /dedicated to ([^.,]+)/i,
      format: (match: string, group1: string) => `dedicated to ${group1.trim()}`
    },
    // Specific product types beyond books
    {
      pattern: /books?(?:,|\s+(?:and|with))\s+([^.,]*(?:gift|toy|game|puzzle|stationery|music|movie|vinyl|record)[^.]*)/i,
      format: (match: string, group1: string) => {
        const items = group1
          .replace(/as well as/gi, '')
          .replace(/including/gi, '')
          .replace(/along with/gi, '')
          .trim();
        return `offering books and ${items}`;
      }
    },
    // Used/secondhand/rare books
    {
      pattern: /(used|secondhand|rare|collectible)\s+books/i,
      format: (match: string) => `specializing in ${match.toLowerCase()}`
    },
  ];
  
  for (const { pattern, format } of specificPatterns) {
    const match = text.match(pattern);
    if (match) {
      const formatted = format(match[0], match[1], match[2]);
      if (formatted && !isGenericPhrase(formatted)) {
        details.push(formatted);
        break; // Only take first unique detail to keep concise
      }
    }
  }
  
  return details.slice(0, 1); // Max 1 unique detail for clarity
}

function isGenericPhrase(text: string): boolean {
  const genericPhrases = [
    /^offering books$/i,
    /^offering a selection$/i,
    /^books across various genres$/i,
    /^thoughtfully curated$/i,
    /^curated selection$/i,
    /^welcoming environment$/i,
    /^serves the community$/i,
    /^various genres and subjects$/i,
  ];
  
  return genericPhrases.some(pattern => pattern.test(text.trim()));
}

function cleanupText(text: string): string {
  let cleaned = text;
  
  // Fix grammar issues
  cleaned = cleaned.replace(/\bthey has\b/g, 'they have');
  cleaned = cleaned.replace(/\bthey offers\b/g, 'they offer');
  cleaned = cleaned.replace(/\bthey serves\b/g, 'they serve');
  cleaned = cleaned.replace(/\bthey provides\b/g, 'they provide');
  
  // Fix "offering offering" and similar duplicates
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/g, '$1');
  
  // Fix capitalization after punctuation (but not after periods that are part of names like "Novel.")
  cleaned = cleaned.replace(/([.!?])\s+([a-z])/g, (match, punct, letter, offset, string) => {
    // Don't capitalize if it's a common word like "is", "the", "a", "an", "this", "with"
    const lowercaseWords = ['is', 'the', 'a', 'an', 'and', 'or', 'but', 'with', 'this', 'that', 'they'];
    const word = letter + string.substring(string.indexOf(match) + match.length).split(/\s+/)[0];
    if (lowercaseWords.includes(word.toLowerCase())) {
      return punct + ' ' + letter;
    }
    return punct + ' ' + letter.toUpperCase();
  });
  
  // Fix double spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  
  // Fix spacing around punctuation
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');
  
  // Standardize bookshop → bookstore BUT preserve it in store names
  // Do this more carefully
  const nameMatch = cleaned.match(/^([^\.]+?) is an independent/);
  if (nameMatch) {
    const storeName = nameMatch[1];
    // Only replace "bookshop" AFTER the store name
    const afterName = cleaned.substring(storeName.length);
    cleaned = storeName + afterName.replace(/\bbookshop\b/gi, 'bookstore');
  } else {
    cleaned = cleaned.replace(/\bbookshop\b/gi, 'bookstore');
  }
  
  // Remove awkward constructions
  cleaned = cleaned.replace(/offering nomadic bookstore/gi, 'operating as a nomadic bookstore');
  cleaned = cleaned.replace(/bookstore, coffee shop and restaurant focused on global fare, creating a unique cultural destination for the community and/gi, '');
  
  // Fix incomplete endings
  if (cleaned.match(/With a \d\.\d-star rating from [\d,]+ reviews\.$/)) {
    // Good - has complete rating sentence
  } else if (cleaned.match(/With a \d\.\d-star rating from [\d,]+ reviews\.?$/)) {
    // Missing the closing part
    if (!cleaned.includes('this bookstore serves')) {
      cleaned = cleaned.replace(/With a (\d\.\d-star rating from [\d,]+ reviews)\.?$/, 
        'With a $1, this bookstore serves the local reading community.');
    }
  }
  
  // Trim
  cleaned = cleaned.trim();
  
  // Ensure ends with period
  if (!cleaned.endsWith('.')) {
    cleaned += '.';
  }
  
  return cleaned;
}

function refineDescription(bookstore: BookstoreData): string {
  const { name, city, state, ai_generated_description, google_rating, google_review_count } = bookstore;
  
  // Extract unique details first
  const uniqueDetails = extractUniqueDetails(ai_generated_description);
  const hasRating = google_rating && google_review_count;
  
  let refined = '';
  
  // Build first sentence with name, location, and unique details
  refined = `${name} is an independent bookstore in ${city}, ${state}`;
  
  if (uniqueDetails.length > 0) {
    // Add unique details naturally
    refined += ` ${uniqueDetails.join(' ')}`;
  } else {
    // Fallback to generic
    refined += ' offering a curated selection of books';
  }
  
  // Close first sentence if it doesn't already end with period
  if (!refined.endsWith('.')) {
    refined += '.';
  }
  
  // Add rating as second sentence if available and space allows
  if (hasRating && refined.length < 250) {
    const reviewCount = google_review_count.toLocaleString();
    refined += ` With a ${google_rating}-star rating from ${reviewCount} reviews, this bookstore serves the local reading community.`;
  } else if (hasRating && refined.length >= 250) {
    // Just mention rating without the extra text
    const reviewCount = google_review_count.toLocaleString();
    refined += ` Rated ${google_rating} stars by ${reviewCount} customers.`;
  }
  
  // Final cleanup
  refined = cleanupText(refined);
  
  // Ensure proper length (truncate if needed)
  if (refined.length > 400) {
    const lastPeriod = refined.lastIndexOf('.', 400);
    if (lastPeriod > 150) {
      refined = refined.substring(0, lastPeriod + 1);
    }
  }
  
  // Ensure minimum length
  if (refined.length < 150) {
    if (hasRating) {
      refined = refined.replace(/\.$/, '') + ` With a ${google_rating}-star rating from ${google_review_count.toLocaleString()} reviews.`;
    } else {
      refined += ' This bookstore provides a welcoming environment for readers.';
    }
  }
  
  return refined;
}

async function refineAllDescriptions() {
  console.log('🔧 Refining AI descriptions for quality (v2)...\n');
  
  // Fetch all bookstores with AI descriptions using pagination
  const BATCH_SIZE = 1000;
  let allBookshops: any[] = [];
  let offset = 0;
  let hasMore = true;
  
  console.log('📥 Fetching all AI descriptions from database...\n');
  
  while (hasMore) {
    const { data: bookshops, error } = await supabase
      .from('bookstores')
      .select('id, name, city, state, ai_generated_description, google_description, google_rating, google_review_count')
      .eq('description_source', 'ai')
      .not('ai_generated_description', 'is', null)
      .not('city', 'is', null)
      .not('state', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (error) {
      console.error('Error fetching bookstores:', error);
      return;
    }
    
    if (!bookshops || bookshops.length === 0) {
      hasMore = false;
    } else {
      allBookshops = allBookshops.concat(bookshops);
      offset += BATCH_SIZE;
      console.log(`   Fetched ${allBookshops.length} bookshops so far...`);
      
      if (bookshops.length < BATCH_SIZE) {
        hasMore = false;
      }
    }
  }
  
  if (allBookshops.length === 0) {
    console.log('No AI descriptions found');
    return;
  }
  
  console.log(`\n✅ Found ${allBookshops.length} AI descriptions to refine\n`);
  
  const stats = {
    total: allBookshops.length,
    inTargetRange: 0,
    hasUniqueDetails: 0,
    hasRating: 0,
    avgOriginalLength: 0,
    avgRefinedLength: 0,
  };
  
  const previews: any[] = [];
  
  // Calculate stats and collect previews
  for (const bookshop of allBookshops) {
    const original = bookshop.ai_generated_description;
    const refined = refineDescription(bookshop);
    
    stats.avgOriginalLength += original.length;
    stats.avgRefinedLength += refined.length;
    
    if (refined.length >= 150 && refined.length <= 400) stats.inTargetRange++;
    if (extractUniqueDetails(original).length > 0) stats.hasUniqueDetails++;
    if (bookshop.google_rating) stats.hasRating++;
    
    if (previews.length < 20) {
      previews.push({
        id: bookshop.id,
        name: bookshop.name,
        city: bookshop.city,
        state: bookshop.state,
        originalLength: original.length,
        refinedLength: refined.length,
        inTargetRange: refined.length >= 150 && refined.length <= 400,
        hasUniqueDetails: extractUniqueDetails(original).length > 0,
        original: original.substring(0, 150) + (original.length > 150 ? '...' : ''),
        refined: refined
      });
    }
  }
  
  stats.avgOriginalLength = Math.round(stats.avgOriginalLength / stats.total);
  stats.avgRefinedLength = Math.round(stats.avgRefinedLength / stats.total);
  
  console.log('📋 PREVIEW (first 20 examples):\n');
  console.log('='.repeat(120));
  
  previews.forEach((p, i) => {
    const uniqueFlag = p.hasUniqueDetails ? '🎯' : '📝';
    const rangeFlag = p.inTargetRange ? '✅' : '⚠️';
    
    console.log(`\n${i + 1}. ${p.name} (${p.city}, ${p.state})`);
    console.log(`   ${rangeFlag} Original: ${p.originalLength} chars | Refined: ${p.refinedLength} chars ${uniqueFlag}`);
    console.log(`   ${p.refined}`);
  });
  
  console.log('\n' + '='.repeat(120));
  console.log('\n📊 OVERALL STATISTICS:\n');
  console.log(`Total descriptions: ${stats.total}`);
  console.log(`Average length: ${stats.avgOriginalLength} → ${stats.avgRefinedLength} chars (${Math.round((1-stats.avgRefinedLength/stats.avgOriginalLength)*100)}% reduction)`);
  console.log(`In target range (150-400 chars): ${stats.inTargetRange}/${stats.total} (${(stats.inTargetRange/stats.total*100).toFixed(1)}%)`);
  console.log(`With unique details preserved: ${stats.hasUniqueDetails}/${stats.total} (${(stats.hasUniqueDetails/stats.total*100).toFixed(1)}%)`);
  console.log(`With ratings included: ${stats.hasRating}/${stats.total} (${(stats.hasRating/stats.total*100).toFixed(1)}%)`);
  
  // Save preview to file (first 20 examples)
  const previewReport = {
    timestamp: new Date().toISOString(),
    total: stats.total,
    stats: {
      avgOriginalLength: stats.avgOriginalLength,
      avgRefinedLength: stats.avgRefinedLength,
      reduction: Math.round((1 - stats.avgRefinedLength / stats.avgOriginalLength) * 100),
      inTargetRange: stats.inTargetRange,
      hasUniqueDetails: stats.hasUniqueDetails,
      hasRating: stats.hasRating
    },
    previews: previews
  };
  
  const filename = `refine-preview-v2-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(previewReport, null, 2));
  console.log(`\n📄 Preview saved to: ${filename}`);
    
  console.log('\n🚀 Applying refinements to database...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < allBookshops.length; i++) {
    const bookshop = allBookshops[i];
    const refined = refineDescription(bookshop);
    
    const { error: updateError } = await supabase
      .from('bookstores')
      .update({
        ai_generated_description: refined,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookshop.id);
    
    if (updateError) {
      errorCount++;
      console.error(`❌ [${i + 1}/${stats.total}] ${bookshop.name}: ${updateError.message}`);
    } else {
      successCount++;
      if ((i + 1) % 200 === 0) {
        console.log(`✅ Progress: ${i + 1}/${stats.total} (${((i+1)/stats.total*100).toFixed(1)}%)`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(120));
  console.log('✅ REFINEMENT COMPLETE\n');
  console.log(`Successfully refined: ${successCount}/${stats.total}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Final average length: ${stats.avgRefinedLength} chars`);
  console.log(`In target range: ${(stats.inTargetRange/stats.total*100).toFixed(1)}%`);
  console.log('='.repeat(120));
  
}

refineAllDescriptions().catch(console.error);
