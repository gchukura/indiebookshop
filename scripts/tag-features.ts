/**
 * Proposes feature tags (Features tab ids) for each live shop from data we
 * already have, writes them to a CSV for review, and — after review — writes
 * the reviewed CSV back to the Sheet's `feature_ids` column.
 *
 * Signals (shop text = name + description + Google description + validated AI
 * description; reviews = Google review texts):
 *   1 Coffee Shop        google_types cafe/coffee_shop, or "café"/"coffee shop|bar|house"/"espresso" in shop text
 *   2 Used Books         "used books", "new and used", "second-hand", "pre-owned/loved" in shop text or reviews
 *   3 Rare Books         "rare books", "antiquarian", "first edition(s)", "out-of-print" in shop text
 *   4 Children's Section "children's books|section|…", "kids' books|section|…" in shop text or reviews
 *   5 Author Events      "author event|reading|signing|talk|visit", "book signing(s)" in shop text or reviews
 *   6 Open Mic Nights    "open mic" in shop text or reviews
 *   7 Book Clubs         "book club(s)" in shop text or reviews
 *   8 Wi-Fi              "wifi" / "wi-fi" in shop text or reviews
 *
 * Usage:
 *   npx tsx scripts/tag-features.ts --out features-review.csv     # dry run: propose tags, write CSV
 *   npx tsx scripts/tag-features.ts --apply features-review.csv   # write the (edited) CSV's feature_ids to the Sheet
 *
 * Review the CSV before applying: delete rows you don't want tagged, or edit
 * the `feature_ids` cell (ids separated by ";"). Rows not in the CSV are left
 * as they are. Applying replaces each listed row's feature_ids.
 *
 * Reads shops through lib/google-sheets-client.ts, i.e. from .data/sheet.json:
 * run `npm run export-sheet` first so it sees the current Sheet.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import nextEnv from '@next/env';
import { google } from 'googleapis';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const { getBookstoresFromSheets, getFeaturesFromSheets } = await import('@/lib/google-sheets-client');
type Bookstore = Awaited<ReturnType<typeof getBookstoresFromSheets>>[number];

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

// ─── Rules ───────────────────────────────────────────────────────────────────

type Rule = { id: number; shopText?: RegExp; reviews?: RegExp; types?: RegExp };

const RULES: Rule[] = [
  { id: 1, types: /^(cafe|coffee_shop)$/, shopText: /\bcaf[eé]\b|\bcoffee (shop|bar|house|counter)\b|\bespresso\b/ },
  {
    id: 2,
    shopText: /\bused (books?|and new|& new)\b|\bnew (and|&) used\b|\bsecond[- ]hand\b|\bpre-?(owned|loved)\b/,
    reviews: /\bused books?\b|\bnew (and|&) used\b|\bsecond[- ]hand books?\b/,
  },
  { id: 3, shopText: /\brare (books?|and used|& used)\b|\bantiquarian\b|\bfirst editions?\b|\bout[- ]of[- ]print\b/ },
  {
    id: 4,
    shopText: /\bchildren'?s (books?|section|department|area|room|corner|bookstore|book store|literature)\b|\bkids'? (books?|section|corner|area|room)\b/,
    reviews: /\bchildren'?s (section|area|room|corner|department)\b|\bkids'? (section|corner|area|room)\b/,
  },
  {
    id: 5,
    shopText: /\bauthor (events?|readings?|signings?|talks?|visits?)\b|\bbook signings?\b/,
    reviews: /\bauthor (events?|readings?|signings?|talks?)\b|\bbook signings?\b/,
  },
  { id: 6, shopText: /\bopen[- ]mic\b/, reviews: /\bopen[- ]mic\b/ },
  { id: 7, shopText: /\bbook clubs?\b/, reviews: /\bbook clubs?\b/ },
  { id: 8, shopText: /\bwi-?fi\b/, reviews: /\bwi-?fi\b/ },
];

function shopText(b: Bookstore): string {
  return [b.name, b.description, b.googleDescription, b.descriptionValidated ? b.aiGeneratedDescription : null]
    .filter(Boolean)
    .join(' • ');
}

function reviewText(b: Bookstore): string {
  return (b.googleReviews ?? []).map(r => r.text).join(' • ');
}

/** ~100 chars around the match, for the reviewer. */
function snippet(text: string, re: RegExp): string {
  const m = re.exec(text.toLowerCase());
  if (!m) return '';
  const start = Math.max(0, m.index - 45);
  return `…${text.slice(start, m.index + m[0].length + 45).replace(/\s+/g, ' ').trim()}…`;
}

function propose(b: Bookstore): Array<{ id: number; evidence: string }> {
  const text = shopText(b);
  const reviews = reviewText(b);
  const types = b.googleTypes ?? [];
  const found: Array<{ id: number; evidence: string }> = [];
  for (const rule of RULES) {
    const type = rule.types && types.find(t => rule.types!.test(t));
    if (type) found.push({ id: rule.id, evidence: `google_types: ${type}` });
    else if (rule.shopText?.test(text.toLowerCase())) found.push({ id: rule.id, evidence: `shop: ${snippet(text, rule.shopText)}` });
    else if (rule.reviews?.test(reviews.toLowerCase())) found.push({ id: rule.id, evidence: `review: ${snippet(reviews, rule.reviews)}` });
  }
  return found;
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

// ─── Modes ───────────────────────────────────────────────────────────────────

async function dryRun(outPath: string) {
  const [shops, features] = await Promise.all([getBookstoresFromSheets(false), getFeaturesFromSheets()]);
  const names = new Map(features.map(f => [f.id, f.name]));
  const lines = [['id', 'name', 'city', 'state', 'feature_ids', 'features', 'evidence'].map(csvCell).join(',')];
  const counts = new Map<number, number>();
  let tagged = 0;

  for (const b of shops) {
    const found = propose(b);
    if (!found.length) continue;
    tagged++;
    found.forEach(f => counts.set(f.id, (counts.get(f.id) ?? 0) + 1));
    lines.push([
      b.id, b.name, b.city, b.state,
      found.map(f => f.id).join(';'),
      found.map(f => names.get(f.id) ?? f.id).join('; '),
      found.map(f => `[${names.get(f.id) ?? f.id}] ${f.evidence}`).join(' | '),
    ].map(csvCell).join(','));
  }

  writeFileSync(outPath, lines.join('\n') + '\n');
  console.log(`[tag-features] ${tagged} of ${shops.length} live shops get at least one tag → ${outPath}`);
  for (const f of features) console.log(`  ${String(f.id).padStart(2)} ${f.name.padEnd(20)} ${counts.get(f.id) ?? 0}`);
}

async function apply(csvPath: string) {
  const [header, ...rows] = parseCsv(readFileSync(csvPath, 'utf8'));
  const idCol = header.indexOf('id');
  const featCol = header.indexOf('feature_ids');
  if (idCol < 0 || featCol < 0) throw new Error('CSV needs id and feature_ids columns');

  const wanted = new Map<string, number[]>();
  for (const r of rows) {
    const ids = r[featCol].split(/[;,\s]+/).map(Number).filter(n => Number.isInteger(n) && n > 0);
    wanted.set(r[idCol].trim(), [...new Set(ids)].sort((a, b) => a - b));
  }

  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS!);
  const sheets = google.sheets({
    version: 'v4',
    auth: new google.auth.JWT({ email: creds.client_email, key: creds.private_key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }),
  });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Bookstores!A1:ZZZ' });
  const [sheetHeader, ...sheetRows] = res.data.values ?? [];
  const h = sheetHeader.map((x: string) => String(x).toLowerCase().trim());
  const col = h.indexOf('feature_ids');
  const sheetIdCol = h.indexOf('id');
  if (col < 0 || sheetIdCol < 0) throw new Error('Sheet is missing id or feature_ids column');

  let letter = '';
  for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26)) letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter;

  const data: Array<{ range: string; values: string[][] }> = [];
  sheetRows.forEach((row: string[], i: number) => {
    const ids = wanted.get(String(row[sheetIdCol] ?? '').trim());
    if (ids) data.push({ range: `Bookstores!${letter}${i + 2}`, values: [[JSON.stringify(ids)]] });
  });
  const missing = wanted.size - data.length;

  for (let i = 0; i < data.length; i += 500) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data: data.slice(i, i + 500) },
    });
  }
  console.log(`[tag-features] Wrote feature_ids for ${data.length} rows${missing ? ` (${missing} CSV ids not found in the Sheet)` : ''}`);
}

const applyPath = option('apply');
if (applyPath) await apply(applyPath);
else await dryRun(option('out') ?? 'features-review.csv');
