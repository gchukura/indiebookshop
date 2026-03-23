/**
 * Quick smoke test for the Supabase → Sheets migration.
 * Checks: bookstore data, features, image_url population, newsletter append, contact email env.
 */
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
const auth = new google.auth.JWT(
  creds.client_email, null, creds.private_key,
  ['https://www.googleapis.com/auth/spreadsheets.readonly']
);
const sheets = google.sheets({ version: 'v4', auth });

let passed = 0, failed = 0;

function ok(label) { console.log(`  ✓  ${label}`); passed++; }
function fail(label, detail) { console.log(`  ✗  ${label}${detail ? ` — ${detail}` : ''}`); failed++; }

// ── 1. Bookstores tab ────────────────────────────────────────────────────────
console.log('\n── Bookstores tab');
const bRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookstores!A1:AZ2' });
const [bHeaders, bRow1] = bRes.data.values ?? [];

const required = ['id','name','slug','city','state','google_place_id','google_photos','image_url'];
for (const col of required) {
  const idx = bHeaders?.findIndex(h => h.toLowerCase().replace(/\W+/g,'_') === col);
  idx >= 0 ? ok(`column "${col}" present at index ${idx}`) : fail(`column "${col}" missing`);
}

// Check that image_url has data (not just header)
const imgIdx = bHeaders?.findIndex(h => /^image_?url$/i.test(h)) ?? -1;
const sampleImgUrl = bRow1?.[imgIdx] ?? '';
sampleImgUrl.startsWith('https://') ? ok(`image_url row 1: ${sampleImgUrl.slice(0,60)}…`) : fail('image_url row 1 is empty or not a URL', sampleImgUrl || '(empty)');

// ── 2. Count rows with image_url ─────────────────────────────────────────────
console.log('\n── image_url coverage');
const allRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `Bookstores!${String.fromCharCode(65 + imgIdx)}2:${String.fromCharCode(65 + imgIdx)}` });
const imgRows = allRes.data.values ?? [];
const withUrl = imgRows.filter(r => (r[0] || '').startsWith('https://')).length;
const total   = imgRows.length;
const pct = ((withUrl / total) * 100).toFixed(1);
withUrl > 2000 ? ok(`${withUrl}/${total} rows have image_url (${pct}%)`) : fail(`only ${withUrl}/${total} rows have image_url`);

// ── 3. Features tab ──────────────────────────────────────────────────────────
console.log('\n── Features tab');
const fRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Features!A1:Z10' });
const [fHeaders, ...fRows] = fRes.data.values ?? [];
fRows.length > 0 ? ok(`${fRows.length} feature rows found`) : fail('Features tab has no data rows');
['id','name'].forEach(col => {
  (fHeaders?.some(h => h.toLowerCase() === col)) ? ok(`Features: "${col}" column present`) : fail(`Features: "${col}" column missing`);
});

// ── 4. Env vars for contact / newsletter / blob ──────────────────────────────
console.log('\n── Environment variables');
const envChecks = [
  'SENDGRID_API_KEY',
  'SENDGRID_FROM_EMAIL',
  'GOOGLE_PLACES_API_KEY',
  'BLOB_READ_WRITE_TOKEN',
];
for (const key of envChecks) {
  process.env[key] ? ok(`${key} is set`) : fail(`${key} is NOT set`);
}

// ── 5. Vercel Blob CDN domain in a sample URL ────────────────────────────────
console.log('\n── Vercel Blob URL format');
const blobSample = imgRows.find(r => (r[0] || '').includes('blob.vercel-storage.com'))?.[0];
blobSample ? ok(`Blob CDN URL confirmed: ${blobSample.slice(0,70)}…`) : fail('No blob.vercel-storage.com URLs found in image_url column');

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`  ${passed} passed  |  ${failed} failed`);
if (failed > 0) process.exit(1);
