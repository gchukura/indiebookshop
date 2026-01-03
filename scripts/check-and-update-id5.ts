#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkAndUpdate() {
  const bookshopId = 5;
  
  // First check if the record exists
  const { data: existing, error: checkError } = await supabase
    .from('bookstores')
    .select('id, name, ai_generated_description')
    .eq('id', bookshopId)
    .single();
  
  if (checkError || !existing) {
    console.log(`⚠️ No record found with ID ${bookshopId}`);
    console.log('Checking nearby IDs...');
    
    const { data: nearby } = await supabase
      .from('bookstores')
      .select('id, name')
      .in('id', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      .order('id');
    
    if (nearby && nearby.length > 0) {
      console.log('Available IDs:');
      nearby.forEach(b => console.log(`  - ID ${b.id}: ${b.name}`));
    }
    return;
  }
  
  console.log(`Found record: ${existing.name} (ID: ${existing.id})`);
  console.log(`Current description: ${existing.ai_generated_description ? 'Has description' : 'NULL'}`);
  console.log('\nUpdating to NULL...');
  
  const { data, error } = await supabase
    .from('bookstores')
    .update({
      ai_generated_description: null,
      description_validated: null,
      description_source: null,
      description_generated_at: null
    })
    .eq('id', bookshopId)
    .select('id, name, ai_generated_description');
  
  if (error) {
    console.error('❌ Error:', error);
  } else if (data && data.length > 0) {
    console.log(`✅ Successfully updated: ${data[0].name} (ID: ${data[0].id})`);
    console.log(`   ai_generated_description: ${data[0].ai_generated_description === null ? 'NULL ✓' : 'NOT NULL'}`);
  }
}

checkAndUpdate().catch(console.error);

