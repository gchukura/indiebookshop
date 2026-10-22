/**
 * Migrate bookshop photos from Supabase Storage → Cloudflare R2.
 *
 * Strategy:
 *   1. Read all rows from Google Sheets
 *   2. For rows whose image_url still points to supabase.co:
 *        a. Download the image from Supabase using the service-role key
 *           (bypasses the public bandwidth quota that caused 403s)
 *        b. Upload to Cloudflare R2
 *        c. Write the new R2 public URL back to the Sheet
 *   3. Rows already on R2 (or with no URL) are skipped.
 *
 * Safe to re-run: idempotent — already-migrated rows are skipped.
 *
 * Prerequisites (.env):
 *   GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_CREDENTIALS
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME   — name of your R2 bucket (e.g. "bookshop-photos")
 *   R2_PUBLIC_URL    — public base URL for the bucket
 *                      e.g. https://pub-xxxx.r2.dev  OR  https://photos.yourdomain.com
 *
 * Usage:
 *   node --env-file=.env scripts/migrate-photos-to-r2.mjs
 *
 * Options (env vars):
 *   BATCH_WRITE_SIZE  rows to buffer before flushing to Sheet  (default: 20)
 *   DELAY_MS          ms between downloads                      (default: 100)
 *   DRY_RUN=1         log only — no downloads, uploads, or Sheet writes
 */

import { google } from 'googleapis';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// ─── Config ──────────────────────────────────────────────────────────────────

const SPREADSHEET_ID     = process.env.GOOGLE_SHEETS_ID;
const SUPABASE_URL       = process.env.SUPABASE_URL;
const SUPABASE_SVC_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID      = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID   = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY      = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET          = process.env.R2_BUCKET_NAME   || 'bookshop-photos';
const R2_PUBLIC_URL      = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const SHEET              = 'Bookstores';
const BATCH_WRITE_SIZE   = parseInt(process.env.BATCH_WRITE_SIZE || '20', 10);
const DELAY_MS           = parseInt(process.env.DELAY_MS         || '100', 10);
const DRY_RUN            = process.env.DRY_RUN === '1';

// Validate required env vars
const missing = [];
if (!SPREADSHEET_ID)   missing.push('GOOGLE_SHEETS_ID');
if (!SUPABASE_URL)     missing.push('SUPABASE_URL');
if (!SUPABASE_SVC_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
if (!R2_ACCOUNT_ID)    missing.push('R2_ACCOUNT_ID');
if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
if (!R2_SECRET_KEY)    missing.push('R2_SECRET_ACCESS_KEY');
if (!R2_PUBLIC_URL)    missing.push('R2_PUBLIC_URL');
if (missing.length)    throw new Error(`Missing env vars: ${missing.join(', ')}`);

if (DRY_RUN) console.log('⚠️  DRY RUN — no writes will happen\n');

// ─── Clients ─────────────────────────────────────────────────────────────────

// Google Sheets
const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
const auth  = new google.auth.JWT(
  creds.client_email, null, creds.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });

// Cloudflare R2 (S3-compatible)
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_KEY,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** 0-based column index → Sheet letter (0→A, 25→Z, 26→AA …) */
function colLetter(idx) {
  let s = '';
  for (let n = idx + 1; n > 0;) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Derive the R2 object key from the bookshop id + name. */
function r2Key(id, name) {
  const slug = (name || `id-${id}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `bookshops/${id}-${slug}.jpg`;
}

/** Check if an object already exists in R2 (skip re-upload). */
async function existsInR2(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Download a file from Supabase Storage using the service-role key.
 * This bypasses the public bandwidth quota that causes 403s on the anon URL.
 */
async function downloadFromSupabase(supabaseUrl) {
  // Convert public URL to authenticated download URL.
  // Public:        https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
  // Authenticated: https://<ref>.supabase.co/storage/v1/object/<bucket>/<path>
  //   (without /public/ in the path, with Bearer header)
  const url = supabaseUrl.replace('/object/public/', '/object/');

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPABASE_SVC_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase download ${res.status}: ${text.slice(0, 120)}`);
  }
  return {
    buffer:      await res.arrayBuffer(),
    contentType: res.headers.get('content-type') || 'image/jpeg',
  };
}

/** Upload a buffer to Cloudflare R2; returns the public URL. */
async function uploadToR2(key, buffer, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket:      R2_BUCKET,
    Key:         key,
    Body:        Buffer.from(buffer),
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('Reading sheet…');
const sheetRes = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range:         `${SHEET}!A1:AZ`,
});
const [headers, ...rows] = sheetRes.data.values ?? [];
if (!headers) throw new Error('Sheet appears empty');

const idCol       = headers.findIndex(h => /^id$/i.test(h));
const nameCol     = headers.findIndex(h => /^name$/i.test(h));
const imageUrlCol = headers.findIndex(h => /^image_?url$/i.test(h));

if (idCol === -1)       throw new Error('"id" column not found');
if (nameCol === -1)     throw new Error('"name" column not found');
if (imageUrlCol === -1) throw new Error('"image_url" column not found');

// Identify rows that need migration
const todo = rows.reduce((acc, r, i) => {
  const existing = (r[imageUrlCol] || '').trim();
  if (existing.includes('supabase.co')) acc.push(i);
  return acc;
}, []);

const alreadyR2   = rows.filter(r => (r[imageUrlCol] || '').includes(R2_PUBLIC_URL)).length;
const noUrl       = rows.filter(r => !(r[imageUrlCol] || '').startsWith('http')).length;

console.log([
  `${rows.length} total rows`,
  `${todo.length} on Supabase (to migrate)`,
  `${alreadyR2} already on R2`,
  `${noUrl} with no URL`,
].join('  |  ') + '\n');

if (todo.length === 0) {
  console.log('Nothing to migrate — all rows already have non-Supabase URLs.');
  process.exit(0);
}

// ─── Process ──────────────────────────────────────────────────────────────────

let uploaded = 0, skippedExists = 0, failed = 0;
const pending = []; // { rowIndex, url }

async function flushPending() {
  if (pending.length === 0 || DRY_RUN) { pending.length = 0; return; }
  const data = pending.map(({ rowIndex, url }) => ({
    range:  `${SHEET}!${colLetter(imageUrlCol)}${rowIndex + 2}`,
    values: [[url]],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody:   { valueInputOption: 'RAW', data },
  });
  console.log(`  ↳ wrote ${pending.length} URLs to Sheet`);
  pending.length = 0;
}

for (let t = 0; t < todo.length; t++) {
  const i           = todo[t];
  const row         = rows[i];
  const id          = (row[idCol]   || String(i + 1)).trim();
  const name        = (row[nameCol] || `bookshop-${id}`).trim();
  const supabaseUrl = (row[imageUrlCol] || '').trim();
  const key         = r2Key(id, name);
  const pct         = `[${t + 1}/${todo.length}]`;

  process.stdout.write(`${pct} ${name.slice(0, 45).padEnd(45)} `);

  if (DRY_RUN) {
    console.log(`(dry run) → ${key}`);
    uploaded++;
    continue;
  }

  try {
    // Skip if already uploaded to R2 (safe re-run)
    if (await existsInR2(key)) {
      const publicUrl = `${R2_PUBLIC_URL}/${key}`;
      console.log(`⟳  already in R2`);
      // Still update the Sheet if it still has the Supabase URL
      pending.push({ rowIndex: i, url: publicUrl });
      skippedExists++;
    } else {
      // Download from Supabase (service key bypasses quota)
      const { buffer, contentType } = await downloadFromSupabase(supabaseUrl);
      // Upload to R2
      const publicUrl = await uploadToR2(key, buffer, contentType);
      console.log(`✓  ${publicUrl}`);
      pending.push({ rowIndex: i, url: publicUrl });
      uploaded++;
    }

    if (pending.length >= BATCH_WRITE_SIZE) await flushPending();
    await sleep(DELAY_MS);

  } catch (err) {
    console.log(`✗  ${err.message}`);
    failed++;
    await sleep(DELAY_MS * 5);
  }
}

await flushPending();

console.log(`
┌─────────────────────────────────────────┐
│  Migration to Cloudflare R2 complete     │
│  ✓ Uploaded      : ${String(uploaded).padStart(5)}                  │
│  ⟳ Already in R2 : ${String(skippedExists).padStart(5)}                  │
│  ✗ Failed        : ${String(failed).padStart(5)}                  │
└─────────────────────────────────────────┘`);

if (failed > 0) {
  console.log('\nFailed rows still point to Supabase. Re-run to retry, or check SUPABASE_SERVICE_ROLE_KEY.');
}
