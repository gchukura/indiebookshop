#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkStatus() {
  // Count total bookshops with google_place_id
  const { count: totalWithPlaceId } = await supabase
    .from('bookstores')
    .select('*', { count: 'exact', head: true })
    .not('google_place_id', 'is', null);

  // Count bookshops with google_place_id but missing contact_data_fetched_at
  const { count: needContactData } = await supabase
    .from('bookstores')
    .select('*', { count: 'exact', head: true })
    .not('google_place_id', 'is', null)
    .is('contact_data_fetched_at', null);

  // Count bookshops with contact_data_fetched_at
  const { count: haveContactData } = await supabase
    .from('bookstores')
    .select('*', { count: 'exact', head: true })
    .not('google_place_id', 'is', null)
    .not('contact_data_fetched_at', 'is', null);

  console.log('═══════════════════════════════════════');
  console.log('CONTACT DATA ENRICHMENT STATUS');
  console.log('═══════════════════════════════════════');
  console.log(`Total bookshops with google_place_id: ${totalWithPlaceId}`);
  console.log(`✓ Have contact data: ${haveContactData}`);
  console.log(`⚠ Need contact data: ${needContactData}`);
  console.log('═══════════════════════════════════════\n');

  if (needContactData && needContactData > 0) {
    console.log(`⚠️  ${needContactData} bookshops still need contact data enrichment.`);
    console.log(`   Run: npx tsx scripts/enrich-google-contact-data.ts\n`);
  } else {
    console.log('✅ All bookshops with google_place_id have contact data!\n');
  }
}

checkStatus().catch(console.error);

