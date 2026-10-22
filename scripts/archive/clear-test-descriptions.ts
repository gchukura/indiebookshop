#!/usr/bin/env tsx

/**
 * Clear test AI descriptions from database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function clearTestDescriptions() {
  console.log('Clearing test AI descriptions...\n');

  // First, get the list of bookshops with descriptions
  const { data: bookshops, error: fetchError } = await supabase
    .from('bookstores')
    .select('id, name')
    .not('ai_generated_description', 'is', null);

  if (fetchError) {
    console.error('Error fetching bookshops:', fetchError);
    process.exit(1);
  }

  if (!bookshops || bookshops.length === 0) {
    console.log('✓ No descriptions to clear');
    return;
  }

  console.log(`Found ${bookshops.length} bookshop(s) with descriptions\n`);

  // Try using RPC function if it exists, otherwise use direct update with error handling
  let cleared = 0;
  let failed = 0;

  for (const bookshop of bookshops) {
    try {
      // Try RPC function first
      const { error: rpcError } = await supabase.rpc('update_ai_description', {
        p_bookshop_id: bookshop.id,
        p_description: null,
        p_generated_at: null,
        p_validated: null
      });

      if (rpcError) {
        // If RPC fails, try direct update (might fail with geography error, but we'll continue)
        const { error: directError } = await supabase
          .from('bookstores')
          .update({
            ai_generated_description: null,
            description_generated_at: null,
            description_validated: null
          })
          .eq('id', bookshop.id);

        if (directError) {
          console.warn(`  ⚠️  Could not clear ${bookshop.name} (ID: ${bookshop.id})`);
          failed++;
        } else {
          cleared++;
        }
      } else {
        cleared++;
      }
    } catch (err: any) {
      console.warn(`  ⚠️  Error clearing ${bookshop.name} (ID: ${bookshop.id}):`, err.message);
      failed++;
    }
  }

  console.log(`\n✓ Cleared ${cleared} description(s)`);
  if (failed > 0) {
    console.log(`⚠️  Failed to clear ${failed} description(s) (geography error - migration may need to be run)`);
  }
  console.log('\nDone!');
}

clearTestDescriptions().catch(console.error);

