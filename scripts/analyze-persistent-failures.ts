#!/usr/bin/env tsx

/**
 * Analyze persistent failures using SQL queries
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runQuery(query: string, description: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(description);
  console.log('='.repeat(60));
  
  const { data, error } = await supabase.rpc('exec_sql', { query_text: query });
  
  if (error) {
    // Try direct query if RPC doesn't exist
    console.log('RPC not available, trying direct query...');
    // For direct queries, we'll need to use the REST API or parse the query
    // Let's use a simpler approach - execute via REST API
    return null;
  }
  
  return data;
}

async function analyzeFailures() {
  console.log('ANALYZING PERSISTENT FAILURES');
  console.log('='.repeat(60));
  
  // QUERY 1: Get failed bookshop details
  console.log('\nQUERY 1: Failed bookshop details (top 20 by review count)');
  console.log('-'.repeat(60));
  
  const { data: query1, error: error1 } = await supabase
    .from('bookstores')
    .select(`
      id,
      name,
      city,
      state,
      google_description,
      google_rating,
      google_review_count,
      google_reviews,
      business_status
    `)
    .eq('live', true)
    .is('ai_generated_description', null)
    .order('google_review_count', { ascending: false, nullsFirst: false })
    .limit(20);
  
  if (error1) {
    console.error('Error:', error1);
  } else if (query1) {
    console.log(`Found ${query1.length} failed bookshops (showing top 20)\n`);
    query1.forEach((b: any) => {
      const hasDesc = !!b.google_description;
      const descLength = b.google_description ? b.google_description.length : 0;
      const reviewCount = b.google_reviews ? b.google_reviews.length : 0;
      console.log(`${b.id}. ${b.name} (${b.city}, ${b.state})`);
      console.log(`   Google desc: ${hasDesc ? `Yes (${descLength} chars)` : 'No'}`);
      console.log(`   Rating: ${b.google_rating || 'N/A'} (${b.google_review_count || 0} reviews)`);
      console.log(`   Review array: ${reviewCount} reviews`);
      console.log(`   Status: ${b.business_status || 'N/A'}`);
      console.log('');
    });
  }
  
  // QUERY 2: Check data sparseness
  console.log('\nQUERY 2: Data sparseness analysis');
  console.log('-'.repeat(60));
  
  const { data: query2, error: error2 } = await supabase
    .from('bookstores')
    .select('google_description, google_rating, google_reviews')
    .eq('live', true)
    .is('ai_generated_description', null);
  
  if (error2) {
    console.error('Error:', error2);
  } else if (query2) {
    const total = query2.length;
    const noGoogleDesc = query2.filter((b: any) => !b.google_description).length;
    const noRating = query2.filter((b: any) => !b.google_rating).length;
    const noReviews = query2.filter((b: any) => 
      !b.google_reviews || b.google_reviews.length === 0
    ).length;
    const verySparse = query2.filter((b: any) => 
      !b.google_description && !b.google_rating
    ).length;
    
    console.log(`Total failed: ${total}`);
    console.log(`No Google description: ${noGoogleDesc} (${(noGoogleDesc/total*100).toFixed(1)}%)`);
    console.log(`No rating: ${noRating} (${(noRating/total*100).toFixed(1)}%)`);
    console.log(`No reviews: ${noReviews} (${(noReviews/total*100).toFixed(1)}%)`);
    console.log(`Very sparse (no desc + no rating): ${verySparse} (${(verySparse/total*100).toFixed(1)}%)`);
  }
  
  // QUERY 3: Geographic patterns
  console.log('\nQUERY 3: Geographic patterns (top 10 states)');
  console.log('-'.repeat(60));
  
  const { data: query3, error: error3 } = await supabase
    .from('bookstores')
    .select('state')
    .eq('live', true)
    .is('ai_generated_description', null);
  
  if (error3) {
    console.error('Error:', error3);
  } else if (query3) {
    const stateCounts: Record<string, number> = {};
    query3.forEach((b: any) => {
      const state = b.state || 'Unknown';
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    });
    
    const sorted = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const total = query3.length;
    console.log(`Total failed: ${total}\n`);
    sorted.forEach(([state, count]) => {
      const pct = (count / total * 100).toFixed(1);
      console.log(`${state}: ${count} (${pct}%)`);
    });
  }
  
  // QUERY 4: Business status
  console.log('\nQUERY 4: Business status analysis');
  console.log('-'.repeat(60));
  
  const { data: query4, error: error4 } = await supabase
    .from('bookstores')
    .select('business_status')
    .eq('live', true)
    .is('ai_generated_description', null);
  
  if (error4) {
    console.error('Error:', error4);
  } else if (query4) {
    const statusCounts: Record<string, number> = {};
    query4.forEach((b: any) => {
      const status = b.business_status || 'NULL/Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const sorted = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
    const total = query4.length;
    console.log(`Total failed: ${total}\n`);
    sorted.forEach(([status, count]) => {
      const pct = (count / total * 100).toFixed(1);
      console.log(`${status}: ${count} (${pct}%)`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(60));
}

analyzeFailures().catch(console.error);

