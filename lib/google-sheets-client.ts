/**
 * Google Sheets client for the Next.js data layer.
 *
 * READ  — bookstore directory, features, events (readonly scope)
 * WRITE — newsletter signups appended to a "Newsletter" tab (readwrite scope)
 *
 * Supabase is no longer used. Contact emails are sent directly via SendGrid.
 */

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
  const sheets = buildSheetsClient();

  const [headerRes, dataRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Bookstores!1:1',
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Bookstores!A2:ZZZ',
    }),
  ]);

  const headerRow: string[] = headerRes.data.values?.[0] ?? [];
  const rows: string[][] = (dataRes.data.values ?? []) as string[][];

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
  const sheets = buildSheetsClient();

  const [headerRes, dataRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Features!1:1',
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Features!A2:Z',
    }),
  ]);

  const headerRow: string[] = headerRes.data.values?.[0] ?? [];
  const rows: string[][] = (dataRes.data.values ?? []) as string[][];

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
  const sheets = buildSheetsClient();

  let headerRes, dataRes;
  try {
    [headerRes, dataRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Events!1:1',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Events!A2:G',
      }),
    ]);
  } catch {
    // Events sheet may not exist — not an error
    return [];
  }

  const headerRow: string[] = headerRes.data.values?.[0] ?? [];
  const rows: string[][] = (dataRes.data.values ?? []) as string[][];

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
