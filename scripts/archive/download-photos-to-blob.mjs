/**
 * One-time migration: download Google Places photos → Vercel Blob CDN.
 *
 * For every bookstore row that has a `google_photos` reference but no
 * `image_url`, this script:
 *   1. Fetches the first photo from the Google Places API
 *   2. Uploads it to Vercel Blob under  bookshops/<id>-<slug>.jpg
 *   3. Writes the permanent CDN URL back to the Sheet's `image_url` column
 *
 * Safe to re-run: rows that already have an image_url are skipped.
 *
 * Prerequisites
 * -------------
 *   GOOGLE_SHEETS_ID                – from your .env
 *   GOOGLE_SERVICE_ACCOUNT_CREDENTIALS – from your .env
 *   GOOGLE_PLACES_API_KEY           – from your .env
 *   BLOB_READ_WRITE_TOKEN           – Vercel project → Storage → your Blob store
 *
 * Usage
 * -----
 *   node --env-file=.env scripts/download-photos-to-blob.mjs
 *
 * Options (set as env vars)
 *   PHOTO_MAX_WIDTH   pixel width to request from Google (default: 800)
 *   BATCH_WRITE_SIZE  sheet rows to buffer before flushing (default: 20)
 *   DELAY_MS          ms between Google API requests     (default: 150)
 *   DRY_RUN=1         log what would happen, don't write anything
 */

import { google } from 'googleapis';
import { put } from '@vercel/blob';

// ─── Config ──────────────────────────────────────────────────────────────────

const SPREADSHEET_ID   = process.env.GOOGLE_SHEETS_ID;
const PLACES_API_KEY   = process.env.GOOGLE_PLACES_API_KEY;
const SHEET            = 'Bookstores';
const PHOTO_MAX_WIDTH  = parseInt(process.env.PHOTO_MAX_WIDTH  || '800',  10);
const BATCH_WRITE_SIZE = parseInt(process.env.BATCH_WRITE_SIZE || '20',   10);
const DELAY_MS         = parseInt(process.env.DELAY_MS         || '150',  10);
const DRY_RUN          = process.env.DRY_RUN === '1';

if (!SPREADSHEET_ID)  throw new Error('GOOGLE_SHEETS_ID not set');
if (!PLACES_API_KEY)  throw new Error('GOOGLE_PLACES_API_KEY not set');
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not set');

if (DRY_RUN) console.log('⚠️  DRY RUN – no writes will happen\n');

// ─── Google Sheets auth ───────────────────────────────────────────────────────

const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
const auth = new google.auth.JWT(
  creds.client_email, null, creds.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']   // read+write
);
const sheets = google.sheets({ version: 'v4', auth });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Convert 0-based column index → Sheet letter (0→A, 25→Z, 26→AA …) */
function colLetter(idx) {
  let s = '';
  for (let n = idx + 1; n > 0; ) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Extract the first photo_reference from a raw google_photos cell value. */
function firstPhotoRef(raw) {
  if (!raw || raw === '') return null;
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const first = arr[0];
    if (typeof first === 'string') return first.trim() || null;
    const ref = (first?.photo_reference ?? first?.photoReference ?? '').trim();
    return ref || null;
  } catch {
    return null;
  }
}

/** Fetch image bytes from Google Places Photo API. Follows redirect automatically. */
async function fetchGooglePhoto(photoRef) {
  const isNewApi = photoRef.startsWith('places/');
  const url = isNewApi
    ? `https://places.googleapis.com/v1/${photoRef.endsWith('/media') ? photoRef : photoRef + '/media'}?maxWidthPx=${PHOTO_MAX_WIDTH}&key=${PLACES_API_KEY}`
    : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${PHOTO_MAX_WIDTH}&photo_reference=${encodeURIComponent(photoRef)}&key=${PLACES_API_KEY}`;

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Google Places API ${res.status}: ${msg.slice(0, 120)}`);
  }
  return {
    buffer:      await res.arrayBuffer(),
    contentType: res.headers.get('content-type') || 'image/jpeg',
  };
}

/** Upload buffer to Vercel Blob; returns the public CDN URL. */
async function uploadBlob(bookshopId, bookshopName, buffer, contentType) {
  const slug = (bookshopName || `id-${bookshopId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  const ext  = contentType.includes('png') ? 'png' : 'jpg';
  const path = `bookshops/${bookshopId}-${slug}.${ext}`;

  const { url } = await put(path, buffer, {
    access:            'public',
    contentType,
    addRandomSuffix:   false,  // deterministic paths → safe to re-upload
  });
  return url;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('Reading sheet…');
const sheetRes = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range:         `${SHEET}!A1:AZ`,
});
const [headers, ...rows] = sheetRes.data.values ?? [];
if (!headers) throw new Error('Sheet appears empty');

// Locate required columns
const idCol         = headers.findIndex(h => /^id$/i.test(h));
const nameCol       = headers.findIndex(h => /^name$/i.test(h));
const photosCol     = headers.findIndex(h => /^google_photos$/i.test(h));
let   imageUrlCol   = headers.findIndex(h => /^image_?url$/i.test(h));

if (photosCol === -1) throw new Error('google_photos column not found in Sheet');

// Create image_url column if it doesn't exist yet
if (imageUrlCol === -1) {
  imageUrlCol = headers.length;
  if (!DRY_RUN) {
    await sheets.spreadsheets.values.update({
      spreadsheetId:   SPREADSHEET_ID,
      range:           `${SHEET}!${colLetter(imageUrlCol)}1`,
      valueInputOption: 'RAW',
      requestBody:     { values: [['image_url']] },
    });
  }
  console.log(`Created image_url column at ${colLetter(imageUrlCol)}1`);
}

console.log(`Columns → id:${idCol}  name:${nameCol}  google_photos:${photosCol}  image_url:${colLetter(imageUrlCol)}\n`);

// Count how many rows actually need work
const todo = rows.filter((r, i) => {
  const existing = (r[imageUrlCol] || '').trim();
  return !existing.startsWith('http') && firstPhotoRef(r[photosCol]);
});
console.log(`${rows.length} total rows  |  ${todo.length} need photos  |  ${rows.length - todo.length} already done\n`);

// ─── Process rows ─────────────────────────────────────────────────────────────

let processed = 0, skipped = 0, failed = 0;
const pending = [];  // [{rowIndex, url}] — flushed in batches

async function flushPending() {
  if (pending.length === 0 || DRY_RUN) {
    pending.length = 0;
    return;
  }
  const data = pending.map(({ rowIndex, url }) => ({
    range:  `${SHEET}!${colLetter(imageUrlCol)}${rowIndex + 2}`,  // +2: header + 1-based
    values: [[url]],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody:   { valueInputOption: 'RAW', data },
  });
  console.log(`  ↳ wrote ${pending.length} URLs to Sheet`);
  pending.length = 0;
}

for (let i = 0; i < rows.length; i++) {
  const row   = rows[i];
  const existing = (row[imageUrlCol] || '').trim();

  // Already migrated
  if (existing.startsWith('http')) {
    skipped++;
    continue;
  }

  const photoRef = firstPhotoRef(row[photosCol]);
  if (!photoRef) {
    skipped++;
    continue;
  }

  const id   = row[idCol]   || String(i + 1);
  const name = row[nameCol] || `bookshop-${id}`;
  const pct  = `[${i + 1}/${rows.length}]`;

  try {
    process.stdout.write(`${pct} ${name.slice(0, 45).padEnd(45)} `);

    if (DRY_RUN) {
      console.log('(dry run)');
      processed++;
      continue;
    }

    const { buffer, contentType } = await fetchGooglePhoto(photoRef);
    const blobUrl = await uploadBlob(id, name, buffer, contentType);
    console.log(`✓  ${blobUrl}`);

    pending.push({ rowIndex: i, url: blobUrl });
    processed++;

    if (pending.length >= BATCH_WRITE_SIZE) {
      await flushPending();
    }

    await sleep(DELAY_MS);

  } catch (err) {
    console.log(`✗  ${err.message}`);
    failed++;
    await sleep(DELAY_MS * 2);  // back off a bit on errors
  }
}

await flushPending();

console.log(`
┌─────────────────────────────────┐
│  Migration complete              │
│  ✓ Uploaded  : ${String(processed).padStart(5)}              │
│  ─ Skipped   : ${String(skipped).padStart(5)}              │
│  ✗ Failed    : ${String(failed).padStart(5)}              │
└─────────────────────────────────┘`);

if (failed > 0) {
  console.log('\nFailed rows had stale/invalid photo references.');
  console.log('Re-run the script after refreshing refs, or ignore them (Unsplash fallback applies).');
}

// Clean up temp probe file if it exists
import { unlink } from 'fs/promises';
await unlink(new URL('../probe-photos.mjs', import.meta.url)).catch(() => {});
