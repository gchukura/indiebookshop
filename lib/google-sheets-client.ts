/**
 * Google Sheets client for the Next.js data layer.
 *
 * READ  — bookstore directory, features, events (readonly scope)
 * WRITE — newsletter signups appended to a "Newsletter" tab (readwrite scope)
 *
 * Supabase is no longer used. Contact emails are sent directly via SendGrid.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { google } from 'googleapis';
import { Bookstore, Feature, Event } from '@/shared/schema';
import { rowToRecord, parseBookstoreRow, parseLive, toListingBookstore } from '@/lib/data/bookstore-row';

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_ID || '1Qa3AW5Zmu0X4yT3fXjmoU62Drqz0oMKRsXsm3a7JiQs';

function parseCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  if (!raw) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_CREDENTIALS is not set. ' +
        'Add it to your environment variables.'
    );
  }
  let creds: { client_email: string; private_key: string };
  try {
    creds = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS is not valid JSON.');
  }
  if (!creds.client_email || !creds.private_key) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_CREDENTIALS is missing client_email or private_key.'
    );
  }
  return creds;
}

/** Read-only client — used for bookstore directory reads. */
function buildSheetsClient() {
  const creds = parseCredentials();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

/** Read-write client — used for newsletter signup appends. */
function buildSheetsWriteClient() {
  const creds = parseCredentials();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IS_BUILD = process.env.NEXT_PHASE === 'phase-production-build';
const BUILD_RETRY_DELAYS_MS = [20_000, 40_000]; // see staticPageGenerationTimeout in next.config.mjs

function isQuotaError(err: unknown): boolean {
  const e = err as { code?: number; status?: number };
  return e?.code === 429 || e?.status === 429;
}

/**
 * During `next build`, retries a Sheets read that hit the per-minute read quota
 * (the quota resets each minute; prerendering thousands of pages can exceed it).
 * At runtime it fails immediately, as before, rather than holding a request open.
 */
async function withBuildQuotaRetry<T>(read: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await read();
    } catch (err) {
      const delay = BUILD_RETRY_DELAYS_MS[attempt];
      if (!IS_BUILD || !isQuotaError(err) || delay === undefined) throw err;
      console.warn(`[GoogleSheets] Read quota exceeded during build; retrying in ${delay / 1000}s`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ---------------------------------------------------------------------------
// Reading tabs (Google Sheets, or the committed fixture with USE_FIXTURE_DATA=1)
// ---------------------------------------------------------------------------

type Tab = 'Bookstores' | 'Features' | 'Events';
type TabValues = { header: string[]; rows: string[][] };

const DATA_RANGES: Record<Tab, string> = { Bookstores: 'A2:ZZZ', Features: 'A2:Z', Events: 'A2:G' };

/** Fixture of ~200 real rows (scripts/export-fixture.ts) for CI and offline builds without Sheet credentials. */
const USE_FIXTURE_DATA = process.env.USE_FIXTURE_DATA === '1';
export const FIXTURE_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'bookstores.json');

async function readTab(tab: Tab): Promise<TabValues> {
  if (USE_FIXTURE_DATA) {
    const fixture = JSON.parse(await readFile(FIXTURE_PATH, 'utf8')) as Partial<Record<Tab, TabValues>>;
    return fixture[tab] ?? { header: [], rows: [] };
  }
  const sheets = buildSheetsClient();
  const [headerRes, dataRes] = await withBuildQuotaRetry(() =>
    Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${tab}!1:1` }),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${tab}!${DATA_RANGES[tab]}` }),
    ])
  );
  return {
    header: (headerRes.data.values?.[0] ?? []) as string[],
    rows: (dataRes.data.values ?? []) as string[][],
  };
}

function col(row: string[], colMap: Record<string, number>, field: string): string {
  const idx = colMap[field];
  return idx !== undefined && idx < row.length ? String(row[idx] ?? '').trim() : '';
}

/**
 * Build a column-index map from a header row.
 * Lowercases and trims all header names.
 */
function buildColMap(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    map[String(h).toLowerCase().trim()] = i;
  });
  return map;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch bookstores from Google Sheets.
 *
 * @param listingOnly  When true, strips detail-page-only fields so the result
 *                     fits inside Vercel's 2 MB unstable_cache limit (used for
 *                     the directory listing and /api/bookstores/filter).
 *                     When false (default), all columns are returned for detail
 *                     pages and the module-level full-data cache.
 */
export async function getBookstoresFromSheets(listingOnly = false): Promise<Bookstore[]> {
  const { header: headerRow, rows } = await readTab('Bookstores');

  if (!headerRow.length || !rows.length) {
    console.warn('[GoogleSheets] Bookstores sheet returned no data');
    return [];
  }

  const bookstores: Bookstore[] = [];
  const skipped: string[] = [];

  for (const row of rows) {
    // Blank rows are padding, not errors
    if (!row.some(cell => String(cell ?? '').trim())) continue;

    const record = rowToRecord(headerRow, row);
    if (!parseLive(record.live)) continue;

    const parsed = parseBookstoreRow(record);
    if (!parsed.ok) {
      skipped.push(parsed.reason);
      continue;
    }
    bookstores.push(listingOnly ? toListingBookstore(parsed.bookstore) : parsed.bookstore);
  }

  if (skipped.length) {
    console.warn(`[GoogleSheets] skipped ${skipped.length} invalid rows: ${skipped.slice(0, 5).join('; ')}`);
  }
  console.log(`[GoogleSheets] Loaded ${bookstores.length} live bookstores (listingOnly=${listingOnly})`);
  return bookstores;
}

export async function getFeaturesFromSheets(): Promise<Feature[]> {
  const { header: headerRow, rows } = await readTab('Features');

  if (!rows.length) return [];

  const colMap = buildColMap(headerRow);

  // Positional fallback if no headers detected
  if (!colMap['id'] && !colMap['name']) {
    colMap['id'] = 0;
    colMap['name'] = 1;
  }

  return rows
    .filter(row => row.length > 0)
    .map(row => {
      const get = (field: string) => col(row, colMap, field);
      return {
        id: parseInt(get('id') || '0', 10),
        name: get('name') || '',
        slug: get('slug') || undefined,
        description: get('description') || undefined,
        keywords: get('keywords') || undefined,
        icon: get('icon') || undefined,
      } as Feature;
    })
    .filter(f => f.name);
}

export async function getEventsFromSheets(bookshopId?: number): Promise<Event[]> {
  let headerRow: string[];
  let rows: string[][];
  try {
    ({ header: headerRow, rows } = await readTab('Events'));
  } catch {
    // Events sheet may not exist — not an error
    return [];
  }

  if (!rows.length) return [];

  const colMap = buildColMap(headerRow);

  if (!colMap['id']) {
    colMap['id'] = 0;
    colMap['bookshopid'] = colMap['bookshop_id'] ?? 1;
    colMap['title'] = 2;
    colMap['description'] = 3;
    colMap['date'] = 4;
    colMap['time'] = 5;
  }

  const events: Event[] = rows
    .filter(row => row.length >= 3)
    .map(row => {
      const get = (field: string) => col(row, colMap, field);
      const bsId =
        parseInt(get('bookshop_id') || get('bookshopid') || '0', 10);
      return {
        id: parseInt(get('id') || '0', 10),
        bookshopId: bsId,
        title: get('title') || '',
        description: get('description') || '',
        date: get('date') || '',
        time: get('time') || '',
      } as Event;
    })
    .filter(e => e.title);

  if (bookshopId !== undefined) {
    return events.filter(e => e.bookshopId === bookshopId);
  }
  return events;
}

// ---------------------------------------------------------------------------
// Newsletter signup — writes to a "Newsletter" tab in the same spreadsheet.
//
// Expected tab columns (row 1 = header): email | source | subscribed_at
// Create this tab manually in the sheet if it doesn't exist yet.
// ---------------------------------------------------------------------------

const NEWSLETTER_RANGE = 'Newsletter!A:A'; // email column for duplicate check
const NEWSLETTER_APPEND_RANGE = 'Newsletter!A:C';

export type NewsletterResult = 'ok' | 'duplicate' | 'error';

export async function appendNewsletterSignup(
  email: string
): Promise<NewsletterResult> {
  const normalised = email.toLowerCase().trim();
  const sheets = buildSheetsWriteClient();

  try {
    // 1. Check for existing email (column A, skip header row 1)
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Newsletter!A2:A',
    });

    const existingEmails: string[] = (
      (existing.data.values ?? []) as string[][]
    )
      .flat()
      .map(e => String(e).toLowerCase().trim());

    if (existingEmails.includes(normalised)) {
      return 'duplicate';
    }

    // 2. Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: NEWSLETTER_APPEND_RANGE,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[normalised, 'footer', new Date().toISOString()]],
      },
    });

    return 'ok';
  } catch (err) {
    console.error('[GoogleSheets] appendNewsletterSignup error:', err);
    return 'error';
  }
}
