/**
 * Migrate bookshop photos to Supabase Storage.
 *
 * Processes rows that have no imageUrl OR still have a blocked Vercel Blob URL.
 * For each, fetches a fresh photo from Google Places and uploads to the
 * Supabase Storage public bucket "bookshop-photos".
 *
 * Safe to re-run: skips rows that already have a Supabase URL.
 *
 * Prerequisites (all already in .env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, GOOGLE_PLACES_API_KEY
 *
 * Usage:
 *   node --env-file=.env scripts/migrate-photos-to-supabase.mjs
 *
 * Options (env vars):
 *   PHOTO_MAX_WIDTH    pixel width requested from Google  (default: 800)
 *   BATCH_WRITE_SIZE   rows buffered before Sheet flush   (default: 20)
 *   DELAY_MS           ms between Google API calls        (default: 300)
 *   DRY_RUN=1          log only, no writes
 */

import { google } from 'googleapis';

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SPREADSHEET_ID           = process.env.GOOGLE_SHEETS_ID;
const PLACES_API_KEY           = process.env.GOOGLE_PLACES_API_KEY;
const SHEET                    = 'Bookstores';
const BUCKET                   = 'bookshop-photos';
const PHOTO_MAX_WIDTH          = parseInt(process.env.PHOTO_MAX_WIDTH  || '800', 10);
const BATCH_WRITE_SIZE         = parseInt(process.env.BATCH_WRITE_SIZE || '20',  10);
const DELAY_MS                 = parseInt(process.env.DELAY_MS         || '300', 10);
const DRY_RUN                  = process.env.DRY_RUN === '1';

if (!SUPABASE_URL)         throw new Error('SUPABASE_URL not set');
if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
if (!SPREADSHEET_ID)       throw new Error('GOOGLE_SHEETS_ID not set');
if (!PLACES_API_KEY)       throw new Error('GOOGLE_PLACES_API_KEY not set');

if (DRY_RUN) console.log('⚠️  DRY RUN – no writes will happen\n');

// ─── Google Sheets auth ───────────────────────────────────────────────────────

const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
const auth = new google.auth.JWT(
  creds.client_email, null, creds.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function colLetter(idx) {
  let s = '';
  for (let n = idx + 1; n > 0;) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Create the public Supabase Storage bucket (idempotent). */
async function ensureBucket() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (res.ok) {
    console.log(`✓ Created bucket "${BUCKET}"`);
  } else {
    const body = await res.json().catch(() => ({}));
    if (body.error === 'Duplicate') {
      console.log(`  Bucket "${BUCKET}" already exists`);
    } else {
      throw new Error(`Failed to create/verify bucket: ${JSON.stringify(body)}`);
    }
  }
}

/** Fetch fresh photo_reference from Places Details API. */
async function fetchFreshPhotoRef(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${PLACES_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places Details API ${res.status}`);
  const json = await res.json();
  if (json.status !== 'OK') throw new Error(`Places API status: ${json.status}`);
  const photos = json.result?.photos;
  if (!Array.isArray(photos) || photos.length === 0) return null;
  return photos[0].photo_reference ?? null;
}

/** Fetch image bytes from the Legacy Places Photo API. */
async function fetchPhoto(photoRef) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${PHOTO_MAX_WIDTH}&photo_reference=${encodeURIComponent(photoRef)}&key=${PLACES_API_KEY}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Places Photo API ${res.status}: ${msg.slice(0, 100)}`);
  }
  return {
    buffer:      await res.arrayBuffer(),
    contentType: res.headers.get('content-type') || 'image/jpeg',
  };
}

/** Upload to Supabase Storage; returns the public URL. */
async function uploadToSupabase(bookshopId, bookshopName, buffer, contentType) {
  const slug = (bookshopName || `id-${bookshopId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  const ext  = contentType.includes('png') ? 'png' : 'jpg';
  const path = `${bookshopId}-${slug}.${ext}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  contentType,
      'x-upsert':      'true',   // overwrite if already exists
    },
    body: buffer,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase upload ${res.status}: ${body.slice(0, 100)}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

await ensureBucket();

console.log('\nReading sheet…');
const sheetRes = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range:         `${SHEET}!A1:AZ`,
});
const [headers, ...rows] = sheetRes.data.values ?? [];
if (!headers) throw new Error('Sheet appears empty');

const idCol       = headers.findIndex(h => /^id$/i.test(h));
const nameCol     = headers.findIndex(h => /^name$/i.test(h));
const placeIdCol  = headers.findIndex(h => /^google_place_id$/i.test(h));
const imageUrlCol = headers.findIndex(h => /^image_?url$/i.test(h));

if (placeIdCol  === -1) throw new Error('google_place_id column not found');
if (imageUrlCol === -1) throw new Error('imageUrl column not found');

// Target:
//   1. Rows with no imageUrl (never migrated)
//   2. Rows with a blocked Vercel Blob URL (need re-migration)
// Skip rows that already have a Supabase URL.
const todo = rows.reduce((acc, r, i) => {
  const existing      = (r[imageUrlCol] || '').trim();
  const isSupabase    = existing.includes('supabase.co');
  const isVercelBlob  = existing.includes('vercel-storage.com');
  const isEmpty       = !existing.startsWith('http');
  const hasPlaceId    = (r[placeIdCol]  || '').trim().length > 0;
  if (!isSupabase && (isEmpty || isVercelBlob) && hasPlaceId) acc.push(i);
  return acc;
}, []);

const alreadyDone = rows.filter(r =>
  (r[imageUrlCol] || '').includes('supabase.co')
).length;

console.log(`${rows.length} total  |  ${todo.length} to migrate  |  ${alreadyDone} already on Supabase\n`);

if (todo.length === 0) {
  console.log('Nothing to do — all rows already have Supabase URLs.');
  process.exit(0);
}

// ─── Process rows ─────────────────────────────────────────────────────────────

let uploaded = 0, noPhoto = 0, failed = 0;
const pending = [];

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
  const i       = todo[t];
  const row     = rows[i];
  const id      = row[idCol]      || String(i + 1);
  const name    = row[nameCol]    || `bookshop-${id}`;
  const placeId = (row[placeIdCol] || '').trim();
  const pct     = `[${t + 1}/${todo.length}]`;

  try {
    process.stdout.write(`${pct} ${name.slice(0, 45).padEnd(45)} `);

    if (DRY_RUN) { console.log(`(dry run) place_id=${placeId}`); uploaded++; continue; }

    // Step 1: fresh photo_reference from Places Details
    const photoRef = await fetchFreshPhotoRef(placeId);
    await sleep(DELAY_MS);

    if (!photoRef) {
      console.log('— no photos on Places');
      noPhoto++;
      continue;
    }

    // Step 2: download image bytes
    const { buffer, contentType } = await fetchPhoto(photoRef);
    await sleep(DELAY_MS);

    // Step 3: upload to Supabase Storage
    const supabaseUrl = await uploadToSupabase(id, name, buffer, contentType);
    console.log(`✓  ${supabaseUrl}`);

    pending.push({ rowIndex: i, url: supabaseUrl });
    uploaded++;

    if (pending.length >= BATCH_WRITE_SIZE) await flushPending();

  } catch (err) {
    console.log(`✗  ${err.message}`);
    failed++;
    await sleep(DELAY_MS * 3);
  }
}

await flushPending();

console.log(`
┌────────────────────────────────────┐
│  Migration to Supabase complete     │
│  ✓ Uploaded  : ${String(uploaded).padStart(5)}                 │
│  — No photo  : ${String(noPhoto).padStart(5)}                 │
│  ✗ Failed    : ${String(failed).padStart(5)}                 │
└────────────────────────────────────┘`);
