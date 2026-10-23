/**
 * Google Sheets client for the Next.js data layer.
 *
 * READ  — bookstore directory, features, events: from the build-time snapshot
 *         (.data/sheet.json); the API is read only by scripts/export-sheet.ts
 * WRITE — newsletter signups and form submissions appended to the Sheet (readwrite scope)
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

/** Read-only client — used by fetchSheetTabsFromApi (the build-time export). */
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
// Reading tabs: from the snapshot taken at build time (.data/sheet.json, written
// by scripts/export-sheet.ts), or the committed fixture with USE_FIXTURE_DATA=1.
// The site never reads the Sheets API at runtime; only the form routes write to it.
// ---------------------------------------------------------------------------

type Tab = 'Bookstores' | 'Features' | 'Events';
type TabValues = { header: string[]; rows: string[][] };
export type SheetSnapshot = Partial<Record<Tab, TabValues>> & { exportedAt?: string };

const TABS: Tab[] = ['Bookstores', 'Features', 'Events'];
const DATA_RANGES: Record<Tab, string> = { Bookstores: 'A2:ZZZ', Features: 'A2:Z', Events: 'A2:G' };

/** Fixture of ~200 real rows (scripts/export-fixture.ts) for CI and offline builds without Sheet credentials. */
const USE_FIXTURE_DATA = process.env.USE_FIXTURE_DATA === '1';
export const FIXTURE_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'bookstores.json');
/** Snapshot of the Sheet for this build/deployment. Gitignored; shipped to the server functions via outputFileTracingIncludes. */
export const SNAPSHOT_PATH = path.join(process.cwd(), '.data', 'sheet.json');

/** Reads every tab from the Sheets API (scripts/export-sheet.ts only). A missing Events tab is empty. */
export async function fetchSheetTabsFromApi(): Promise<SheetSnapshot> {
  const sheets = buildSheetsClient();
  const readOne = async (tab: Tab): Promise<TabValues> => {
    const [headerRes, dataRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${tab}!1:1` }),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${tab}!${DATA_RANGES[tab]}` }),
    ]);
    return {
      header: (headerRes.data.values?.[0] ?? []) as string[],
      rows: (dataRes.data.values ?? []) as string[][],
    };
  };
  const snapshot: SheetSnapshot = { exportedAt: new Date().toISOString() };
  for (const tab of TABS) {
    try {
      snapshot[tab] = await readOne(tab);
    } catch (err) {
      if (tab !== 'Events') throw err;
      snapshot[tab] = { header: [], rows: [] }; // Events tab may not exist
    }
  }
  return snapshot;
}

// Parsed once per server process; the snapshot can't change during a deployment
let snapshotPromise: Promise<SheetSnapshot> | null = null;

function loadSnapshot(): Promise<SheetSnapshot> {
  snapshotPromise ??= (async () => {
    const file = USE_FIXTURE_DATA ? FIXTURE_PATH : SNAPSHOT_PATH;
    try {
      return JSON.parse(await readFile(file, 'utf8')) as SheetSnapshot;
    } catch (err) {
      snapshotPromise = null;
      if ((err as NodeJS.ErrnoException).code === 'ENOENT' && !USE_FIXTURE_DATA) {
        throw new Error(
          `${SNAPSHOT_PATH} not found. It's written by \`npm run export-sheet\`, which runs before \`npm run build\` and \`npm run dev\`.`
        );
      }
      throw err;
    }
  })();
  return snapshotPromise;
}

async function readTab(tab: Tab): Promise<TabValues> {
  return (await loadSnapshot())[tab] ?? { header: [], rows: [] };
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
 * Bookstores from the snapshot, parsed and validated.
 *
 * @param listingOnly  When true, keeps only the listing fields (LISTING_FIELDS), so
 *                     pages and client props that list many shops stay small.
 *                     When false (default), all columns are returned (detail pages).
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
  const { header: headerRow, rows } = await readTab('Events');

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

// ---------------------------------------------------------------------------
// Form submissions — appended to a "Submissions" tab so nothing is lost if the
// notification email fails. The tab must exist with headers
// submitted_at | mode | bookshop_id | name | json_payload
// (see docs/setup/FORM_SUBMISSIONS.md).
// ---------------------------------------------------------------------------

export type SubmissionRow = {
  mode: 'new' | 'change' | 'edit';
  bookshopId: number | null;
  name: string;
  payload: unknown;
};

/** Appends one submission. Never throws: returns false (and logs) if the tab is missing or the write fails. */
export async function appendSubmission(row: SubmissionRow): Promise<boolean> {
  if (USE_FIXTURE_DATA) {
    console.info('[GoogleSheets] Fixture mode: submission not written to the Sheet', row.mode, row.name);
    return false;
  }
  try {
    const sheets = buildSheetsWriteClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Submissions!A:E',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[new Date().toISOString(), row.mode, row.bookshopId ?? '', row.name, JSON.stringify(row.payload)]],
      },
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[GoogleSheets] Could not append to the "Submissions" tab (does it exist with headers submitted_at, mode, bookshop_id, name, json_payload?): ${message}`
    );
    return false;
  }
}
