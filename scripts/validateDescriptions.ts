#!/usr/bin/env tsx

/**
 * Comprehensive validation script for AI and template-generated descriptions
 * Validates description quality, content requirements, and identifies issues
 */

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

interface ValidationResult {
  bookshopId: number;
  name: string;
  city: string;
  state: string;
  source: 'ai' | 'template' | null;
  description: string;
  length: number;
  passed: boolean;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  rule: string;
  severity: 'critical' | 'warning' | 'minor';
  message: string;
  details?: string;
}

interface ValidationStats {
  total: number;
  passed: number;
  failed: number;
  bySource: {
    ai: { total: number; passed: number; failed: number };
    template: { total: number; passed: number; failed: number };
  };
  byRule: Record<string, { passed: number; failed: number }>;
  averageLength: {
    ai: number;
    template: number;
    overall: number;
  };
  commonIssues: Array<{ rule: string; count: number }>;
}

/**
 * Validate a single description against all rules
 */
function validateDescription(
  description: string,
  bookshop: { id: number; name: string; city: string; state: string }
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lowerDesc = description.toLowerCase();
  const name = bookshop.name.toLowerCase();

  // Rule 1: Length check (150-400 characters)
  if (description.length < 150) {
    issues.push({
      rule: 'length_min',
      severity: 'critical',
      message: `Description too short: ${description.length} characters (minimum: 150)`,
      details: `${description.length} chars`
    });
  } else if (description.length > 400) {
    issues.push({
      rule: 'length_max',
      severity: 'warning',
      message: `Description too long: ${description.length} characters (maximum: 400)`,
      details: `${description.length} chars`
    });
  }

  // Rule 2: Must include bookstore name
  if (!description.includes(bookshop.name)) {
    issues.push({
      rule: 'missing_name',
      severity: 'critical',
      message: 'Description does not include bookstore name',
      details: `Expected: "${bookshop.name}"`
    });
  }

  // Rule 3: Must include city
  if (!description.includes(bookshop.city)) {
    issues.push({
      rule: 'missing_city',
      severity: 'critical',
      message: 'Description does not include city',
      details: `Expected: "${bookshop.city}"`
    });
  }

  // Rule 4: Must include state
  if (!description.includes(bookshop.state)) {
    issues.push({
      rule: 'missing_state',
      severity: 'critical',
      message: 'Description does not include state',
      details: `Expected: "${bookshop.state}"`
    });
  }

  // Rule 5: No phone numbers
  const phonePattern = /\d{3}[-.]?\d{3}[-.]?\d{4}/;
  if (phonePattern.test(description)) {
    const match = description.match(phonePattern)?.[0];
    issues.push({
      rule: 'phone_number',
      severity: 'critical',
      message: 'Contains phone number',
      details: match
    });
  }

  // Rule 6: No street addresses
  const addressPattern = /\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|circle|ct)/i;
  if (addressPattern.test(description)) {
    const match = description.match(addressPattern)?.[0];
    issues.push({
      rule: 'street_address',
      severity: 'critical',
      message: 'Contains street address',
      details: match
    });
  }

  // Rule 7: No business hours
  const hoursPattern = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}\s*(am|pm)|open\s+(daily|monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i;
  if (hoursPattern.test(description)) {
    const match = description.match(hoursPattern)?.[0];
    // Check if it's a false positive (e.g., "Monday" in a book title context)
    const context = description.toLowerCase();
    const isFalsePositive = /(book|novel|story|tale|title)/.test(context.substring(
      Math.max(0, context.indexOf(match.toLowerCase()) - 20),
      Math.min(context.length, context.indexOf(match.toLowerCase()) + 20)
    ));
    
    if (!isFalsePositive) {
      issues.push({
        rule: 'business_hours',
        severity: 'warning',
        message: 'Contains business hours or time references',
        details: match
      });
    }
  }

  // Rule 8: No promotional language
  const promotionalPattern = /(award[- ]winning|acclaimed|beloved|treasured|iconic|legendary|renowned|celebrated|esteemed)/i;
  if (promotionalPattern.test(description)) {
    const match = description.match(promotionalPattern)?.[0];
    issues.push({
      rule: 'promotional_language',
      severity: 'warning',
      message: 'Contains promotional language',
      details: match
    });
  }

  // Rule 9: No specific inventory/size claims (hallucination risk)
  const inventoryPattern = /\d+[\s,]+(books|volumes|titles|square feet|sq\.?\s*ft|floors|stories|levels)/i;
  const inventoryMatch = description.match(inventoryPattern);
  if (inventoryMatch) {
    // Check if number is part of bookshop name (e.g., "31 Books")
    const isPartOfName = name.includes(inventoryMatch[0].toLowerCase());
    if (!isPartOfName) {
      issues.push({
        rule: 'inventory_claim',
        severity: 'critical',
        message: 'Contains specific inventory/size claim (potential hallucination)',
        details: inventoryMatch[0]
      });
    }
  }

  // Rule 10: No time-based claims (founding dates, years)
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const yearMatches = description.match(yearPattern);
  if (yearMatches) {
    // Filter out review counts that look like years
    const realYearMatches = yearMatches.filter(match => {
      const index = description.indexOf(match);
      const beforeContext = description.substring(Math.max(0, index - 30), index).toLowerCase();
      const afterContext = description.substring(index, Math.min(description.length, index + 30)).toLowerCase();
      
      // If it's preceded by "from" and followed by "review" or "customer", it's a review count
      const isReviewCount = /(?:from|with|of)\s+\d+[\s,]*$/.test(beforeContext) && 
                           /^\s*(?:google\s+)?(?:review|customer|rating)/.test(afterContext);
      
      const hasCommaFormat = description.substring(Math.max(0, index - 5), index).includes(',');
      
      return !isReviewCount && !hasCommaFormat;
    });
    
    if (realYearMatches.length > 0) {
      issues.push({
        rule: 'year_claim',
        severity: 'critical',
        message: 'Contains year/date not in verified data (potential hallucination)',
        details: realYearMatches.join(', ')
      });
    }
  }

  // Rule 11: No founding/establishment claims
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
    if (pattern.test(description)) {
      const match = description.match(pattern)?.[0];
      issues.push({
        rule: 'founding_claim',
        severity: 'critical',
        message: 'Contains founding/establishment claim without data (potential hallucination)',
        details: match
      });
    }
  });

  // Rule 12: No owner/founder names
  if (/founded by [A-Z]|owned by [A-Z]|started by [A-Z]|created by [A-Z]/i.test(description)) {
    const match = description.match(/(?:founded|owned|started|created) by [A-Z][a-z]+/i)?.[0];
    issues.push({
      rule: 'owner_claim',
      severity: 'critical',
      message: 'Contains ownership/founder claim with specific name (potential hallucination)',
      details: match
    });
  }

  // Rule 13: No unsupported superlatives
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
        rule: 'superlative',
        severity: 'critical',
        message: `Contains unsupported superlative: "${phrase}" (potential hallucination)`,
        details: phrase
      });
    }
  });

  // Rule 14: Basic grammar check (no obvious errors)
  const grammarIssues = [];
  if (description.split(' ').length < 15) {
    grammarIssues.push('Very short (less than 15 words)');
  }
  if (description.split(/[.!?]/).length < 2) {
    grammarIssues.push('May need more sentence variety');
  }
  if (grammarIssues.length > 0) {
    issues.push({
      rule: 'grammar_structure',
      severity: 'minor',
      message: grammarIssues.join('; '),
      details: `${description.split(' ').length} words, ${description.split(/[.!?]/).length} sentences`
    });
  }

  return issues;
}

/**
 * Sample random descriptions from database
 */
async function sampleDescriptions(count: number = 50): Promise<any[]> {
  // Get AI descriptions
  const { data: aiBookshops } = await supabase
    .from('bookstores')
    .select('id, name, city, state, ai_generated_description, description_source')
    .eq('description_source', 'ai')
    .not('ai_generated_description', 'is', null)
    .not('city', 'is', null)
    .not('state', 'is', null)
    .limit(1000);

  // Get template descriptions
  const { data: templateBookshops } = await supabase
    .from('bookstores')
    .select('id, name, city, state, ai_generated_description, description_source')
    .eq('description_source', 'template')
    .not('ai_generated_description', 'is', null)
    .not('city', 'is', null)
    .not('state', 'is', null)
    .limit(1000);

  // Randomly sample
  const aiSample = (aiBookshops || []).sort(() => Math.random() - 0.5).slice(0, Math.floor(count / 2));
  const templateSample = (templateBookshops || []).sort(() => Math.random() - 0.5).slice(0, Math.ceil(count / 2));

  return [...aiSample, ...templateSample];
}

/**
 * Generate validation statistics
 */
function generateStats(results: ValidationResult[]): ValidationStats {
  const stats: ValidationStats = {
    total: results.length,
    passed: 0,
    failed: 0,
    bySource: {
      ai: { total: 0, passed: 0, failed: 0 },
      template: { total: 0, passed: 0, failed: 0 }
    },
    byRule: {},
    averageLength: {
      ai: 0,
      template: 0,
      overall: 0
    },
    commonIssues: []
  };

  const ruleCounts: Record<string, { passed: number; failed: number }> = {};
  const issueCounts: Record<string, number> = {};
  let aiLengthSum = 0;
  let templateLengthSum = 0;
  let aiCount = 0;
  let templateCount = 0;
  let totalLengthSum = 0;

  results.forEach(result => {
    const passed = result.issues.filter(i => i.severity === 'critical').length === 0;
    
    if (passed) {
      stats.passed++;
    } else {
      stats.failed++;
    }

    // Track by source
    if (result.source === 'ai') {
      stats.bySource.ai.total++;
      if (passed) stats.bySource.ai.passed++;
      else stats.bySource.ai.failed++;
      aiLengthSum += result.length;
      aiCount++;
    } else if (result.source === 'template') {
      stats.bySource.template.total++;
      if (passed) stats.bySource.template.passed++;
      else stats.bySource.template.failed++;
      templateLengthSum += result.length;
      templateCount++;
    }

    totalLengthSum += result.length;

    // Track by rule
    const allRules = new Set(result.issues.map(i => i.rule));
    allRules.forEach(rule => {
      if (!ruleCounts[rule]) {
        ruleCounts[rule] = { passed: 0, failed: 0 };
      }
      if (passed) {
        ruleCounts[rule].passed++;
      } else {
        ruleCounts[rule].failed++;
      }
    });

    // Count issues
    result.issues.forEach(issue => {
      issueCounts[issue.rule] = (issueCounts[issue.rule] || 0) + 1;
    });
  });

  stats.byRule = ruleCounts;
  stats.averageLength.ai = aiCount > 0 ? Math.round(aiLengthSum / aiCount) : 0;
  stats.averageLength.template = templateCount > 0 ? Math.round(templateLengthSum / templateCount) : 0;
  stats.averageLength.overall = Math.round(totalLengthSum / results.length);

  stats.commonIssues = Object.entries(issueCounts)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count);

  return stats;
}

/**
 * Main validation function
 */
async function validateDescriptions() {
  console.log('🔍 Starting description validation...\n');
  console.log('Sampling 50 descriptions (25 AI, 25 template)...\n');

  const samples = await sampleDescriptions(50);
  console.log(`Sampled ${samples.length} descriptions\n`);

  const results: ValidationResult[] = [];

  for (const bookshop of samples) {
    if (!bookshop.ai_generated_description) continue;

    const issues = validateDescription(bookshop.ai_generated_description, {
      id: bookshop.id,
      name: bookshop.name,
      city: bookshop.city,
      state: bookshop.state
    });

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const passed = criticalIssues.length === 0;

    results.push({
      bookshopId: bookshop.id,
      name: bookshop.name,
      city: bookshop.city,
      state: bookshop.state,
      source: bookshop.description_source,
      description: bookshop.ai_generated_description,
      length: bookshop.ai_generated_description.length,
      passed,
      issues
    });
  }

  const stats = generateStats(results);

  // Print report
  console.log('='.repeat(80));
  console.log('VALIDATION REPORT');
  console.log('='.repeat(80));
  console.log(`\nTotal descriptions validated: ${stats.total}`);
  console.log(`✅ Passed: ${stats.passed} (${(stats.passed / stats.total * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${stats.failed} (${(stats.failed / stats.total * 100).toFixed(1)}%)`);
  console.log('');

  console.log('BY SOURCE:');
  console.log('-'.repeat(80));
  console.log(`AI-generated:`);
  console.log(`  Total: ${stats.bySource.ai.total}`);
  console.log(`  Passed: ${stats.bySource.ai.passed} (${stats.bySource.ai.total > 0 ? (stats.bySource.ai.passed / stats.bySource.ai.total * 100).toFixed(1) : 0}%)`);
  console.log(`  Failed: ${stats.bySource.ai.failed} (${stats.bySource.ai.total > 0 ? (stats.bySource.ai.failed / stats.bySource.ai.total * 100).toFixed(1) : 0}%)`);
  console.log(`\nTemplate-generated:`);
  console.log(`  Total: ${stats.bySource.template.total}`);
  console.log(`  Passed: ${stats.bySource.template.passed} (${stats.bySource.template.total > 0 ? (stats.bySource.template.passed / stats.bySource.template.total * 100).toFixed(1) : 0}%)`);
  console.log(`  Failed: ${stats.bySource.template.failed} (${stats.bySource.template.total > 0 ? (stats.bySource.template.failed / stats.bySource.template.total * 100).toFixed(1) : 0}%)`);
  console.log('');

  console.log('AVERAGE DESCRIPTION LENGTH:');
  console.log('-'.repeat(80));
  console.log(`AI-generated: ${stats.averageLength.ai} characters`);
  console.log(`Template-generated: ${stats.averageLength.template} characters`);
  console.log(`Overall: ${stats.averageLength.overall} characters`);
  console.log('');

  console.log('MOST COMMON ISSUES:');
  console.log('-'.repeat(80));
  stats.commonIssues.slice(0, 10).forEach(({ rule, count }) => {
    const percentage = (count / stats.total * 100).toFixed(1);
    console.log(`  ${rule}: ${count} occurrences (${percentage}%)`);
  });
  console.log('');

  console.log('VALIDATION RULE PASS/FAIL RATES:');
  console.log('-'.repeat(80));
  Object.entries(stats.byRule)
    .sort((a, b) => b[1].failed - a[1].failed)
    .forEach(([rule, { passed, failed }]) => {
      const total = passed + failed;
      const failRate = total > 0 ? (failed / total * 100).toFixed(1) : 0;
      console.log(`  ${rule}: ${passed} passed, ${failed} failed (${failRate}% fail rate)`);
    });
  console.log('');

  // Show failed descriptions
  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('='.repeat(80));
    console.log('FAILED DESCRIPTIONS (NEED MANUAL REVIEW)');
    console.log('='.repeat(80));
    failed.slice(0, 10).forEach(result => {
      console.log(`\nID ${result.bookshopId}: ${result.name} (${result.city}, ${result.state})`);
      console.log(`Source: ${result.source || 'unknown'}`);
      console.log(`Length: ${result.length} characters`);
      console.log(`Description: "${result.description.substring(0, 200)}..."`);
      console.log('Issues:');
      result.issues.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🟢';
        console.log(`  ${icon} [${issue.severity}] ${issue.message}${issue.details ? ` (${issue.details})` : ''}`);
      });
    });
    
    if (failed.length > 10) {
      console.log(`\n... and ${failed.length - 10} more failed descriptions`);
    }
  } else {
    console.log('✅ All descriptions passed validation!');
  }

  console.log('\n' + '='.repeat(80));
  console.log('Validation complete!');
  console.log('='.repeat(80));
}

validateDescriptions().catch(console.error);

