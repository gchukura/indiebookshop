#!/usr/bin/env tsx

/**
 * Generate template-based descriptions for failed bookshops
 * This is a fallback for bookshops that failed AI generation validation
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

interface BookstoreData {
  name: string;
  city: string;
  state: string;
  google_rating?: number;
  google_review_count?: number;
  google_description?: string;
}

/**
 * Generate template-based description
 */
export function generateTemplateDescription(bookstore: BookstoreData): string {
  const { name, city, state, google_rating, google_review_count } = bookstore;
  
  // Template variations for natural language diversity
  const templates = [
    {
      // High-rated with many reviews
      condition: (rating?: number, reviews?: number) => 
        rating && rating >= 4.5 && reviews && reviews >= 50,
      generate: (data: BookstoreData) => 
        `${data.name} is a highly-rated independent bookstore in ${data.city}, ${data.state}, with a ${data.google_rating}-star rating from ${data.google_review_count} Google reviews. This community bookshop offers a curated selection and welcoming atmosphere for readers.`
    },
    {
      // Good rating with moderate reviews
      condition: (rating?: number, reviews?: number) => 
        rating && rating >= 4.0 && reviews && reviews >= 10,
      generate: (data: BookstoreData) => 
        `${data.name} serves the ${data.city}, ${data.state} community as an independent bookstore with a ${data.google_rating}-star rating from ${data.google_review_count} customers. This locally-owned bookshop provides a personalized experience and carefully selected books.`
    },
    {
      // Has rating but few/no reviews
      condition: (rating?: number) => rating && rating >= 4.0,
      generate: (data: BookstoreData) => 
        `Located in ${data.city}, ${data.state}, ${data.name} is a community-focused independent bookstore with a ${data.google_rating}-star customer rating. This local bookshop offers a thoughtfully curated selection for readers of all ages.`
    },
    {
      // No rating data - minimal but professional
      condition: () => true,
      generate: (data: BookstoreData) => 
        `${data.name} is an independent bookstore serving ${data.city}, ${data.state}. As a locally-owned bookshop, they offer a personalized selection and welcoming environment for readers.`
    }
  ];
  
  // Find first matching template
  const template = templates.find(t => 
    t.condition(google_rating, google_review_count)
  ) || templates[templates.length - 1];
  
  return template.generate(bookstore);
}

/**
 * Validate template description
 */
export function validateTemplateDescription(description: string, bookstore: BookstoreData): boolean {
  const checks = [
    description.includes(bookstore.name),
    description.includes(bookstore.city),
    description.includes(bookstore.state),
    description.length >= 100 && description.length <= 400,
    !description.includes('undefined'),
    !description.includes('null'),
    description.split(' ').length >= 15, // At least 15 words
  ];
  
  return checks.every(check => check === true);
}

/**
 * Save template description to database
 */
async function saveTemplateDescription(bookshopId: number, description: string) {
  const now = new Date().toISOString();
  
  try {
    // Try RPC function first
    const { error: rpcError } = await supabase.rpc('update_ai_description', {
      p_bookshop_id: bookshopId,
      p_description: description,
      p_generated_at: now,
      p_validated: true // Template descriptions are pre-validated
    });
    
    if (!rpcError) {
      return { success: true, method: 'RPC' };
    }
    
    // Fallback to direct REST API
    const { error: restError } = await supabase
      .from('bookstores')
      .update({
        ai_generated_description: description,
        description_generated_at: now,
        description_validated: true
      })
      .eq('id', bookshopId);
    
    if (restError) {
      return { success: false, error: restError.message };
    }
    
    return { success: true, method: 'REST' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Process failed bookshops with template descriptions
 */
async function processFailedBookshops() {
  // Read error log
  const errorLogPath = 'generation-errors-2025-12-30T15-54-22-081Z.json';
  if (!fs.existsSync(errorLogPath)) {
    console.error(`Error log not found: ${errorLogPath}`);
    process.exit(1);
  }
  
  const errorLogContent = fs.readFileSync(errorLogPath, 'utf-8');
  const errorLog = JSON.parse(errorLogContent);
  
  const failedIds = errorLog.errors.map((e: any) => e.id);
  console.log(`Processing ${failedIds.length} failed bookshops with template descriptions...\n`);
  
  const stats = {
    total: failedIds.length,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0
  };
  
  const errors: Array<{ bookshop: string; id: number; error: string }> = [];
  
  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < failedIds.length; i += batchSize) {
    const batch = failedIds.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} bookshops)...`);
    
    // Fetch bookshop data
    const { data: bookshops, error: fetchError } = await supabase
      .from('bookstores')
      .select('id, name, city, state, google_rating, google_review_count, google_description, ai_generated_description')
      .in('id', batch)
      .eq('live', true);
    
    if (fetchError) {
      console.error(`Error fetching batch: ${fetchError.message}`);
      continue;
    }
    
    if (!bookshops) continue;
    
    for (const bookshop of bookshops) {
      stats.processed++;
      
      // Skip if already has description
      if (bookshop.ai_generated_description) {
        stats.skipped++;
        console.log(`[${bookshop.id}] ✓ Already has description, skipping`);
        continue;
      }
      
      // Skip if missing required data
      if (!bookshop.name || !bookshop.city || !bookshop.state) {
        stats.failed++;
        errors.push({
          id: bookshop.id,
          bookshop: bookshop.name || 'Unknown',
          error: 'Missing required data (name, city, or state)'
        });
        console.log(`[${bookshop.id}] ✗ Missing required data`);
        continue;
      }
      
      // Prepare data
      const bookstoreData: BookstoreData = {
        name: bookshop.name,
        city: bookshop.city,
        state: bookshop.state,
        google_rating: bookshop.google_rating ? parseFloat(bookshop.google_rating) : undefined,
        google_review_count: bookshop.google_review_count || undefined,
        google_description: bookshop.google_description || undefined
      };
      
      // Generate template description
      const description = generateTemplateDescription(bookstoreData);
      
      // Validate
      if (!validateTemplateDescription(description, bookstoreData)) {
        stats.failed++;
        errors.push({
          id: bookshop.id,
          bookshop: bookshop.name,
          error: 'Template validation failed'
        });
        console.log(`[${bookshop.id}] ✗ Validation failed`);
        continue;
      }
      
      // Save to database
      const result = await saveTemplateDescription(bookshop.id, description);
      
      if (result.success) {
        stats.successful++;
        console.log(`[${bookshop.id}] ✓ Generated and saved template description`);
      } else {
        stats.failed++;
        errors.push({
          id: bookshop.id,
          bookshop: bookshop.name,
          error: result.error || 'Unknown error'
        });
        console.log(`[${bookshop.id}] ✗ Save failed: ${result.error}`);
      }
    }
    
    // Small delay between batches
    if (i + batchSize < failedIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEMPLATE DESCRIPTION GENERATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total failed bookshops: ${stats.total}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Successful: ${stats.successful} (${(stats.successful / stats.total * 100).toFixed(1)}%)`);
  console.log(`Skipped (already had description): ${stats.skipped}`);
  console.log(`Failed: ${stats.failed} (${(stats.failed / stats.total * 100).toFixed(1)}%)`);
  console.log('='.repeat(60));
  
  if (errors.length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const errorLogPath = `template-errors-${timestamp}.json`;
    fs.writeFileSync(errorLogPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalErrors: errors.length,
      errors: errors
    }, null, 2));
    console.log(`\nError log saved: ${errorLogPath}`);
  }
}

// Run the script
processFailedBookshops().catch(console.error);

