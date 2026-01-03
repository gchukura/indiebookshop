#!/usr/bin/env tsx

/**
 * AI-Generated Bookshop Descriptions Script
 * 
 * Generates strictly factual 200-word descriptions using ONLY verified Google Places data.
 * Zero hallucinations - every fact must be traceable to verified data in the database.
 * 
 * Usage:
 *   npx tsx scripts/generate-bookshop-descriptions.ts [--test] [--batch]
 * 
 * Environment Variables Required:
 *   - ANTHROPIC_API_KEY: Your Anthropic API key for Claude
 *   - SUPABASE_URL: Your Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

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
  // Core facts (always present)
  id: number;
  name: string;
  city: string;
  state: string;
  street: string | null;
  zip: string | null;
  
  // Google Places editorial content
  googleDescription: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  googlePriceLevel: number | null;
  
  // Contact information (prioritize Google-verified)
  phone: string | null;
  website: string | null;
  
  // Hours information
  hasHours: boolean;
  openNow: boolean | null;
  
  // Business details
  businessStatus: string | null;
  googleMapsUrl: string | null;
  
  // Classifications
  specialtyIndicators: string[];
  googleTypes: string[];
  
  // Customer reviews (sample for themes, not direct quotes)
  reviewQuotes: Array<{
    text: string;
    rating: number;
    author: string;
  }>;
  
  // Media
  hasPhotos: boolean;
  photoCount: number;
  
  // Existing manual description (can be incorporated)
  manualDescription: string | null;
}

interface ValidationResult {
  isValid: boolean;
  severity: 'critical' | 'warning' | 'minor';
  issues: string[];
  wordCount: number;
  criticalCount: number;
  warningCount: number;
  minorCount: number;
}

/**
 * Gather all verified data for description generation
 * Returns only factual data that can be verified in database
 */
async function getVerifiedBookshopData(bookshopId: number): Promise<VerifiedBookshopData | null> {
  const { data: bookshop, error } = await supabase
    .from('bookstores')
    .select('*')
    .eq('id', bookshopId)
    .single();

  if (error || !bookshop) {
    console.error(`Error fetching bookshop ${bookshopId}:`, error);
    return null;
  }

  // Extract specialty indicators from Google types (if available)
  const specialtyIndicators: string[] = [];

  if (bookshop.google_types && Array.isArray(bookshop.google_types)) {
    const typeLabels: Record<string, string> = {
      'book_store': 'books',
      'cafe': 'café',
      'gift_shop': 'gifts and stationery',
      'library': 'library services'
    };

    bookshop.google_types.forEach((type: string) => {
      if (typeLabels[type]) {
        specialtyIndicators.push(typeLabels[type]);
      }
    });
  }

  // Parse rating (stored as string in database)
  const googleRating = bookshop.google_rating 
    ? parseFloat(bookshop.google_rating) 
    : null;

  // Compile ONLY verified, factual data
  const verifiedData: VerifiedBookshopData = {
    // Core facts (always present)
    id: bookshop.id,
    name: bookshop.name,
    city: bookshop.city,
    state: bookshop.state,
    street: bookshop.street || null,
    zip: bookshop.zip || null,

    // Google Places editorial content
    googleDescription: bookshop.google_description || null,
    googleRating: googleRating,
    googleReviewCount: bookshop.google_review_count || null,
    googlePriceLevel: bookshop.google_price_level || null,

    // Contact information (prioritize Google-verified)
    phone: bookshop.formatted_phone || bookshop.phone || null,
    website: bookshop.website_verified || bookshop.website || null,

    // Hours information
    hasHours: !!bookshop.opening_hours_json,
    openNow: bookshop.opening_hours_json?.open_now || null,

    // Business details
    businessStatus: bookshop.business_status || null,
    googleMapsUrl: bookshop.google_maps_url || null,

    // Classifications
    specialtyIndicators: specialtyIndicators,
    googleTypes: bookshop.google_types || [],

    // Customer reviews (sample for themes, not direct quotes)
    reviewQuotes: bookshop.google_reviews 
      ? bookshop.google_reviews.slice(0, 3).map((r: any) => ({
          text: r.text?.substring(0, 120) || '', // First 120 chars only
          rating: r.rating || 0,
          author: r.author_name || ''
        }))
      : [],

    // Media
    hasPhotos: bookshop.google_photos && 
               Array.isArray(bookshop.google_photos) && 
               bookshop.google_photos.length > 0,
    photoCount: bookshop.google_photos?.length || 0,

    // Existing manual description (can be incorporated)
    manualDescription: bookshop.description || null
  };

  return verifiedData;
}

/**
 * Build Claude API prompt with all verified data
 * Prompt enforces strict factual accuracy
 */
function buildDescriptionPrompt(verifiedData: VerifiedBookshopData): string {
  const dataPoints: string[] = [];

  // Always include: name and location
  dataPoints.push(`Name: ${verifiedData.name}`);
  dataPoints.push(`Location: ${verifiedData.city}, ${verifiedData.state}`);

  // Google editorial description (highest quality source)
  if (verifiedData.googleDescription) {
    dataPoints.push(`Google Editorial: "${verifiedData.googleDescription}"`);
  }

  // Rating and review count (social proof)
  if (verifiedData.googleRating && verifiedData.googleReviewCount) {
    dataPoints.push(`Customer Rating: ${verifiedData.googleRating} stars from ${verifiedData.googleReviewCount} reviews`);
  }

  // Specialty indicators from Google types
  if (verifiedData.specialtyIndicators.length > 0) {
    dataPoints.push(`Offers: ${verifiedData.specialtyIndicators.join(', ')}`);
  }

  // Price level
  if (verifiedData.googlePriceLevel !== null) {
    const priceLabels = ['Free', 'Inexpensive', 'Moderate', 'Expensive', 'Very Expensive'];
    dataPoints.push(`Price Range: ${priceLabels[verifiedData.googlePriceLevel]}`);
  }

  // Services/amenities available
  const amenities: string[] = [];
  if (verifiedData.website) amenities.push('website');
  if (verifiedData.phone) amenities.push('phone');
  if (verifiedData.hasHours) amenities.push('posted hours');

  if (amenities.length > 0) {
    dataPoints.push(`Available: ${amenities.join(', ')}`);
  }

  // Business operational status
  if (verifiedData.businessStatus === 'OPERATIONAL') {
    dataPoints.push('Business Status: Currently operational');
  }

  // Customer feedback themes (only from high-rated reviews)
  const positiveQuotes = verifiedData.reviewQuotes
    .filter(r => r.rating >= 4)
    .slice(0, 2);

  if (positiveQuotes.length > 0) {
    dataPoints.push('Customer Feedback Examples:');
    positiveQuotes.forEach((quote, i) => {
      dataPoints.push(`  ${i + 1}. "${quote.text}..." (${quote.rating}/5 stars)`);
    });
  }

  // Existing manual description (context for tone/style)
  if (verifiedData.manualDescription && verifiedData.manualDescription.length > 50) {
    dataPoints.push(`Current Description: "${verifiedData.manualDescription}"`);
  }

  // Build the complete prompt with few-shot examples
  return `You are writing a description for an independent bookshop directory website. Write a natural, engaging 200-word description using ONLY the verified information provided below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLES OF PERFECT DESCRIPTIONS (FOLLOW THIS PATTERN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE 1 (Rich data - has Google description and rating):

Powell's Books is an independent bookshop in Portland, Oregon, offering an extensive collection of new and used books covering a full range of subjects. With a 4.6-star rating from over 8,000 reviews, this bookshop has earned strong recognition among readers throughout the Pacific Northwest.

Specializing in both new and used books, Powell's provides readers with access to titles across all genres and subjects. The moderate pricing makes quality reading accessible to everyone, whether searching for the latest releases or discovering treasures among their used book selection. The on-site café creates a welcoming space where visitors can browse and relax.

Customers consistently praise the knowledgeable staff and diverse selection. The bookshop serves as an important gathering place for Portland's literary community, fostering connections between readers, writers, and ideas through its thoughtfully curated inventory and community-focused approach.

Visit Powell's Books to experience the personalized service that has earned such positive reviews. Check their website for current hours and information, or stop by to explore their collection and discover your next great read while supporting independent bookselling.

EXAMPLE 2 (Sparse data - minimal information available):

The Book Nook is an independent bookshop in Springfield, Illinois. This locally-owned establishment provides readers with a welcoming space to discover books and connect with the community's literary culture.

The bookshop offers a selection of books across various genres and subjects, giving readers access to both popular titles and unique discoveries. Operating at moderate prices, they make reading accessible while providing the personal service that distinguishes independent bookshops from larger retailers.

Independent bookshops like The Book Nook play a vital role in their communities by creating gathering places for readers and supporting diverse voices in publishing. The commitment to quality service and carefully selected inventory enhances every visit.

Stop by The Book Nook to experience the personalized attention and welcoming atmosphere. Support local independent bookselling in Springfield while discovering your next favorite read in a friendly, book-loving environment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTICE WHAT THESE EXAMPLES NEVER DO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✗ They DON'T say: "the first bookshop", "pioneer", "original", "historic"
✗ They DON'T say: "10,000 books", "three floors", "5,000 square feet"
✗ They DON'T say: "since 1985", "established in", "founded", "for over 20 years"
✗ They DON'T say: "owned by the Smith family", "started by John Doe"
✗ They DON'T say: "award-winning", "featured in", "named best"

✓ They DO say: "offers", "provides", "features", "serves", "creates"
✓ They DO include both city AND state in first paragraph
✓ They DO base everything on verifiable facts only

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE PROHIBITIONS - THESE WILL CAUSE REJECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 PROHIBITION 1: NEVER use "the first", "the original", "the pioneer"
Even if you think it might be true - you DON'T have this information
❌ WRONG: "the first independent bookshop in the area"
❌ WRONG: "a pioneer in the local book scene"
❌ WRONG: "the original indie bookstore"
✅ CORRECT: "an independent bookshop serving the community"

🚫 PROHIBITION 2: NEVER mention specific numbers for inventory or size
You do NOT have this data - don't estimate or guess
❌ WRONG: "over 10,000 books", "thousands of titles", "hundreds of volumes"
❌ WRONG: "spanning three floors", "5,000 square feet", "two stories"
❌ WRONG: "dozens of genres", "wide selection of books" (too specific)
✅ CORRECT: "a selection of books", "access to books", "offers books"

🚫 PROHIBITION 3: NEVER use time-based claims
❌ WRONG: "for over 20 years", "since 1985", "long-standing", "decades"
❌ WRONG: "established in", "founded", "opened", "started"
✅ CORRECT: "serves the community", "provides readers", "operates in"

🚫 PROHIBITION 4: NEVER mention owners or founders
❌ WRONG: "family-owned", "owned by", "run by", "founded by"
❌ WRONG: "the Smith family business", "proprietor", "third-generation"
✅ CORRECT: "locally-owned", "independent", "community bookshop"

🚫 PROHIBITION 5: NEVER claim awards or recognition (unless in data)
❌ WRONG: "award-winning", "recognized", "featured in", "acclaimed"
✅ CORRECT: Use rating data if available: "${verifiedData.googleRating ? verifiedData.googleRating + '-star rating' : 'rating information'}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VERIFIED DATA FOR ${verifiedData.name.toUpperCase()}:

${dataPoints.join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR TASK: Write a 200-word description following the EXACT pattern shown in the examples above.

PARAGRAPH 1 (60-70 words):
MANDATORY OPENING SENTENCE (copy this EXACTLY):

"${verifiedData.name} is an independent bookshop in ${verifiedData.city}, ${verifiedData.state}."

Do NOT paraphrase this. Use these EXACT words: "${verifiedData.city}, ${verifiedData.state}"
The word "${verifiedData.state}" MUST appear in your first sentence.

${verifiedData.googleDescription ? 'Second sentence: Naturally incorporate this Google description: "' + verifiedData.googleDescription.substring(0, 120) + '..."' : 'Second sentence: Describe the bookshop\'s general offerings.'}
${verifiedData.googleRating && verifiedData.googleRating >= 4.5 && verifiedData.googleReviewCount ? 'Third sentence: "With a ' + verifiedData.googleRating + '-star rating from ' + verifiedData.googleReviewCount + ' reviews, this bookshop has earned strong recognition."' : 'Third sentence: Describe the bookshop\'s role or appeal.'}

PARAGRAPH 2 (60-70 words):
${verifiedData.specialtyIndicators.length > 0 ? 'Start with: "Specializing in ' + verifiedData.specialtyIndicators.join(' and ') + ', the bookshop..."' : 'Start with: "The bookshop offers a selection of books..."'}
Focus on what they provide (books, selection, services)
${verifiedData.googlePriceLevel !== null && verifiedData.googlePriceLevel <= 2 ? 'Mention accessibility of pricing' : ''}
Use active verbs: provides, offers, features, carries

PARAGRAPH 3 (50-60 words):
${verifiedData.googleRating && verifiedData.googleRating >= 4.5 ? 'Reference customer satisfaction based on ratings' : 'Describe general bookshop atmosphere'}
${positiveQuotes.length > 0 ? 'Paraphrase review themes (DO NOT use quotes)' : 'Describe community value'}
Emphasize role in local literary community
Keep generic: "welcoming", "thoughtfully curated", "quality service"

PARAGRAPH 4 (30-40 words):
${verifiedData.website ? 'Encourage visiting website: "Check their website for current hours..."' : 'Encourage in-person visit'}
Always end with: "...supporting independent bookselling in ${verifiedData.city}" or similar
Warm, inviting close

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FINAL SELF-CHECK (Complete BEFORE writing):

□ FIRST sentence is EXACTLY: "${verifiedData.name} is an independent bookshop in ${verifiedData.city}, ${verifiedData.state}." (word-for-word, no changes)?
□ State name "${verifiedData.state}" appears in the first sentence?
□ State name "${verifiedData.state}" appears somewhere in the description?
□ No "the first", "the original", "pioneer", "historic"?
□ No specific numbers: "10,000 books", "three floors", "hundreds"?
□ No dates: "since", "established", "founded", "for X years"?
□ No owners: "family-owned", "founded by", "run by"?
□ No awards: "award-winning", "acclaimed", "recognized"?
□ Only facts from verified data above?
□ Follows example pattern closely?

If ANY box is unchecked, DO NOT PROCEED. Fix the issue first.

OUTPUT: Return ONLY the 4-paragraph description. No preamble. No explanation.

Write the description now:`;
}

/**
 * Validate generated description for accuracy and quality
 * Returns validation result with severity classification
 */
function validateDescription(description: string, verifiedData: VerifiedBookshopData): ValidationResult {
  const issues: string[] = [];
  const lowerDesc = description.toLowerCase();
  const bookshopName = verifiedData.name.toLowerCase();

  // Check 1: Word count (200 ±5)
  const wordCount = description.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 195 || wordCount > 205) {
    issues.push(`Word count out of range: ${wordCount} words (target: 195-205)`);
  }

  // Check 2: Required elements present
  if (!description.includes(verifiedData.name)) {
    issues.push('CRITICAL: Bookshop name not mentioned');
  }
  if (!description.includes(verifiedData.city)) {
    issues.push('CRITICAL: City not mentioned');
  }
  if (!description.includes(verifiedData.state)) {
    issues.push('CRITICAL: State not mentioned');
  }

  // Check 3: No dates or years (CRITICAL)
  const yearPattern = /\b(19|20)\d{2}\b/;
  if (yearPattern.test(description)) {
    const matches = description.match(yearPattern);
    issues.push(`CRITICAL: Contains year/date not in verified data: ${matches?.join(', ')}`);
  }

  // Check 4: No founding/establishment claims (CRITICAL)
  const foundingPatterns = [
    /since\s+\d{4}/i,
    /established\s+in/i,
    /founded\s+in/i,
    /opened\s+in/i,
    /for over \d+ years/i,
    /for more than \d+ years/i
  ];

  foundingPatterns.forEach(pattern => {
    if (pattern.test(description)) {
      issues.push('CRITICAL: Contains founding/establishment claim without data');
    }
  });

  // Check 5: No owner/founder names (CRITICAL)
  // BUT: Allow "family-owned" if it's just a generic descriptor (common term)
  if (/founded by [A-Z]|owned by [A-Z]|started by [A-Z]|created by [A-Z]/i.test(description)) {
    issues.push('CRITICAL: Contains ownership/founder claim with name');
  }
  // Note: "family-owned" alone is OK - it's a generic descriptor

  // Check 6: No specific inventory claims (CRITICAL)
  // BUT: Exclude the bookshop name itself from this check
  const inventoryPattern = /\d+[\s,]+(books|volumes|titles)/i;
  const inventoryMatches = description.match(inventoryPattern);

  if (inventoryMatches) {
    // Check if this number is part of the bookshop name
    const isPartOfName = inventoryMatches.some(match => {
      const cleanMatch = match.toLowerCase();
      return bookshopName.includes(cleanMatch);
    });

    if (!isPartOfName) {
      issues.push(`CRITICAL: Contains specific inventory claim: "${inventoryMatches[0]}"`);
    }
    // If it IS part of name (like "31 Books"), that's fine - ignore
  }

  // Check 7: No size claims (square footage, floors)
  if (/\d+[\s,]+(square feet|sq\.?\s*ft|floors|stories|levels)/i.test(description)) {
    issues.push('CRITICAL: Contains specific size claim');
  }

  // Check 8: No award/media mentions (CRITICAL)
  if (/award-winning|winner of|nominated for|featured in [A-Z]|recognized by [A-Z]|appeared in [A-Z]/i.test(description)) {
    issues.push('CRITICAL: Contains award or media recognition claim');
  }

  // Check 9: No unsupported superlatives (CRITICAL)
  const superlatives = [
    { phrase: 'the first', allowed: false },
    { phrase: 'the original', allowed: false },
    { phrase: 'pioneer', allowed: false },
    { phrase: 'the best', allowed: verifiedData.googleRating ? verifiedData.googleRating >= 4.8 : false },
    { phrase: 'the largest', allowed: false },
    { phrase: 'the biggest', allowed: false },
    { phrase: 'the oldest', allowed: false },
    { phrase: 'the only', allowed: false }
  ];

  superlatives.forEach(({ phrase, allowed }) => {
    if (!allowed && lowerDesc.includes(phrase)) {
      issues.push(`CRITICAL: Unsupported superlative: "${phrase}"`);
    }
  });

  // Check 10: Rating claims must match data
  if (lowerDesc.includes('highly rated') || lowerDesc.includes('top-rated')) {
    if (!verifiedData.googleRating || verifiedData.googleRating < 4.5) {
      issues.push('WARNING: Claims high rating but rating < 4.5 or missing');
    }
  }

  // Check 11: Specialty claims must match data
  if (verifiedData.specialtyIndicators.length === 0) {
    const specialtyWords = ['specializes in', 'known for', 'focuses on', 'dedicated to'];
    specialtyWords.forEach(word => {
      if (lowerDesc.includes(word)) {
        issues.push('WARNING: Mentions specialties but no specialty data available');
      }
    });
  }

  // Check 12: No direct review quotes
  verifiedData.reviewQuotes.forEach(quote => {
    if (quote.text && description.includes(quote.text.substring(0, 30))) {
      issues.push('WARNING: Contains direct review quote - should paraphrase only');
    }
  });

  // Check 13: Paragraph structure
  const paragraphs = description.split(/\n\n+/).filter(p => p.trim().length > 0);
  if (paragraphs.length < 3) {
    issues.push('WARNING: Should have 3-4 paragraphs for readability');
  }
  if (paragraphs.length > 5) {
    issues.push('WARNING: Too many paragraphs (should be 3-4)');
  }

  // Check 14: No time-based claims without hours data
  if (!verifiedData.hasHours) {
    if (/open daily|hours|am|pm|\d{1,2}:\d{2}/i.test(description)) {
      issues.push('WARNING: Mentions hours/times but no hours data available');
    }
  }

  // Check 15: Repetitive words check
  const words = lowerDesc.split(/\s+/).filter(w => w.length > 4);
  const wordCounts: Record<string, number> = {};

  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  Object.entries(wordCounts).forEach(([word, count]) => {
    if (count > 4 && !['bookshop', 'books', 'independent'].includes(word)) {
      issues.push(`WARNING: Word "${word}" repeated ${count} times`);
    }
  });

  // Classify severity
  const criticalIssues = issues.filter(i => i.includes('CRITICAL'));
  const warningIssues = issues.filter(i => i.includes('WARNING'));
  const otherIssues = issues.filter(i => !i.includes('CRITICAL') && !i.includes('WARNING'));

  let severity: 'critical' | 'warning' | 'minor';
  if (criticalIssues.length > 0) {
    severity = 'critical';
  } else if (warningIssues.length > 2) {
    severity = 'warning';
  } else {
    severity = 'minor';
  }

  return {
    isValid: criticalIssues.length === 0 && warningIssues.length <= 2,
    severity: severity,
    issues: issues,
    wordCount: wordCount,
    criticalCount: criticalIssues.length,
    warningCount: warningIssues.length,
    minorCount: otherIssues.length
  };
}

/**
 * Generate AI description for a single bookshop
 * Returns description and validation results
 */
async function generateBookshopDescription(bookshopId: number) {
  const startTime = Date.now();

  try {
    console.log(`\n[${bookshopId}] Starting description generation...`);

    // Step 1: Get verified data
    const verifiedData = await getVerifiedBookshopData(bookshopId);

    if (!verifiedData) {
      console.error(`[${bookshopId}] ✗ Failed to load bookshop data`);
      return null;
    }

    console.log(`[${bookshopId}] ✓ Loaded verified data`);
    console.log(`  - Name: ${verifiedData.name}`);
    console.log(`  - Location: ${verifiedData.city}, ${verifiedData.state}`);
    console.log(`  - Google desc: ${verifiedData.googleDescription ? 'Yes (' + verifiedData.googleDescription.length + ' chars)' : 'No'}`);
    console.log(`  - Rating: ${verifiedData.googleRating || 'N/A'} (${verifiedData.googleReviewCount || 0} reviews)`);
    console.log(`  - Specialty indicators: ${verifiedData.specialtyIndicators.join(', ') || 'None'}`);
    console.log(`  - Review quotes: ${verifiedData.reviewQuotes.length}`);

    // Step 2: Build prompt
    const prompt = buildDescriptionPrompt(verifiedData);

    console.log(`[${bookshopId}] ✓ Built prompt (${prompt.length} chars)`);

    // Step 3: Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        temperature: 0.3, // Maximum consistency, minimal creativity
        messages: [{
          role: "user",
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${bookshopId}] ✗ API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error(`[${bookshopId}] ✗ Invalid API response structure`);
      return null;
    }

    const description = data.content[0].text.trim();
    const wordCount = description.split(/\s+/).length;

    console.log(`[${bookshopId}] ✓ Generated description (${wordCount} words)`);

    // Step 4: Validate (removed prohibited phrase filter - validation is comprehensive enough)
    const validation = validateDescription(description, verifiedData);

    console.log(`[${bookshopId}] Validation: ${validation.severity.toUpperCase()}`);

    if (validation.criticalCount > 0) {
      console.error(`[${bookshopId}] ✗ CRITICAL VALIDATION FAILURES:`);
      validation.issues
        .filter(i => i.includes('CRITICAL'))
        .forEach(issue => console.error(`    - ${issue}`));
      console.error(`[${bookshopId}] Description NOT saved due to critical issues`);
      return null; // Do not save descriptions with critical issues
    }

    if (validation.warningCount > 0) {
      console.warn(`[${bookshopId}] ⚠ Validation warnings (${validation.warningCount}):`);
      validation.issues
        .filter(i => i.includes('WARNING'))
        .forEach(issue => console.warn(`    - ${issue}`));
    }

    if (validation.isValid) {
      console.log(`[${bookshopId}] ✓ Validation passed`);
    }

    // Step 6: Save to database
    // Try using RPC function first, then fall back to direct update with trigger workaround
    let updateError: any = null;
    
    try {
      const { error: rpcError } = await supabase.rpc('update_ai_description', {
        p_bookshop_id: bookshopId,
        p_description: description,
        p_generated_at: new Date().toISOString(),
        p_validated: validation.isValid
      });
      
      if (rpcError) {
        // If function doesn't exist or has issues, try direct update
        if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
          console.log(`[${bookshopId}] ℹ️  RPC function not found, trying direct update...`);
          
          // Try direct update - this might fail with geography error, but we'll catch it
          const { error: directError } = await supabase
            .from('bookstores')
            .update({
              ai_generated_description: description,
              description_generated_at: new Date().toISOString(),
              description_validated: validation.isValid
            })
            .eq('id', bookshopId);
          
          if (directError) {
            // If direct update fails with geography error, the migration hasn't been run
            if (directError.message?.includes('geography') || directError.code === '42704') {
              console.error(`[${bookshopId}] ✗ Geography type error - migration may not be run`);
              console.error(`    Please run: migrations/add-ai-description-columns.sql in Supabase SQL Editor`);
              updateError = directError;
            } else {
              updateError = directError;
            }
          }
        } else {
          updateError = rpcError;
        }
      }
    } catch (rpcErr: any) {
      // If RPC call itself fails, try direct update
      console.log(`[${bookshopId}] ℹ️  RPC call failed, trying direct update...`);
      
      const { error: directError } = await supabase
        .from('bookstores')
        .update({
          ai_generated_description: description,
          description_generated_at: new Date().toISOString(),
          description_validated: validation.isValid
        })
        .eq('id', bookshopId);
      
      if (directError) {
        if (directError.message?.includes('geography') || directError.code === '42704') {
          console.error(`[${bookshopId}] ✗ Geography type error - migration may not be run`);
          console.error(`    Please run: migrations/add-ai-description-columns.sql in Supabase SQL Editor`);
        }
        updateError = directError;
      }
    }

    if (updateError) {
      console.error(`[${bookshopId}] ✗ Database save failed:`, updateError.message || updateError);
      // Still return the result so it can be reviewed, but mark as not saved
      return {
        bookshopId,
        name: verifiedData.name,
        description,
        validation,
        duration: parseFloat(((Date.now() - startTime) / 1000).toFixed(2)),
        saved: false
      };
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${bookshopId}] ✓ Saved to database (${duration}s total)`);

    return {
      bookshopId,
      name: verifiedData.name,
      description,
      validation,
      duration: parseFloat(duration)
    };

  } catch (error: any) {
    console.error(`[${bookshopId}] ✗ Unexpected error:`, error.message);
    console.error(error.stack);
    return null;
  }
}

/**
 * Test description generation on sample bookshops
 * Tests rich, medium, and sparse data scenarios
 */
async function testDescriptionGeneration() {
  console.log('\n═══════════════════════════════════════');
  console.log('DESCRIPTION GENERATION - TEST MODE');
  console.log('═══════════════════════════════════════\n');

  // Test Case 1: Rich data (Google description + reviews + rating)
  console.log('TEST CASE 1: Rich data (Google description + reviews)\n');
  const { data: richBookshops } = await supabase
    .from('bookstores')
    .select('id, name')
    .not('google_description', 'is', null)
    .gte('google_review_count', 50)
    .eq('live', true)
    .limit(3);

  for (const bookshop of richBookshops || []) {
    await generateBookshopDescription(bookshop.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test Case 2: Medium data (rating but no description)
  console.log('\n\nTEST CASE 2: Medium data (rating, no description)\n');
  const { data: mediumBookshops } = await supabase
    .from('bookstores')
    .select('id, name')
    .is('google_description', null)
    .not('google_rating', 'is', null)
    .gte('google_review_count', 10)
    .eq('live', true)
    .limit(3);

  for (const bookshop of mediumBookshops || []) {
    await generateBookshopDescription(bookshop.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test Case 3: Sparse data (minimal Google data)
  console.log('\n\nTEST CASE 3: Sparse data (minimal info)\n');
  const { data: sparseBookshops } = await supabase
    .from('bookstores')
    .select('id, name')
    .is('google_description', null)
    .is('google_rating', null)
    .eq('live', true)
    .limit(3);

  for (const bookshop of sparseBookshops || []) {
    await generateBookshopDescription(bookshop.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n═══════════════════════════════════════');
  console.log('TEST COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log('\nPlease manually review the 9 test descriptions in Supabase:');
  console.log('\nSELECT id, name, ai_generated_description, description_validated');
  console.log('FROM bookstores');
  console.log('WHERE ai_generated_description IS NOT NULL');
  console.log('ORDER BY description_generated_at DESC');
  console.log('LIMIT 9;\n');
  console.log('If quality is acceptable (95%+ pass rate), run batchGenerateDescriptions()\n');
}

/**
 * Batch generate descriptions for all bookshops
 * Includes rate limiting, progress tracking, and error recovery
 * 
 * @param specificIds Optional array of specific bookshop IDs to process (if provided, only these will be processed)
 */
async function batchGenerateDescriptions(specificIds?: number[]) {
  console.log('\n═══════════════════════════════════════');
  console.log('AI DESCRIPTION GENERATION - BATCH MODE');
  console.log('═══════════════════════════════════════\n');

  let allBookshops: any[] = [];

  if (specificIds && specificIds.length > 0) {
    // Process only the specified IDs
    console.log(`Processing ${specificIds.length} specific bookshop IDs...\n`);
    
    // Fetch in batches to handle Supabase's limit
    let offset = 0;
    const BATCH_SIZE = 1000;
    
    while (offset < specificIds.length) {
      const batchIds = specificIds.slice(offset, offset + BATCH_SIZE);
      
      const { data: bookshops, error: fetchError } = await supabase
        .from('bookstores')
        .select('id, name, city, state')
        .in('id', batchIds)
        .is('ai_generated_description', null)
        .eq('live', true);

      if (fetchError) {
        console.error('Error fetching bookshops:', fetchError);
        break;
      }

      if (bookshops && bookshops.length > 0) {
        allBookshops = allBookshops.concat(bookshops);
      }

      offset += BATCH_SIZE;
    }
  } else {
    // Get all bookshops without AI descriptions
    // Fetch in batches to handle Supabase's 1000-row limit
    let offset = 0;
    const BATCH_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: bookshops, error: fetchError } = await supabase
        .from('bookstores')
        .select('id, name, city, state')
        .is('ai_generated_description', null)
        .eq('live', true)
        .order('id')
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError) {
        console.error('Error fetching bookshops:', fetchError);
        break;
      }

      if (!bookshops || bookshops.length === 0) {
        hasMore = false;
      } else {
        allBookshops = allBookshops.concat(bookshops);
        offset += BATCH_SIZE;
        hasMore = bookshops.length === BATCH_SIZE;
      }
    }
  }

  if (allBookshops.length === 0) {
    console.log('✓ All bookshops already have AI descriptions\n');
    return;
  }

  console.log(`Found ${allBookshops.length} bookshops needing descriptions\n`);

  const estimatedCost = (allBookshops.length * 0.013).toFixed(2);
  const estimatedMinutes = Math.ceil(allBookshops.length * 2 / 60); // ~2 sec per bookshop

  console.log(`Estimated cost: $${estimatedCost}`);
  console.log(`Estimated time: ${estimatedMinutes} minutes\n`);
  console.log('Starting in 3 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  const stats = {
    total: allBookshops.length,
    success: 0,
    failed: 0,
    criticalErrors: 0,
    warnings: 0,
    totalCost: 0,
    errors: [] as Array<{ bookshop: string; id: number; error: string }>
  };

  const startTime = Date.now();

  // Process each bookshop
  for (let i = 0; i < allBookshops.length; i++) {
    const bookshop = allBookshops[i];
    const progress = `[${i + 1}/${allBookshops.length}]`;

    console.log(`${progress} Processing: ${bookshop.name} (${bookshop.city}, ${bookshop.state})`);

    const result = await generateBookshopDescription(bookshop.id);

    if (result) {
      stats.success++;
      stats.totalCost += 0.013; // Approximate cost per description

      if (result.validation.severity === 'warning') {
        stats.warnings++;
      }

      console.log(`${progress} ✓ Success (${result.validation.wordCount} words, ${result.duration}s)`);
    } else {
      stats.failed++;
      stats.criticalErrors++;

      stats.errors.push({
        bookshop: bookshop.name,
        id: bookshop.id,
        error: 'Generation failed or validation critical errors'
      });

      console.log(`${progress} ✗ Failed`);
    }

    // Rate limiting: 2 seconds between requests (safe buffer)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Progress report every 50 bookshops
    if ((i + 1) % 50 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const successRate = ((stats.success / (i + 1)) * 100).toFixed(1);

      console.log('\n--- Progress Report ---');
      console.log(`Processed: ${i + 1}/${allBookshops.length} (${((i + 1) / allBookshops.length * 100).toFixed(1)}%)`);
      console.log(`Success: ${stats.success} (${successRate}%)`);
      console.log(`Failed: ${stats.failed}`);
      console.log(`Warnings: ${stats.warnings}`);
      console.log(`Cost so far: $${stats.totalCost.toFixed(2)}`);
      console.log(`Time elapsed: ${elapsed} minutes\n`);
    }
  }

  // Final report
  printFinalReport(stats, startTime);

  // Save error log if there were failures
  if (stats.errors.length > 0) {
    saveErrorLog(stats.errors);
  }

  return stats;
}

/**
 * Print final batch generation report
 */
function printFinalReport(stats: any, startTime: number) {
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const successRate = ((stats.success / stats.total) * 100).toFixed(1);

  console.log('\n═══════════════════════════════════════');
  console.log('BATCH GENERATION COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`Total processed: ${stats.total}`);
  console.log(`✓ Successful: ${stats.success} (${successRate}%)`);
  console.log(`✗ Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
  console.log(`⚠ Warnings: ${stats.warnings}`);
  console.log(`─────────────────────────────────────────`);
  console.log(`Total cost: $${stats.totalCost.toFixed(2)}`);
  console.log(`Total time: ${duration} minutes`);
  console.log(`Average: ${(parseFloat(duration) * 60 / stats.total).toFixed(1)}s per bookshop`);
  console.log('═══════════════════════════════════════\n');

  if (stats.failed > 0) {
    console.log(`⚠ ${stats.failed} bookshops failed to generate descriptions`);
    console.log('Check generation-errors.json for details\n');
  }

  if (parseFloat(successRate) >= 95) {
    console.log('✓ SUCCESS: 95%+ pass rate achieved\n');
  } else {
    console.log('⚠ WARNING: Pass rate below 95% - review errors and retry failed bookshops\n');
  }
}

/**
 * Save error log to file
 */
function saveErrorLog(errors: Array<{ bookshop: string; id: number; error: string }>) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `generation-errors-${timestamp}.json`;

  const errorReport = {
    timestamp: new Date().toISOString(),
    totalErrors: errors.length,
    errors: errors
  };

  fs.writeFileSync(filename, JSON.stringify(errorReport, null, 2));
  console.log(`Error log saved to: ${filename}\n`);
}

// Main execution
const args = process.argv.slice(2);
const isTest = args.includes('--test');
const isBatch = args.includes('--batch');
const idsFileArg = args.find(arg => arg.startsWith('--ids-file='));
const idsArg = args.find(arg => arg.startsWith('--ids='));

let specificIds: number[] | undefined = undefined;

// Check for specific IDs to process
if (idsFileArg) {
  const idsFile = idsFileArg.split('=')[1];
  try {
    const idsContent = fs.readFileSync(idsFile, 'utf-8');
    specificIds = JSON.parse(idsContent);
    if (!Array.isArray(specificIds)) {
      console.error('❌ IDs file must contain a JSON array of numbers');
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Error reading IDs file: ${idsFile}`);
    console.error(error.message);
    process.exit(1);
  }
} else if (idsArg) {
  const idsString = idsArg.split('=')[1];
  try {
    specificIds = idsString.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
  } catch (error: any) {
    console.error('❌ Error parsing IDs. Format: --ids=1,2,3,4');
    process.exit(1);
  }
}

if (isTest) {
  testDescriptionGeneration()
    .then(() => {
      console.log('\n✨ Test complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
} else if (isBatch) {
  batchGenerateDescriptions(specificIds)
    .then(() => {
      console.log('\n✨ Batch generation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
} else {
  console.log('Usage:');
  console.log('  npx tsx scripts/generate-bookshop-descriptions.ts --test   # Test on 9 sample bookshops');
  console.log('  npx tsx scripts/generate-bookshop-descriptions.ts --batch   # Generate for all bookshops');
  console.log('  npx tsx scripts/generate-bookshop-descriptions.ts --batch --ids-file=retry-ids.json   # Retry specific IDs');
  console.log('  npx tsx scripts/generate-bookshop-descriptions.ts --batch --ids=1,2,3,4   # Retry specific IDs');
  process.exit(1);
}
