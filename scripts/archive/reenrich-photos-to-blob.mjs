/**
 * Re-enrichment pass: fetch fresh photo references via Google Places Details API
 * for bookstores that still have no image_url (stale/expired references from the
 * first migration pass), then upload to Vercel Blob and write CDN URLs to Sheet.
 *
 * Safe to re-run: skips rows that already have an image_url.
 *
 * Prerequisites: same env vars as download-photos-to-blob.mjs
 *   GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,
 *   GOOGLE_PLACES_API_KEY, BLOB_READ_WRITE_TOKEN
 *
 * Usage:
 *   node --env-file=.env scripts/reenrich-photos-to-blob.mjs
 *
 * Options (env vars):
 *   PHOTO_MAX_WIDTH    pixel width requested from Google  (default: 800)
 *   BATCH_WRITE_SIZE   rows buffered before Sheet flush   (default: 20)
 *   DELAY_MS           ms between Google API calls        (default: 300)
 *   DRY_RUN=1          log only, no writes
 */

import { google } from 'googleapis';
import { put } from '@vercel/blob';

// ─── Config ──────────────────────────────────────────────────────────────────

const SPREADSHEET_ID   = process.env.GOOGLE_SHEETS_ID;
const PLACES_API_KEY   = process.env.GOOGLE_PLACES_API_KEY;
const SHEET            = 'Bookstores';
const PHOTO_MAX_WIDTH  = parseInt(process.env.PHOTO_MAX_WIDTH  || '800', 10);
const BATCH_WRITE_SIZE = parseInt(process.env.BATCH_WRITE_SIZE || '20',  10);
const DELAY_MS         = parseInt(process.env.DELAY_MS         || '300', 10);
const DRY_RUN          = process.env.DRY_RUN === '1';

if (!SPREADSHEET_ID)  throw new Error('GOOGLE_SHEETS_ID not set');
if (!PLACES_API_KEY)  throw new Error('GOOGLE_PLACES_API_KEY not set');
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not set');

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
  for (let n = idx + 1; n > 0; ) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Fetch a fresh photo_reference for a place using the Legacy Places Details API.
 * Returns the first photo_reference string, or null if none available.
 */
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

/** Upload to Vercel Blob; returns the public CDN URL. */
async function uploadBlob(bookshopId, bookshopName, buffer, contentType) {
  const slug = (bookshopName || `id-${bookshopId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  const ext  = contentType.includes('png') ? 'png' : 'jpg';
  const { url } = await put(`bookshops/${bookshopId}-${slug}.${ext}`, buffer, {
    access:          'public',
    contentType,
    addRandomSuffix: false,
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

const idCol       = headers.findIndex(h => /^id$/i.test(h));
const nameCol     = headers.findIndex(h => /^name$/i.test(h));
const placeIdCol  = headers.findIndex(h => /^google_place_id$/i.test(h));
const imageUrlCol = headers.findIndex(h => /^image_?url$/i.test(h));

if (placeIdCol  === -1) throw new Error('google_place_id column not found');
if (imageUrlCol === -1) throw new Error('image_url column not found — run download-photos-to-blob.mjs first');

// Only target rows with a place_id but no image_url yet
const todo = rows.reduce((acc, r, i) => {
  const hasUrl     = (r[imageUrlCol] || '').trim().startsWith('http');
  const hasPlaceId = (r[placeIdCol]  || '').trim().length > 0;
  if (!hasUrl && hasPlaceId) acc.push(i);
  return acc;
}, []);

console.log(`${rows.length} total rows  |  ${todo.length} need re-enrichment  |  ${rows.length - todo.length} already done\n`);

if (todo.length === 0) {
  console.log('Nothing to do — all rows already have image URLs.');
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
  const i      = todo[t];
  const row    = rows[i];
  const id     = row[idCol]      || String(i + 1);
  const name   = row[nameCol]    || `bookshop-${id}`;
  const placeId = (row[placeIdCol] || '').trim();
  const pct    = `[${t + 1}/${todo.length}]`;

  try {
    process.stdout.write(`${pct} ${name.slice(0, 45).padEnd(45)} `);

    if (DRY_RUN) { console.log(`(dry run) place_id=${placeId}`); uploaded++; continue; }

    // Step 1: get fresh photo_reference from Places Details
    const photoRef = await fetchFreshPhotoRef(placeId);
    await sleep(DELAY_MS);

    if (!photoRef) {
      console.log('— no photos on Places');
      noPhoto++;
      continue;
    }

    // Step 2: fetch the image bytes
    const { buffer, contentType } = await fetchPhoto(photoRef);
    await sleep(DELAY_MS);

    // Step 3: upload to Blob
    const blobUrl = await uploadBlob(id, name, buffer, contentType);
    console.log(`✓  ${blobUrl}`);

    pending.push({ rowIndex: i, url: blobUrl });
    uploaded++;

    if (pending.length >= BATCH_WRITE_SIZE) await flushPending();

  } catch (err) {
    console.log(`✗  ${err.message}`);
    failed++;
    await sleep(DELAY_MS * 3);  // back off on errors
  }
}

await flushPending();

console.log(`
┌─────────────────────────────────┐
│  Re-enrichment complete          │
│  ✓ Uploaded  : ${String(uploaded).padStart(5)}              │
│  — No photo  : ${String(noPhoto).padStart(5)}              │
│  ✗ Failed    : ${String(failed).padStart(5)}              │
└─────────────────────────────────┘`);
