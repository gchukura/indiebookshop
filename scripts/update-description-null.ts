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

async function updateDescription() {
  const bookshopId = 5;
  
  console.log(`Updating AI description for record ID ${bookshopId} to NULL...`);
  
  const { data, error } = await supabase
    .from('bookstores')
    .update({
      ai_generated_description: null,
      description_validated: null,
      description_source: null,
      description_generated_at: null
    })
    .eq('id', bookshopId)
    .select('id, name');
  
  if (error) {
    console.error('❌ Error:', error);
  } else if (data && data.length > 0) {
    console.log(`✅ Successfully updated: ${data[0].name} (ID: ${data[0].id})`);
    console.log('   - ai_generated_description: NULL');
    console.log('   - description_validated: NULL');
    console.log('   - description_source: NULL');
    console.log('   - description_generated_at: NULL');
  } else {
    console.log(`⚠️ No record found with ID ${bookshopId}`);
  }
}

updateDescription().catch(console.error);

