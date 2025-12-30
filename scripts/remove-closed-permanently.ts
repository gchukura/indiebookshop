#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Find all bookshops marked as CLOSED_PERMANENTLY
 */
async function findClosedPermanentlyBookshops() {
  console.log('🔍 Finding bookshops marked as CLOSED_PERMANENTLY...\n');

  // Fetch all bookshops in batches to handle Supabase's 1000 row limit
  let allBookshops: any[] = [];
  let offset = 0;
  const BATCH_SIZE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: bookshops, error } = await supabase
      .from('bookstores')
      .select('id, name, street, city, state, zip, business_status')
      .eq('business_status', 'CLOSED_PERMANENTLY')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Error fetching bookshops:', error);
      return [];
    }

    if (!bookshops || bookshops.length === 0) {
      hasMore = false;
    } else {
      allBookshops = allBookshops.concat(bookshops);
      offset += BATCH_SIZE;
      hasMore = bookshops.length === BATCH_SIZE;
    }
  }

  return allBookshops;
}

/**
 * Delete bookshops by IDs
 */
async function deleteBookshops(ids: number[]) {
  if (ids.length === 0) {
    console.log('No bookshops to delete.');
    return { deleted: 0, errors: [] };
  }

  console.log(`\n🗑️  Deleting ${ids.length} bookshop(s)...\n`);

  const { data, error } = await supabase
    .from('bookstores')
    .delete()
    .in('id', ids)
    .select('id, name');

  if (error) {
    console.error('❌ Error deleting bookshops:', error);
    return { deleted: 0, errors: [error.message] };
  }

  return { deleted: data?.length || 0, errors: [] };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('--test');

  try {
    // Find all closed permanently bookshops
    const closedBookshops = await findClosedPermanentlyBookshops();

    if (closedBookshops.length === 0) {
      console.log('✅ No bookshops marked as CLOSED_PERMANENTLY found.');
      return;
    }

    console.log(`\n📋 Found ${closedBookshops.length} bookshop(s) marked as CLOSED_PERMANENTLY:\n`);
    console.log('═══════════════════════════════════════');
    closedBookshops.forEach((b, index) => {
      const address = [b.street, b.city, b.state, b.zip].filter(Boolean).join(', ');
      console.log(`${index + 1}. ID: ${b.id} | ${b.name}`);
      if (address) {
        console.log(`   ${address}`);
      }
    });
    console.log('═══════════════════════════════════════\n');

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No bookshops will be deleted.');
      console.log('   Run without --dry-run or --test to actually delete them.\n');
      return;
    }

    // Confirm deletion
    const ids = closedBookshops.map(b => b.id);
    const result = await deleteBookshops(ids);

    if (result.errors.length > 0) {
      console.error('❌ Errors occurred during deletion:');
      result.errors.forEach(err => console.error(`   - ${err}`));
    }

    console.log(`\n✅ Successfully deleted ${result.deleted} bookshop(s).\n`);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);

