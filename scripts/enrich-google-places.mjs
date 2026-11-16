/**
 * Fills Google Places data into Bookstores rows that were added by hand.
 *
 * For each live row with no google_data_updated_at (never enriched), or the rows
 * given with --ids:
 *   1. If the row has a google_place_id, Place Details (New) by that ID. Otherwise
 *      Text Search (New) for "name, street, city, state zip" and take the first
 *      result in the same state whose ZIP or city matches the row. No match →
 *      reported, nothing written. To fix a wrong or missing match, paste the
 *      right place ID into google_place_id and run again with --ids.
 *   2. Writes, in the same formats as the rows enriched earlier (legacy Places shapes):
 *        always (Google-owned): google_place_id, google_rating, google_review_count,
 *          google_description, google_reviews, google_price_level, opening_hours_json,
 *          google_maps_url, google_types, formatted_address_google, business_status,
 *          formatted_phone (blank when the row has a phone, since pages prefer it),
 *          website_verified, google_data_updated_at, contact_data_fetched_at
 *        only when empty (owner-entered): latitude, longitude, lat_numeric, lng_numeric,
 *          county (without the "County"/"Parish"/… suffix), zip
 *      Name, street, city, state, phone, website, description, and live are never changed.
 *
 * Then run `node scripts/fetch-google-photos.mjs --ids …` for the photo, and
 * `scripts/tag-features.ts` for feature tags if needed.
 *
 * Usage:
 *   node scripts/enrich-google-places.mjs --dry-run              # show matches, no writes
 *   node scripts/enrich-google-places.mjs --ids 3141,3142         # specific shop ids
 *   node scripts/enrich-google-places.mjs                         # every live row never enriched
 *   Options: --limit N, --report <path> (JSON report)
 *
 * Cost: one Text Search or Place Details call per shop, with the reviews and
 * editorial summary fields (Enterprise + Atmosphere SKU, ~$0.04 per shop).
 *
 * Env (.env.local): GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, GOOGLE_SHEETS_ID, GOOGLE_PLACES_API_KEY
 */

import { writeFileSync } from 'node:fs';
import nextEnv from '@next/env';
import { google } from 'googleapis';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

// ─── Args & config ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const option = name => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const DRY_RUN = flag('dry-run') || process.env.DRY_RUN === '1';
const LIMIT = option('limit') ? parseInt(option('limit'), 10) : Infinity;
const IDS = option('ids') ? new Set(option('ids').split(',').map(s => s.trim())) : null;
const REPORT_PATH = option('report');

const SHEET = 'Bookstores';
const FIELDS = [
  'id', 'displayName', 'formattedAddress', 'addressComponents', 'location', 'rating',
  'userRatingCount', 'editorialSummary', 'reviews', 'priceLevel', 'regularOpeningHours',
  'googleMapsUri', 'types', 'businessStatus', 'nationalPhoneNumber', 'websiteUri',
];
const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};
// Counties are stored bare ("Kings", "El Paso"); independent cities keep "City" ("Baltimore City")
const COUNTY_SUFFIX = / (County|Parish|City and Borough|Borough|Census Area|Municipality)$/;

const env = process.env;
const missing = ['GOOGLE_SERVICE_ACCOUNT_CREDENTIALS', 'GOOGLE_SHEETS_ID', 'GOOGLE_PLACES_API_KEY'].filter(k => !env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}
const PLACES_KEY = env.GOOGLE_PLACES_API_KEY;

const creds = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
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

/** Same format as the timestamps already in the Sheet: "2026-02-11 16:16:44.219+00". */
const sheetTimestamp = () => new Date().toISOString().replace('T', ' ').replace('Z', '+00');

async function placesFetch(url, init = {}, attempt = 1) {
  const res = await fetch(url, { ...init, headers: { 'X-Goog-Api-Key': PLACES_KEY, ...init.headers } });
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
    return placesFetch(url, init, attempt + 1);
  }
  return res;
}

async function getPlace(placeId) {
  const res = await placesFetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-FieldMask': FIELDS.join(',') },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 404 || res.status === 400) return { stale: true, reason: body.error?.message };
  if (!res.ok) throw new Error(`details ${res.status} ${body.error?.status ?? ''}`);
  return { place: body };
}

async function searchPlaces(query) {
  const res = await placesFetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': FIELDS.map(f => `places.${f}`).join(',') },
    body: JSON.stringify({ textQuery: query, regionCode: 'us', pageSize: 5 }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`search ${res.status} ${body.error?.status ?? ''}`);
  return body.places ?? [];
}

const component = (place, type) => place.addressComponents?.find(c => c.types?.includes(type));
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const GENERIC_WORDS = new Set(['the', 'and', 'book', 'books', 'bookstore', 'bookshop', 'bookstores', 'shop', 'store', 'used', 'new', 'cafe']);
const nameWords = s => new Set(String(s ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !GENERIC_WORDS.has(w)));

/**
 * A search result counts only if it's in the row's state, its ZIP or city matches,
 * and its street number or a distinctive word of its name matches — Text Search
 * happily returns some other business in the same town.
 */
function matchesRow(place, shop) {
  if (component(place, 'administrative_area_level_1')?.shortText !== shop.state.toUpperCase()) return false;
  const zip = component(place, 'postal_code')?.longText;
  const city = component(place, 'locality')?.longText ?? component(place, 'sublocality')?.longText;
  if (!((shop.zip && zip === shop.zip.slice(0, 5)) || norm(city) === norm(shop.city))) return false;
  const streetNumber = shop.street.match(/^\d+/)?.[0];
  if (streetNumber && component(place, 'street_number')?.longText === streetNumber) return true;
  const words = nameWords(place.displayName?.text);
  return [...nameWords(shop.name)].some(w => words.has(w));
}

/** Places API (New) opening hours → the legacy { open_now, weekday_text, periods } shape the app reads. */
function toOpeningHours(hours) {
  if (!hours) return '';
  const point = p => p && { day: p.day, time: `${String(p.hour ?? 0).padStart(2, '0')}${String(p.minute ?? 0).padStart(2, '0')}` };
  return JSON.stringify({
    periods: (hours.periods ?? []).map(p => (p.close ? { open: point(p.open), close: point(p.close) } : { open: point(p.open) })),
    open_now: hours.openNow ?? false,
    weekday_text: hours.weekdayDescriptions ?? [],
  });
}

function toReviews(reviews) {
  if (!reviews?.length) return '';
  return JSON.stringify(reviews.map(r => ({
    text: r.originalText?.text ?? r.text?.text ?? '',
    time: Math.floor(Date.parse(r.publishTime) / 1000),
    rating: r.rating,
    author_name: r.authorAttribution?.displayName ?? '',
  })));
}

/** Column → value. `fillOnly` columns are written only when the row's cell is empty. */
function toCells(place) {
  const county = component(place, 'administrative_area_level_2')?.longText?.replace(COUNTY_SUFFIX, '') ?? '';
  const lat = place.location?.latitude != null ? String(place.location.latitude) : '';
  const lng = place.location?.longitude != null ? String(place.location.longitude) : '';
  const now = sheetTimestamp();
  return {
    always: {
      google_place_id: place.id,
      google_rating: place.rating != null ? String(place.rating) : '',
      google_review_count: place.userRatingCount != null ? String(place.userRatingCount) : '',
      google_description: place.editorialSummary?.text ?? '',
      google_reviews: toReviews(place.reviews),
      google_price_level: PRICE_LEVELS[place.priceLevel] != null ? String(PRICE_LEVELS[place.priceLevel]) : '',
      opening_hours_json: toOpeningHours(place.regularOpeningHours),
      google_maps_url: place.googleMapsUri ?? '',
      google_types: place.types?.length ? JSON.stringify(place.types) : '',
      formatted_address_google: place.formattedAddress ?? '',
      business_status: place.businessStatus ?? '',
      formatted_phone: place.nationalPhoneNumber ?? '',
      website_verified: place.websiteUri ?? '',
      google_data_updated_at: now,
      contact_data_fetched_at: now,
    },
    fillOnly: {
      latitude: lat,
      longitude: lng,
      lat_numeric: lat,
      lng_numeric: lng,
      county,
      zip: component(place, 'postal_code')?.longText ?? '',
    },
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[places] ${DRY_RUN ? 'DRY RUN — no Sheet writes' : 'LIVE RUN'}`);

  const res = await sheets.spreadsheets.values.get({ spreadsheetId: env.GOOGLE_SHEETS_ID, range: `${SHEET}!A1:ZZZ` });
  const [header = [], ...rows] = res.data.values ?? [];
  const headers = header.map(h => String(h).toLowerCase().trim());
  const col = name => headers.indexOf(name);
  const get = (row, name) => String(row[col(name)] ?? '').trim();

  const allColumns = Object.keys({ ...toCells({}).always, ...toCells({}).fillOnly });
  const missingCols = allColumns.filter(c => col(c) < 0);
  if (missingCols.length) throw new Error(`Sheet is missing column(s): ${missingCols.join(', ')}`);

  const candidates = [];
  rows.forEach((row, i) => {
    const id = get(row, 'id');
    const name = get(row, 'name');
    if (!row.length || !id || !name || name.startsWith('#') || !parseLive(get(row, 'live'))) return;
    if (IDS ? !IDS.has(id) : get(row, 'google_data_updated_at')) return;
    candidates.push({
      id, name, row, rowNumber: i + 2,
      street: get(row, 'street'), city: get(row, 'city'), state: get(row, 'state'), zip: get(row, 'zip'),
      placeId: get(row, 'google_place_id'),
    });
  });
  if (IDS) {
    const found = new Set(candidates.map(c => c.id));
    const notFound = [...IDS].filter(id => !found.has(id));
    if (notFound.length) console.log(`[places] Not found or not live: ${notFound.join(', ')}`);
  }

  const work = candidates.slice(0, LIMIT);
  console.log(`[places] ${work.length} to process (${candidates.length} eligible)\n`);

  const report = { enriched: [], noMatch: [], stale: [], closed: [], errors: [] };
  const writes = [];

  for (const shop of work) {
    try {
      let place;
      if (shop.placeId) {
        const details = await getPlace(shop.placeId);
        if (details.stale) {
          report.stale.push({ id: shop.id, name: shop.name, placeId: shop.placeId, reason: details.reason });
          console.log(`  ${shop.id} ${shop.name}: place ID ${shop.placeId} not found (${details.reason})`);
          continue;
        }
        place = details.place;
      } else {
        const query = [shop.name, shop.street, shop.city, `${shop.state} ${shop.zip}`.trim()].filter(Boolean).join(', ');
        const results = await searchPlaces(query);
        place = results.find(p => matchesRow(p, shop));
        if (!place) {
          report.noMatch.push({ id: shop.id, name: shop.name, query, results: results.map(p => `${p.displayName?.text} — ${p.formattedAddress}`) });
          console.log(`  ${shop.id} ${shop.name}: no match in ${shop.city}, ${shop.state}`);
          for (const p of results.slice(0, 3)) console.log(`      seen: ${p.displayName?.text} — ${p.formattedAddress}`);
          continue;
        }
      }

      const { always, fillOnly } = toCells(place);
      const cells = { ...always };
      for (const [name, value] of Object.entries(fillOnly)) if (!get(shop.row, name) && value) cells[name] = value;
      // Pages show formatted_phone before phone, so an entered phone wins over Google's
      if (get(shop.row, 'phone')) cells.formatted_phone = '';
      for (const [name, value] of Object.entries(cells)) {
        writes.push({ range: `${SHEET}!${colLetter(col(name))}${shop.rowNumber}`, values: [[value]] });
      }

      const googleName = place.displayName?.text ?? '';
      const nameNote = norm(googleName) === norm(shop.name) ? '' : `  (Google name: "${googleName}")`;
      console.log(`  ${shop.id} ${shop.name} → ${place.id}${nameNote}`);
      console.log(`      ${place.formattedAddress} · ${place.rating ?? '–'}★ (${place.userRatingCount ?? 0}) · county ${cells.county ?? get(shop.row, 'county')} · ${place.businessStatus ?? ''}`);
      report.enriched.push({ id: shop.id, name: shop.name, googleName, placeId: place.id, address: place.formattedAddress, cells });
      if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') {
        report.closed.push({ id: shop.id, name: shop.name, status: place.businessStatus });
      }
    } catch (err) {
      report.errors.push({ id: shop.id, name: shop.name, error: err.message });
      console.log(`  ${shop.id} ${shop.name}: error ${err.message}`);
    }
  }

  if (writes.length && !DRY_RUN) {
    for (let i = 0; i < writes.length; i += 500) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        requestBody: { valueInputOption: 'RAW', data: writes.slice(i, i + 500) },
      });
    }
  }

  console.log('\n[places] Summary');
  console.log(`  ${`${DRY_RUN ? 'would enrich' : 'enriched'}:`.padEnd(20)}${report.enriched.length}`);
  console.log(`  no match:           ${report.noMatch.length}`);
  console.log(`  stale place IDs:    ${report.stale.length}`);
  console.log(`  not operational:    ${report.closed.map(c => `${c.id} (${c.status})`).join(', ') || 0}`);
  console.log(`  errors:             ${report.errors.length}`);
  if (report.enriched.length && !DRY_RUN) {
    console.log(`\nNext: node scripts/fetch-google-photos.mjs --ids ${report.enriched.map(e => e.id).join(',')}`);
  }

  if (REPORT_PATH) {
    writeFileSync(REPORT_PATH, JSON.stringify({ dryRun: DRY_RUN, ...report }, null, 2));
    console.log(`  report: ${REPORT_PATH}`);
  }
}

main().catch(err => {
  console.error('[places] Fatal:', err);
  process.exit(1);
});
