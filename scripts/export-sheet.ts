/**
 * Exports the Google Sheet to .data/sheet.json, the only place the site reads
 * shop data from. Runs before every `npm run build` and `npm run dev`
 * (prebuild/predev), so a deploy is a snapshot of the Sheet at that moment.
 *
 * Fails (and so fails the build) if the Sheet can't be read or the data looks
 * broken (lib/data/sheet-snapshot.ts); the previous deploy keeps serving.
 * Skipped with USE_FIXTURE_DATA=1, which reads tests/fixtures/bookstores.json.
 *
 * Usage: npm run export-sheet
 */

import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

if (process.env.USE_FIXTURE_DATA === '1') {
  console.log('[export-sheet] USE_FIXTURE_DATA=1: using tests/fixtures/bookstores.json, not exporting');
  process.exit(0);
}

const { fetchSheetTabsFromApi, SNAPSHOT_PATH } = await import('@/lib/google-sheets-client');
const { checkSnapshot } = await import('@/lib/data/sheet-snapshot');

const RETRY_DELAYS_MS = [15_000, 30_000, 60_000];

async function fetchWithRetry() {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchSheetTabsFromApi();
    } catch (err) {
      const e = err as { code?: number; status?: number };
      const transient = e?.code === 429 || e?.status === 429 || (e?.code ?? 0) >= 500;
      const delay = RETRY_DELAYS_MS[attempt];
      if (!transient || delay === undefined) throw err;
      console.warn(`[export-sheet] Sheets read failed (${e.code ?? e.status}); retrying in ${delay / 1000}s`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

const started = Date.now();
const snapshot = await fetchWithRetry();
const check = checkSnapshot(snapshot);

if (check.invalidRows) {
  console.warn(`[export-sheet] ${check.invalidRows} invalid live rows will be skipped: ${check.invalidReasons.join('; ')}`);
}
if (check.errors.length) {
  console.error(`[export-sheet] Not using this export:\n  - ${check.errors.join('\n  - ')}`);
  process.exit(1);
}

const json = JSON.stringify(snapshot);
mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
// Write then rename, so a crash mid-write never leaves a half-written snapshot
writeFileSync(`${SNAPSHOT_PATH}.tmp`, json);
renameSync(`${SNAPSHOT_PATH}.tmp`, SNAPSHOT_PATH);
console.log(
  `[export-sheet] ${check.liveShops} live shops, ${check.features} features, ${check.events} events → ` +
    `${path.relative(process.cwd(), SNAPSHOT_PATH)} (${(json.length / 1024 / 1024).toFixed(1)} MB) in ${((Date.now() - started) / 1000).toFixed(1)}s`
);
