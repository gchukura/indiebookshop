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

interface QualityIssue {
  type: string;
  severity: 'critical' | 'warning' | 'minor';
  description: string;
  example?: string;
}

function analyzeDescription(desc: string, bookshop: any): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const lowerDesc = desc.toLowerCase();
  const name = bookshop.name.toLowerCase();
  
  // Check 1: Missing required elements
  if (!desc.includes(bookshop.name)) {
    issues.push({
      type: 'missing_name',
      severity: 'critical',
      description: 'Description does not include bookshop name'
    });
  }
  if (!desc.includes(bookshop.city)) {
    issues.push({
      type: 'missing_city',
      severity: 'critical',
      description: 'Description does not include city'
    });
  }
  if (!desc.includes(bookshop.state)) {
    issues.push({
      type: 'missing_state',
      severity: 'critical',
      description: 'Description does not include state'
    });
  }
  
  // Check 2: Specific inventory/size claims (hallucination risk)
  const inventoryPattern = /\d+[\s,]+(books|volumes|titles|square feet|sq\.?\s*ft|floors|stories|levels)/i;
  const inventoryMatch = desc.match(inventoryPattern);
  if (inventoryMatch) {
    // Check if number is part of bookshop name (e.g., "31 Books")
    const isPartOfName = name.includes(inventoryMatch[0].toLowerCase());
    if (!isPartOfName) {
      issues.push({
        type: 'inventory_claim',
        severity: 'critical',
        description: `Contains specific inventory/size claim: "${inventoryMatch[0]}"`,
        example: inventoryMatch[0]
      });
    }
  }
  
  // Check 3: Time-based claims (founding dates, years)
  // Exclude review counts that look like years (e.g., "from 2,017 reviews" or "from 2017 reviews")
  // by checking if the number is followed by "review" or "customer"
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const matches = desc.match(yearPattern);
  if (matches) {
    // Filter out false positives where the number is part of a review count
    const realYearMatches = matches.filter(match => {
      const index = desc.indexOf(match);
      const beforeContext = desc.substring(Math.max(0, index - 30), index).toLowerCase();
      const afterContext = desc.substring(index, Math.min(desc.length, index + 30)).toLowerCase();
      
      // If it's preceded by "from" or "with" and followed by "review" or "customer", it's a review count
      const isReviewCount = /(?:from|with|of)\s+\d+[\s,]*$/.test(beforeContext) && 
                           /^\s*(?:google\s+)?(?:review|customer|rating)/.test(afterContext);
      
      // Also check if it's part of a formatted number with comma (e.g., "2,017")
      const hasCommaFormat = desc.substring(Math.max(0, index - 5), index).includes(',');
      
      return !isReviewCount && !hasCommaFormat;
    });
    
    if (realYearMatches.length > 0) {
      issues.push({
        type: 'year_claim',
        severity: 'critical',
        description: `Contains year/date not in verified data: ${realYearMatches.join(', ')}`,
        example: realYearMatches[0]
      });
    }
  }
  
  const foundingPatterns = [
    /since\s+\d{4}/i,
    /established\s+in/i,
    /founded\s+in/i,
    /opened\s+in/i,
    /for over \d+ years/i,
    /for more than \d+ years/i,
    /long-standing/i,
    /decades/i
  ];
  
  foundingPatterns.forEach(pattern => {
    if (pattern.test(desc)) {
      issues.push({
        type: 'founding_claim',
        severity: 'critical',
        description: 'Contains founding/establishment claim without data',
        example: desc.match(pattern)?.[0]
      });
    }
  });
  
  // Check 4: Owner/founder names
  if (/founded by [A-Z]|owned by [A-Z]|started by [A-Z]|created by [A-Z]/i.test(desc)) {
    issues.push({
      type: 'owner_claim',
      severity: 'critical',
      description: 'Contains ownership/founder claim with specific name',
      example: desc.match(/(?:founded|owned|started|created) by [A-Z][a-z]+/i)?.[0]
    });
  }
  
  // Check 5: Unsupported superlatives
  const superlatives = [
    'the first',
    'the original',
    'pioneer',
    'the largest',
    'the biggest',
    'the oldest',
    'the only'
  ];
  
  superlatives.forEach(phrase => {
    if (lowerDesc.includes(phrase)) {
      issues.push({
        type: 'superlative',
        severity: 'critical',
        description: `Contains unsupported superlative: "${phrase}"`,
        example: phrase
      });
    }
  });
  
  // Check 6: Award/media mentions
  if (/award-winning|winner of|nominated for|featured in [A-Z]|recognized by [A-Z]|appeared in [A-Z]/i.test(desc)) {
    issues.push({
      type: 'award_claim',
      severity: 'critical',
      description: 'Contains award or media recognition claim',
      example: desc.match(/(?:award-winning|winner of|featured in|recognized by)/i)?.[0]
    });
  }
  
  // Check 7: Phone numbers
  if (/\d{3}[-.]?\d{3}[-.]?\d{4}/.test(desc)) {
    issues.push({
      type: 'phone_number',
      severity: 'warning',
      description: 'Contains phone number (should not be in description)'
    });
  }
  
  // Check 8: Addresses
  if (/\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)/i.test(desc)) {
    issues.push({
      type: 'address',
      severity: 'warning',
      description: 'Contains street address (should not be in description)'
    });
  }
  
  // Check 9: Hours/times
  if (/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}|am|pm)/i.test(desc)) {
    issues.push({
      type: 'hours',
      severity: 'warning',
      description: 'Contains hours/times (should not be in description)'
    });
  }
  
  // Check 10: Promotional language
  const promotional = /award-winning|acclaimed|beloved|treasured|iconic|legendary/i;
  if (promotional.test(desc)) {
    issues.push({
      type: 'promotional',
      severity: 'warning',
      description: 'Contains promotional language',
      example: desc.match(promotional)?.[0]
    });
  }
  
  // Check 11: Length issues
  if (desc.length < 100) {
    issues.push({
      type: 'too_short',
      severity: 'minor',
      description: `Description too short: ${desc.length} characters`
    });
  }
  if (desc.length > 400) {
    issues.push({
      type: 'too_long',
      severity: 'minor',
      description: `Description too long: ${desc.length} characters`
    });
  }
  
  return issues;
}

async function evaluateQuality() {
  console.log('🔍 Evaluating description quality...\n');
  
  // Sample descriptions from both sources
  const { data: aiBookshops } = await supabase
    .from('bookstores')
    .select('id, name, city, state, ai_generated_description, description_source, google_description, google_rating')
    .eq('description_source', 'ai')
    .not('city', 'is', null)
    .not('state', 'is', null)
    .limit(100);
  
  const { data: templateBookshops } = await supabase
    .from('bookstores')
    .select('id, name, city, state, ai_generated_description, description_source, google_description, google_rating')
    .eq('description_source', 'template')
    .not('city', 'is', null)
    .not('state', 'is', null)
    .limit(100);
  
  const allBookshops = [
    ...(aiBookshops || []),
    ...(templateBookshops || [])
  ];
  
  console.log(`Analyzing ${allBookshops.length} descriptions (${aiBookshops?.length || 0} AI, ${templateBookshops?.length || 0} template)\n`);
  
  const allIssues: Array<{ bookshop: any; issues: QualityIssue[] }> = [];
  const issueCounts: Record<string, number> = {};
  const severityCounts = { critical: 0, warning: 0, minor: 0 };
  
  for (const bookshop of allBookshops) {
    if (!bookshop.ai_generated_description) continue;
    
    const issues = analyzeDescription(bookshop.ai_generated_description, bookshop);
    
    if (issues.length > 0) {
      allIssues.push({ bookshop, issues });
      
      issues.forEach(issue => {
        issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
        severityCounts[issue.severity]++;
      });
    }
  }
  
  console.log('='.repeat(60));
  console.log('QUALITY ANALYSIS RESULTS');
  console.log('='.repeat(60));
  console.log(`Total descriptions analyzed: ${allBookshops.length}`);
  console.log(`Descriptions with issues: ${allIssues.length} (${(allIssues.length/allBookshops.length*100).toFixed(1)}%)`);
  console.log(`Descriptions without issues: ${allBookshops.length - allIssues.length} (${((allBookshops.length - allIssues.length)/allBookshops.length*100).toFixed(1)}%)`);
  console.log('');
  
  console.log('ISSUE BREAKDOWN BY SEVERITY:');
  console.log('-'.repeat(60));
  console.log(`🔴 Critical: ${severityCounts.critical}`);
  console.log(`🟡 Warning: ${severityCounts.warning}`);
  console.log(`🟢 Minor: ${severityCounts.minor}`);
  console.log('');
  
  console.log('ISSUE TYPES:');
  console.log('-'.repeat(60));
  Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  console.log('');
  
  // Show examples of critical issues
  const criticalIssues = allIssues.filter(item => 
    item.issues.some(i => i.severity === 'critical')
  );
  
  if (criticalIssues.length > 0) {
    console.log('='.repeat(60));
    console.log('CRITICAL ISSUES FOUND (showing first 10)');
    console.log('='.repeat(60));
    
    criticalIssues.slice(0, 10).forEach(({ bookshop, issues }) => {
      const critical = issues.filter(i => i.severity === 'critical');
      console.log(`\n${bookshop.name} (ID: ${bookshop.id}, ${bookshop.city}, ${bookshop.state})`);
      console.log(`Source: ${bookshop.description_source}`);
      console.log(`Description: "${bookshop.ai_generated_description.substring(0, 200)}..."`);
      console.log('Issues:');
      critical.forEach(issue => {
        console.log(`  🔴 ${issue.description}${issue.example ? ` (e.g., "${issue.example}")` : ''}`);
      });
    });
  } else {
    console.log('✅ No critical issues found!');
  }
  
  // Show examples of warnings
  const warningIssues = allIssues.filter(item => 
    item.issues.some(i => i.severity === 'warning')
  );
  
  if (warningIssues.length > 0 && warningIssues.length <= 5) {
    console.log('\n' + '='.repeat(60));
    console.log('WARNINGS FOUND');
    console.log('='.repeat(60));
    
    warningIssues.forEach(({ bookshop, issues }) => {
      const warnings = issues.filter(i => i.severity === 'warning');
      console.log(`\n${bookshop.name} (ID: ${bookshop.id})`);
      warnings.forEach(issue => {
        console.log(`  🟡 ${issue.description}`);
      });
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

evaluateQuality().catch(console.error);

