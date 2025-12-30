#!/usr/bin/env tsx

/**
 * AI-Generated Bookshop Descriptions Script
 * 
 * This script generates 300-word descriptions for bookshops using ONLY verified data
 * from the database and Google Places API. No hallucinations, no assumptions.
 * 
 * Usage:
 *   tsx scripts/generate-bookshop-descriptions.ts [--sample=10] [--batch-size=100] [--delay=2000]
 * 
 * Environment Variables Required:
 *   - ANTHROPIC_API_KEY: Your Anthropic API key for Claude
 *   - SUPABASE_URL: Your Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY environment variable is required');
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

interface VerifiedBookshopData {
  name: string;
  city: string;
  state: string;
  googleDescription: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  features: string[];
  hasWebsite: boolean;
  hasPhone: boolean;
  website: string | null;
  phone: string | null;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  wordCount: number;
}

/**
 * Get verified data for a bookshop
 */
async function getVerifiedBookshopData(bookshopId: number): Promise<VerifiedBookshopData | null> {
  try {
    // Get base data from Supabase
    const { data: bookshop, error: bookshopError } = await supabase
      .from('bookstores')
      .select('*')
      .eq('id', bookshopId)
      .single();

    if (bookshopError || !bookshop) {
      console.error(`Error fetching bookshop ${bookshopId}:`, bookshopError);
      return null;
    }

    // Get feature names if feature_ids exist
    let featureNames: string[] = [];
    if (bookshop.feature_ids && Array.isArray(bookshop.feature_ids) && bookshop.feature_ids.length > 0) {
      const { data: features, error: featuresError } = await supabase
        .from('features')
        .select('id, name')
        .in('id', bookshop.feature_ids);

      if (!featuresError && features) {
        featureNames = features.map(f => f.name);
      }
    }

    // Parse Google rating (stored as text)
    const googleRating = bookshop.google_rating ? parseFloat(bookshop.google_rating) : null;

    // Compile ONLY verified, factual data
    const verifiedData: VerifiedBookshopData = {
      name: bookshop.name,
      city: bookshop.city,
      state: bookshop.state,
      googleDescription: bookshop.google_description || null,
      googleRating: googleRating,
      googleReviewCount: bookshop.google_review_count || null,
      features: featureNames,
      hasWebsite: !!bookshop.website,
      hasPhone: !!bookshop.phone,
      website: bookshop.website || null,
      phone: bookshop.phone || null,
    };

    return verifiedData;
  } catch (error) {
    console.error(`Error getting verified data for bookshop ${bookshopId}:`, error);
    return null;
  }
}

/**
 * Build the prompt for Claude API
 */
function buildDescriptionPrompt(verifiedData: VerifiedBookshopData): string {
  // Build verified data section with only non-empty fields
  const dataLines: string[] = [
    `Name: ${verifiedData.name}`,
    `Location: ${verifiedData.city}, ${verifiedData.state}`
  ];

  if (verifiedData.googleDescription) {
    dataLines.push(`Google Description: ${verifiedData.googleDescription}`);
  }

  if (verifiedData.googleRating) {
    if (verifiedData.googleReviewCount) {
      dataLines.push(`Rating: ${verifiedData.googleRating} stars from ${verifiedData.googleReviewCount} reviews`);
    } else {
      dataLines.push(`Rating: ${verifiedData.googleRating} stars`);
    }
  }

  if (verifiedData.features.length > 0) {
    dataLines.push(`Features: ${verifiedData.features.join(', ')}`);
  }

  if (verifiedData.hasWebsite) {
    dataLines.push('Has website: Yes');
  }

  const verifiedDataSection = dataLines.join('\n');

  // Build call to action instructions
  const callToActionLines: string[] = ['- Encourage visiting'];
  if (verifiedData.googleRating && verifiedData.googleRating >= 4.5) {
    callToActionLines.push('- Mention the high rating as validation');
  }
  if (verifiedData.hasWebsite) {
    callToActionLines.push('- Suggest visiting their website');
  } else {
    callToActionLines.push('- Suggest stopping by');
  }

  return `You are writing a description for an independent bookshop directory. Write a warm, inviting 300-word description using ONLY the verified information provided below.

CRITICAL RULES:
- Use ONLY facts explicitly stated in the data below
- Do NOT add any details not in the data (dates, owner names, history, etc.)
- Do NOT make assumptions or inferences
- Do NOT use superlatives unless data supports them (e.g., don't say "best" without evidence)
- If a piece of information is null or missing, do not mention it
- Keep tone warm and inviting but strictly factual

VERIFIED DATA:
${verifiedDataSection}

REQUIRED STRUCTURE:

Paragraph 1 (80-100 words): Introduction
- Introduce the bookshop and its location
- If Google description exists, incorporate key points from it
- Mention what makes it notable (based on features or rating)

Paragraph 2 (80-100 words): What They Offer
- Describe the types of books/services based on features
- Use phrases like "specializes in", "offers", "known for"
- Only mention features that are in the data

Paragraph 3 (70-90 words): Experience & Community
- Describe the atmosphere (if features indicate "cozy", "modern", etc.)
- Mention community aspects if relevant features exist
- Talk about the value to the local community

Paragraph 4 (50-70 words): Call to Action
${callToActionLines.join('\n')}

OUTPUT FORMAT:
Return ONLY the description text, no preamble, no explanation, no JSON. Just the 300-word description.`;
}

/**
 * Validate the generated description
 */
function validateDescription(description: string, verifiedData: VerifiedBookshopData): ValidationResult {
  const issues: string[] = [];

  // Check 1: Word count in range
  const wordCount = description.split(/\s+/).length;
  if (wordCount < 250 || wordCount > 350) {
    issues.push(`Word count out of range: ${wordCount} (expected 250-350)`);
  }

  // Check 2: No year mentions (unless we add verified founding year later)
  if (/\b(19|20)\d{2}\b/.test(description)) {
    issues.push('Contains year/date not in verified data');
  }

  // Check 3: No founder/owner names (we don't have this data)
  if (/founded by|owned by|started by/i.test(description)) {
    issues.push('Contains ownership claims not in verified data');
  }

  // Check 4: No specific inventory claims
  if (/\d+\s+(books|volumes|titles)/i.test(description)) {
    issues.push('Contains specific inventory claim not in verified data');
  }

  // Check 5: No award/media mentions
  if (/award|featured in|winner|nominated|recognized by/i.test(description)) {
    issues.push('Contains award/media claims not in verified data');
  }

  // Check 6: No unsupported superlatives
  const superlatives = ['the best', 'the largest', 'the oldest', 'the only', 'the first'];
  superlatives.forEach(phrase => {
    if (description.toLowerCase().includes(phrase)) {
      issues.push(`Unsupported superlative: "${phrase}"`);
    }
  });

  // Check 7: Bookshop name appears
  if (!description.includes(verifiedData.name)) {
    issues.push('Bookshop name not mentioned in description');
  }

  // Check 8: Location appears
  if (!description.includes(verifiedData.city) || !description.includes(verifiedData.state)) {
    issues.push('City or state not mentioned in description');
  }

  return {
    isValid: issues.length === 0,
    issues: issues,
    wordCount: wordCount
  };
}

/**
 * Generate description for a single bookshop
 */
async function generateBookshopDescription(bookshopId: number): Promise<string | null> {
  try {
    // Step 1: Get verified data
    const verifiedData = await getVerifiedBookshopData(bookshopId);
    
    if (!verifiedData) {
      console.error(`Could not get verified data for bookshop ${bookshopId}`);
      return null;
    }

    // Step 2: Build prompt
    const prompt = buildDescriptionPrompt(verifiedData);

    // Step 3: Call Claude API
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set');
      return null;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        // Note: Verify this model name is available in your Anthropic account
        // Common models: "claude-3-5-sonnet-20241022", "claude-3-opus-20240229", etc.
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed with status ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error(`Unexpected API response structure:`, JSON.stringify(data, null, 2));
      return null;
    }
    
    const description = data.content[0].text;

    // Step 4: Validate the output
    const validation = validateDescription(description, verifiedData);

    if (!validation.isValid) {
      console.error(`Validation failed for ${verifiedData.name}:`, validation.issues);
      return null; // Don't save invalid descriptions
    }

    // Step 5: Save to database
    // Try using REST API directly to avoid geography trigger issues
    let updateError: any = null;
    
    // First try the RPC function
    let rpcError: any = null;
    try {
      const result = await supabase.rpc('update_ai_description', {
        p_bookshop_id: bookshopId,
        p_description: description,
        p_generated_at: new Date().toISOString()
      });
      rpcError = result.error;
    } catch (err: any) {
      rpcError = err;
    }

    if (rpcError) {
      // If RPC fails (especially with geography error), try REST API PATCH directly
      if (rpcError.code === '42704' || rpcError.message?.includes('geography')) {
        console.log(`  ℹ️  Using REST API workaround for geography issue...`);
        
        // Use REST API directly with PATCH
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/bookstores?id=eq.${bookshopId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE_KEY!,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              ai_generated_description: description,
              description_generated_at: new Date().toISOString()
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          updateError = { message: `REST API error: ${response.status} ${errorText}`, code: response.status.toString() };
        }
      } else if (rpcError.message?.includes('function') || rpcError.code === '42883') {
        // Function doesn't exist, try direct update
        console.log(`  ℹ️  SQL function not found, using direct update...`);
        const { error: directError } = await supabase
          .from('bookstores')
          .update({
            ai_generated_description: description,
            description_generated_at: new Date().toISOString()
          })
          .eq('id', bookshopId)
          .select('id')
          .single();
        
        updateError = directError;
      } else {
        updateError = rpcError;
      }
    }

    if (updateError) {
      // If it's a geography error, the columns might not exist yet or there's a trigger issue
      if (updateError.message?.includes('geography')) {
        console.warn(`  ⚠️  Geography type error for ${verifiedData.name}`);
        console.warn(`      This usually means: 1) Migration not run, or 2) PostGIS trigger issue`);
        console.warn(`      Description was generated successfully but not saved to database.`);
        console.warn(`      Please run: migrations/add-ai-description-columns.sql`);
        // Still return the description so it can be reviewed
        return description;
      }
      
      // If columns don't exist
      if (updateError.message?.includes('column') && updateError.message?.includes('does not exist')) {
        console.error(`  ❌ Database columns not found. Please run migration: migrations/add-ai-description-columns.sql`);
        return description; // Return description for review
      }
      
      console.error(`Error saving description for ${verifiedData.name}:`, updateError);
      return null;
    }

    console.log(`✓ Generated description for: ${verifiedData.name} (${validation.wordCount} words)`);
    return description;

  } catch (error) {
    console.error(`Error generating description for bookshop ${bookshopId}:`, error);
    return null;
  }
}

/**
 * Generate sample descriptions for manual review
 */
async function generateReviewSample(count: number = 10): Promise<void> {
  console.log(`Generating ${count} sample descriptions for manual review...\n`);

  // Get random bookshops
  const { data: bookshops, error } = await supabase
    .from('bookstores')
    .select('id, name')
    .eq('live', true)
    .limit(count);

  if (error || !bookshops) {
    console.error('Error fetching bookshops:', error);
    return;
  }

  const samples: any[] = [];

  for (const bookshop of bookshops) {
    console.log(`Processing: ${bookshop.name}...`);
    
    const verifiedData = await getVerifiedBookshopData(bookshop.id);
    if (!verifiedData) {
      console.error(`  ⚠️  Could not get verified data`);
      continue;
    }

    const description = await generateBookshopDescription(bookshop.id);

    if (description) {
      const validation = validateDescription(description, verifiedData);
      samples.push({
        bookshop: bookshop.name,
        bookshopId: bookshop.id,
        verifiedData: verifiedData,
        generatedDescription: description,
        validation: validation
      });
    }

    // Rate limiting: wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Save to file for review
  const outputPath = path.join(process.cwd(), 'description-samples.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(samples, null, 2)
  );

  console.log(`\n✓ Sample descriptions saved to ${outputPath}`);
  console.log(`\nPlease review these ${samples.length} samples manually before running batch generation.`);
}

/**
 * Batch generate descriptions for all bookshops
 */
async function batchGenerateDescriptions(options: {
  batchSize?: number;
  delayMs?: number;
} = {}): Promise<void> {
  const { batchSize = 100, delayMs = 2000 } = options;

  console.log('Starting batch description generation...\n');

  // Get all bookshops that don't have AI descriptions yet
  const { data: bookshops, error } = await supabase
    .from('bookstores')
    .select('id, name')
    .eq('live', true)
    .is('ai_generated_description', null)
    .order('id')
    .limit(batchSize);

  if (error) {
    console.error('Error fetching bookshops:', error);
    return;
  }

  if (!bookshops || bookshops.length === 0) {
    console.log('✅ No bookshops without descriptions found!');
    return;
  }

  console.log(`Found ${bookshops.length} bookshops without descriptions\n`);

  let successCount = 0;
  let failCount = 0;
  const failedBookshops: Array<{ id: number; name: string }> = [];

  // Process in small batches to avoid rate limits
  for (let i = 0; i < bookshops.length; i++) {
    const bookshop = bookshops[i];

    console.log(`[${i + 1}/${bookshops.length}] Processing: ${bookshop.name}`);

    const description = await generateBookshopDescription(bookshop.id);

    if (description) {
      successCount++;
    } else {
      failCount++;
      failedBookshops.push(bookshop);
    }

    // Rate limiting: wait between requests (except for the last one)
    if (i < bookshops.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Progress update every 50
    if ((i + 1) % 50 === 0) {
      console.log(`\nProgress: ${i + 1}/${bookshops.length}`);
      console.log(`Success: ${successCount}, Failed: ${failCount}\n`);
    }
  }

  // Final report
  console.log('\n=== GENERATION COMPLETE ===');
  console.log(`Total processed: ${bookshops.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  if (failedBookshops.length > 0) {
    console.log('\nFailed bookshops:');
    failedBookshops.forEach(b => console.log(`- ${b.name} (ID: ${b.id})`));
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const sampleArg = args.find(arg => arg.startsWith('--sample='));
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const delayArg = args.find(arg => arg.startsWith('--delay='));

const sampleCount = sampleArg ? parseInt(sampleArg.split('=')[1]) : null;
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;
const delayMs = delayArg ? parseInt(delayArg.split('=')[1]) : 2000;

// Run the appropriate function
if (sampleCount !== null) {
  generateReviewSample(sampleCount)
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
} else {
  batchGenerateDescriptions({ batchSize, delayMs })
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

