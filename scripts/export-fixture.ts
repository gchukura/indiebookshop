/**
 * Exports a 200-row sample of the Sheet to tests/fixtures/bookstores.json, used
 * by the tests and by builds without Sheet credentials (USE_FIXTURE_DATA=1).
 *
 * The sample is real, raw rows (so the row schema is exercised), chosen to cover:
 *   - every US state with shops (at least one shop each)
 *   - the 50 cities with the most shops (at least one shop each)
 *   - then the most-reviewed shops to fill up to 200
 * Reviews are cut to 2 short ones per shop and the unused google_photos column
 * is blanked to keep the file small. The Features and Events tabs are copied whole.
 *
 * Usage: npx tsx scripts/export-fixture.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import nextEnv from '@next/env';
import { google } from 'googleapis';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const { parseBookstoreRow, parseLive, rowToRecord } = await import('@/lib/data/bookstore-row');
const { getStateAbbrev, STATE_ABBREV_TO_FULL } = await import('@/lib/state-utils');
const { makeCityKey } = await import('@/lib/data/location-key');

const SIZE = 200;
const TOP_CITIES = 50;
const OUT = path.join(process.cwd(), 'tests', 'fixtures', 'bookstores.json');

const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS!);
const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.JWT({ email: creds.client_email, key: creds.private_key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] }),
});
const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;

async function readTab(tab: string, range: string) {
  const [h, d] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!1:1` }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!${range}` }).catch(() => ({ data: { values: [] } })),
  ]);
  return { header: (h.data.values?.[0] ?? []) as string[], rows: (d.data.values ?? []) as string[][] };
}

const bookstores = await readTab('Bookstores', 'A2:ZZZ');
const features = await readTab('Features', 'A2:Z');
const events = await readTab('Events', 'A2:G');

// Valid, live rows with their parsed form
const candidates = bookstores.rows.flatMap(row => {
  const record = rowToRecord(bookstores.header, row);
  if (!parseLive(record.live)) return [];
  const parsed = parseBookstoreRow(record);
  return parsed.ok ? [{ row, shop: parsed.bookstore }] : [];
});

const picked = new Map<number, string[]>();
const pick = (c: (typeof candidates)[number]) => picked.size < SIZE && picked.set(c.shop.id, c.row);
const byReviews = [...candidates].sort((a, b) => (b.shop.googleReviewCount ?? 0) - (a.shop.googleReviewCount ?? 0));

// 1. One shop per US state
for (const abbrev of Object.keys(STATE_ABBREV_TO_FULL)) {
  const c = byReviews.find(x => getStateAbbrev(x.shop.state) === abbrev);
  if (c) pick(c);
}
// 2. One shop in each of the 50 cities with the most shops
const cityCounts = new Map<string, number>();
for (const c of candidates) if (c.shop.city) cityCounts.set(makeCityKey(c.shop.city, c.shop.state), (cityCounts.get(makeCityKey(c.shop.city, c.shop.state)) ?? 0) + 1);
const topCities = [...cityCounts].sort((a, b) => b[1] - a[1]).slice(0, TOP_CITIES).map(([k]) => k);
for (const key of topCities) {
  const c = byReviews.find(x => x.shop.city && makeCityKey(x.shop.city, x.shop.state) === key && !picked.has(x.shop.id));
  if (c) pick(c);
}
// 3. Fill with the most-reviewed shops
for (const c of byReviews) {
  if (picked.size >= SIZE) break;
  if (!picked.has(c.shop.id)) pick(c);
}

// Keep the file small: 2 reviews of up to 300 characters each, and blank the
// legacy google_photos references (expired, and the app doesn't read them)
const colIndex = (name: string) => bookstores.header.findIndex(h => h.toLowerCase().trim() === name);
const reviewsCol = colIndex('google_reviews');
const photosCol = colIndex('google_photos');
const rows = [...picked.values()].map(row => {
  const copy = [...row];
  if (photosCol >= 0 && copy[photosCol]) copy[photosCol] = '';
  if (reviewsCol >= 0 && copy[reviewsCol]) {
    try {
      const reviews = (JSON.parse(copy[reviewsCol]) as Array<{ text?: string }>).slice(0, 2);
      copy[reviewsCol] = JSON.stringify(reviews.map(r => ({ ...r, text: (r.text ?? '').slice(0, 300) })));
    } catch {
      // leave malformed cells as they are; the schema nulls them
    }
  }
  return copy;
});

mkdirSync(path.dirname(OUT), { recursive: true });
const tab = (t: { header: string[]; rows: string[][] }) =>
  `{\n    "header": ${JSON.stringify(t.header)},\n    "rows": [\n${t.rows.map(r => `      ${JSON.stringify(r)}`).join(',\n')}\n    ]\n  }`;
writeFileSync(
  OUT,
  `{\n  "exportedAt": ${JSON.stringify(new Date().toISOString().slice(0, 10))},\n  "Bookstores": ${tab({ header: bookstores.header, rows })},\n  "Features": ${tab(features)},\n  "Events": ${tab(events)}\n}\n`
);
console.log(`[export-fixture] ${rows.length} bookstores (${new Set(rows.map(r => getStateAbbrev(rowToRecord(bookstores.header, r).state))).size} states, ${topCities.length} top cities), ${features.rows.length} features, ${events.rows.length} events → ${path.relative(process.cwd(), OUT)}`);
