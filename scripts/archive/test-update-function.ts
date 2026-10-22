#!/usr/bin/env tsx

/**
 * Test the update_ai_description function
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testFunction() {
  console.log('🧪 Testing update_ai_description function...\n');

  // First, get a test bookshop ID
  const { data: bookshop, error: fetchError } = await supabase
    .from('bookstores')
    .select('id, name')
    .limit(1)
    .single();

  if (fetchError || !bookshop) {
    console.error('❌ Error fetching test bookshop:', fetchError);
    process.exit(1);
  }

  console.log(`Testing with bookshop: ${bookshop.name} (ID: ${bookshop.id})\n`);

  // Try calling the function
  const { data, error } = await supabase.rpc('update_ai_description', {
    p_bookshop_id: bookshop.id,
    p_description: 'Test description',
    p_generated_at: new Date().toISOString()
  });

  if (error) {
    console.error('❌ Function call failed:');
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
    
    if (error.code === '42883' || error.message?.includes('does not exist')) {
      console.error('\n⚠️  Function does not exist. Please run:');
      console.error('   migrations/create-update-function.sql');
    } else if (error.code === '42501') {
      console.error('\n⚠️  Permission denied. The function may need EXECUTE permissions granted.');
    }
    process.exit(1);
  }

  console.log('✅ Function call succeeded!');
  console.log('   Response:', data);
  
  // Verify the update worked
  const { data: updated, error: verifyError } = await supabase
    .from('bookstores')
    .select('ai_generated_description, description_generated_at')
    .eq('id', bookshop.id)
    .single();

  if (verifyError) {
    console.error('⚠️  Could not verify update:', verifyError);
  } else {
    console.log('\n✅ Update verified:');
    console.log('   Description:', updated.ai_generated_description?.substring(0, 50) + '...');
    console.log('   Generated at:', updated.description_generated_at);
  }
}

testFunction()
  .then(() => {
    console.log('\n✨ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });



