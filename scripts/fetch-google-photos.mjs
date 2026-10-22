/**
 * One-time fetch of one Google Places photo per bookshop into Cloudflare R2.
 *
 * For each live row in the Bookstores tab that has a google_place_id and no R2
 * photo yet:
 *   1. Place Details (New) with field mask `photos` → photo names + author attributions
 *   2. Photo media at 1600px → re-encode with sharp to two WebPs:
 *        photos/<id>-<hash>.webp      1200px wide (detail page, og:image)
 *        photos/<id>-<hash>-400.webp   400px wide (cards)
 *   3. Upload both to R2 with immutable cache headers
 *   4. Write the 1200px URL to `imageurl`, and the author to
 *      `photo_attribution` / `photo_attribution_url` (headers are added if missing)
 *
 * Idempotent: rows whose imageurl already starts with R2_PUBLIC_URL are skipped
 * unless --force. Stale place IDs and shops with no photos are reported, not written.
 *
 * Usage:
 *   node scripts/fetch-google-photos.mjs --dry-run      # Details lookups only (free SKU), no writes
 *   node scripts/fetch-google-photos.mjs --limit 10     # first 10 eligible rows
 *   node scripts/fetch-google-photos.mjs --ids 1,588    # specific shop ids
 *   node scripts/fetch-google-photos.mjs                # everything
 *   Options: --force (refetch rows already on R2), --report <path> (JSON report)
 *
 * Env (.env.local): GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, GOOGLE_SHEETS_ID,
 *   GOOGLE_PLACES_API_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import nextEnv from '@next/env';
import { google } from 'googleapis';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

// ─── Args & config ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const option = name => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const DRY_RUN = flag('dry-run') || process.env.DRY_RUN === '1';
const FORCE = flag('force');
const LIMIT = option('limit') ? parseInt(option('limit'), 10) : Infinity;
const IDS = option('ids') ? new Set(option('ids').split(',').map(s => s.trim())) : null;
const REPORT_PATH = option('report');

const SHEET = 'Bookstores';
const CONCURRENCY = 4;
const SHEET_FLUSH_SIZE = 50;
const SIZES = [
  { suffix: '', width: 1200, quality: 72 },
  { suffix: '-400', width: 400, quality: 70 },
];
// s-maxage lets Vercel's CDN cache the /photos rewrite to R2
const CACHE_CONTROL = 'public, max-age=31536000, s-maxage=31536000, immutable';
const ATTR_COLS = ['photo_attribution', 'photo_attribution_url'];

const env = process.env;
const required = ['GOOGLE_SERVICE_ACCOUNT_CREDENTIALS', 'GOOGLE_SHEETS_ID', 'GOOGLE_PLACES_API_KEY',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
const missing = required.filter(k => !env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}
const R2_PUBLIC_URL = env.R2_PUBLIC_URL.replace(/\/$/, '');
const PLACES_KEY = env.GOOGLE_PLACES_API_KEY;

// ─── Clients ─────────────────────────────────────────────────────────────────

const creds = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function colLetter(index) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function parseLive(value) {
  const v = String(value ?? '').toLowerCase().trim();
  return !v || !(v === 'false' || v === '0' || v === 'no');
}

// Places per-minute quotas return 429 under bursts, so space calls out globally
const PLACES_MIN_INTERVAL_MS = 150;
let nextPlacesSlot = 0;
async function placesSlot() {
  const now = Date.now();
  const wait = Math.max(0, nextPlacesSlot - now);
  nextPlacesSlot = Math.max(now, nextPlacesSlot) + PLACES_MIN_INTERVAL_MS;
  if (wait) await new Promise(r => setTimeout(r, wait));
}

async function placesFetch(url, init = {}, attempt = 1) {
  await placesSlot();
  const res = await fetch(url, { ...init, headers: { 'X-Goog-Api-Key': PLACES_KEY, ...init.headers } });
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
    return placesFetch(url, init, attempt + 1);
  }
  return res;
}

/** Google's first photo is the listing's primary; prefer a landscape one from the first three for cards. */
function pickPhoto(photos) {
  const landscape = photos.slice(0, 3).find(p => p.widthPx >= p.heightPx);
  return landscape ?? photos[0];
}

async function getPlacePhotos(placeId) {
  const res = await placesFetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-FieldMask': 'photos' },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 404 || res.status === 400) return { stale: true, reason: body.error?.message };
  if (!res.ok) throw new Error(`details ${res.status} ${body.error?.status ?? ''}`);
  return { photos: body.photos ?? [] };
}

async function downloadPhoto(photoName) {
  const res = await placesFetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1600&skipHttpRedirect=true`
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.photoUri) throw new Error(`media ${res.status} ${body.error?.status ?? ''}`);
  const img = await fetch(body.photoUri);
  if (!img.ok) throw new Error(`photoUri ${img.status}`);
  return Buffer.from(await img.arrayBuffer());
}

async function uploadVariants(shopId, source) {
  const hash = createHash('sha1').update(source).digest('hex').slice(0, 10);
  let mainUrl = null;
  let bytes = 0;
  for (const size of SIZES) {
    const body = await sharp(source)
      .rotate()
      .resize({ width: size.width, withoutEnlargement: true })
      .webp({ quality: size.quality })
      .toBuffer();
    const key = `photos/${shopId}-${hash}${size.suffix}.webp`;
    await s3.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: 'image/webp',
      CacheControl: CACHE_CONTROL,
    }));
    bytes += body.length;
    if (!size.suffix) mainUrl = `${R2_PUBLIC_URL}/${key}`;
  }
  return { url: mainUrl, bytes };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[photos] ${DRY_RUN ? 'DRY RUN — no downloads, uploads, or Sheet writes' : 'LIVE RUN'}`);

  const res = await sheets.spreadsheets.values.get({ spreadsheetId: env.GOOGLE_SHEETS_ID, range: `${SHEET}!A1:ZZZ` });
  const [header = [], ...rows] = res.data.values ?? [];
  const headers = header.map(h => String(h).toLowerCase().trim());
  const col = name => headers.indexOf(name);

  const imageCol = col('imageurl') >= 0 ? col('imageurl') : col('image_url');
  if (imageCol < 0 || col('google_place_id') < 0) throw new Error('Sheet is missing imageurl or google_place_id column');

  // Attribution columns go at the end of the header row if they don't exist yet
  const attrCols = {};
  let nextFree = header.length;
  const newHeaders = [];
  for (const name of ATTR_COLS) {
    if (col(name) >= 0) attrCols[name] = col(name);
    else {
      attrCols[name] = nextFree++;
      newHeaders.push({ range: `${SHEET}!${colLetter(attrCols[name])}1`, values: [[name]] });
    }
  }
  if (newHeaders.length) {
    console.log(`[photos] Adding header(s): ${newHeaders.map(h => `${h.values[0][0]} at ${h.range}`).join(', ')}`);
    if (!DRY_RUN) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        requestBody: { valueInputOption: 'RAW', data: newHeaders },
      });
    }
  }

  const get = (row, i) => String(row[i] ?? '').trim();
  const candidates = [];
  const report = { noPlaceId: [], alreadyOnR2: 0, stale: [], noPhotos: [], errors: [], uploaded: [], bytes: 0 };

  rows.forEach((row, i) => {
    const id = get(row, col('id'));
    const name = get(row, col('name'));
    if (!row.length || !row[0] || !name || name.startsWith('#') || !parseLive(get(row, col('live')))) return;
    if (IDS && !IDS.has(id)) return;
    const placeId = get(row, col('google_place_id'));
    if (!placeId || placeId.startsWith('#')) return report.noPlaceId.push({ id, name });
    if (!FORCE && get(row, imageCol).startsWith(R2_PUBLIC_URL)) return report.alreadyOnR2++;
    candidates.push({ id, name, placeId, rowNumber: i + 2 });
  });

  const work = candidates.slice(0, LIMIT);
  console.log(`[photos] ${work.length} to process (${candidates.length} eligible, ${report.alreadyOnR2} already on R2, ${report.noPlaceId.length} without a place ID)`);

  let pendingWrites = [];
  const flush = async () => {
    if (!pendingWrites.length || DRY_RUN) return (pendingWrites = []);
    const data = pendingWrites;
    pendingWrites = [];
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      requestBody: { valueInputOption: 'RAW', data },
    });
  };

  let done = 0;
  let wouldFetch = 0;
  const queue = [...work];
  async function worker() {
    while (queue.length) {
      const shop = queue.shift();
      try {
        const details = await getPlacePhotos(shop.placeId);
        if (details.stale) report.stale.push({ id: shop.id, name: shop.name, placeId: shop.placeId, reason: details.reason });
        else if (!details.photos.length) report.noPhotos.push({ id: shop.id, name: shop.name });
        else if (DRY_RUN) wouldFetch++;
        else {
          const photo = pickPhoto(details.photos);
          const author = photo.authorAttributions?.[0] ?? {};
          const source = await downloadPhoto(photo.name);
          const { url, bytes } = await uploadVariants(shop.id, source);
          report.uploaded.push({ id: shop.id, url });
          report.bytes += bytes;
          const r = shop.rowNumber;
          pendingWrites.push(
            { range: `${SHEET}!${colLetter(imageCol)}${r}`, values: [[url]] },
            { range: `${SHEET}!${colLetter(attrCols.photo_attribution)}${r}`, values: [[author.displayName ?? '']] },
            { range: `${SHEET}!${colLetter(attrCols.photo_attribution_url)}${r}`, values: [[author.uri ?? '']] },
          );
          if (pendingWrites.length >= SHEET_FLUSH_SIZE * 3) await flush();
        }
      } catch (err) {
        report.errors.push({ id: shop.id, name: shop.name, error: err.message });
      }
      if (++done % 100 === 0) console.log(`[photos] ${done}/${work.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await flush();

  console.log('\n[photos] Summary');
  console.log(`  processed:          ${done}`);
  if (DRY_RUN) console.log(`  would fetch photo:  ${wouldFetch}`);
  else console.log(`  uploaded:           ${report.uploaded.length} (${(report.bytes / 1024 / 1024).toFixed(1)} MB in R2, both sizes)`);
  console.log(`  no photos on Google: ${report.noPhotos.length}`);
  console.log(`  stale place IDs:    ${report.stale.length}`);
  console.log(`  no place ID:        ${report.noPlaceId.length}`);
  console.log(`  errors:             ${report.errors.length}`);
  for (const e of report.errors.slice(0, 10)) console.log(`    ${e.id} ${e.name}: ${e.error}`);

  if (REPORT_PATH) {
    writeFileSync(REPORT_PATH, JSON.stringify({ dryRun: DRY_RUN, wouldFetch, ...report }, null, 2));
    console.log(`  report: ${REPORT_PATH}`);
  }
}

main().catch(err => {
  console.error('[photos] Fatal:', err);
  process.exit(1);
});
