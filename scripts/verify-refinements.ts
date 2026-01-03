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

async function verifyRefinements() {
  console.log('🔍 Verifying if refinements were applied...\n');
  
  // Check a sample of AI descriptions
  const { data, error } = await supabase
    .from('bookstores')
    .select('id, name, ai_generated_description, updated_at')
    .eq('description_source', 'ai')
    .not('ai_generated_description', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No AI descriptions found');
    return;
  }
  
  console.log('Sample of recently updated descriptions:\n');
  data.forEach((b, i) => {
    const len = b.ai_generated_description?.length || 0;
    const preview = b.ai_generated_description?.substring(0, 120) || '';
    const updated = b.updated_at ? new Date(b.updated_at).toLocaleString() : 'N/A';
    console.log(`${i + 1}. [${b.id}] ${b.name}`);
    console.log(`   Length: ${len} chars`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Preview: ${preview}...\n`);
  });
  
  // Check total count
  const { count } = await supabase
    .from('bookstores')
    .select('*', { count: 'exact', head: true })
    .eq('description_source', 'ai')
    .not('ai_generated_description', 'is', null);
  
  console.log(`\nTotal AI descriptions in database: ${count}`);
  
  // Check how many were updated today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  
  const { count: todayCount } = await supabase
    .from('bookstores')
    .select('*', { count: 'exact', head: true })
    .eq('description_source', 'ai')
    .not('ai_generated_description', 'is', null)
    .gte('updated_at', todayISO);
  
  console.log(`AI descriptions updated today: ${todayCount}`);
  
  // Check average length
  const { data: allData } = await supabase
    .from('bookstores')
    .select('ai_generated_description')
    .eq('description_source', 'ai')
    .not('ai_generated_description', 'is', null)
    .limit(100);
  
  if (allData) {
    const lengths = allData.map(b => b.ai_generated_description?.length || 0).filter(l => l > 0);
    const avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
    const inRange = lengths.filter(l => l >= 150 && l <= 400).length;
    
    console.log(`Average description length: ${avgLength} chars`);
    console.log(`In target range (150-400): ${inRange}/${lengths.length} (${(inRange/lengths.length*100).toFixed(1)}%)`);
  }
  
  if (todayCount && todayCount < (count || 0)) {
    console.log(`\n⚠️  WARNING: Only ${todayCount} out of ${count} descriptions were updated today.`);
    console.log(`   The refinement script may not have completed.`);
    console.log(`   Expected to update all ${count} AI descriptions.`);
  }
}

verifyRefinements().catch(console.error);

