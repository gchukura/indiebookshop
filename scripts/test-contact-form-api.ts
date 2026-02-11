/**
 * Test that the contact form API accepts a submission and writes to contact_messages.
 *
 * Usage:
 *   1. Start the Next dev server: npm run dev:next
 *   2. Run this script: npx tsx scripts/test-contact-form-api.ts
 *
 * Optional: set BASE_URL to test a different host (e.g. BASE_URL=https://staging.example.com)
 *
 * If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set (e.g. from .env), the script
 * will also verify that a row was inserted in contact_messages.
 */

import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const payload = {
  name: 'Contact Form Test User',
  email: `contact-form-test-${Date.now()}@example.com`,
  reason: 'general',
  subject: 'Test submission from script',
  message: 'This is a test message to verify the contact form writes to the database.',
};

async function main(): Promise<void> {
  console.log('Testing contact form API:', BASE_URL + '/api/contact');
  console.log('Payload:', JSON.stringify(payload, null, 2));

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Request failed. Is the dev server running? (npm run dev:next)\n', err);
    process.exit(1);
  }

  const text = await response.text();
  let data: { message?: string };
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }

  if (!response.ok) {
    console.error('API returned', response.status, data?.message || text);
    process.exit(1);
  }

  console.log('API response:', response.status, data?.message || text);
  console.log('Form submission accepted by API.');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: rows, error } = await supabase
      .from('contact_messages')
      .select('id, name, email, reason, subject, message, created_at')
      .eq('email', payload.email)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase read failed:', error.message);
      console.log('Table may not exist yet. Run migrations/create-contact-messages.sql in Supabase SQL Editor.');
      process.exit(1);
    }

    if (!rows?.length) {
      console.error('No row found in contact_messages with email', payload.email);
      process.exit(1);
    }

    const row = rows[0];
    const match =
      row.name === payload.name &&
      row.email === payload.email &&
      row.reason === payload.reason &&
      row.subject === payload.subject &&
      row.message === payload.message;

    if (!match) {
      console.error('Row in DB did not match payload:', row);
      process.exit(1);
    }

    console.log('Verified row in contact_messages:', row.id, row.created_at);
    console.log('Contact form writes successfully to the table.');
  } else {
    console.log('Supabase env not set; skipping DB verification. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to verify the row was inserted.');
  }
}

main();
