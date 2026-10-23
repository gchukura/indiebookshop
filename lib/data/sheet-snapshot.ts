/**
 * Health check for a Sheet snapshot before it's used for a build
 * (scripts/export-sheet.ts). A failing check fails the build, so a broken or
 * half-empty Sheet never replaces the live site; the last deploy keeps serving.
 */

import type { SheetSnapshot } from '@/lib/google-sheets-client';
import { parseBookstoreRow, parseLive, rowToRecord } from './bookstore-row';

/** Fewer live shops than this means the read went wrong (the Sheet has ~2,000). */
export const MIN_LIVE_SHOPS = 1000;
/** More invalid live rows than this share means a column was renamed or broken. */
export const MAX_INVALID_SHARE = 0.05;
const REQUIRED_COLUMNS = ['id', 'name', 'city', 'state'];

export type SnapshotCheck = {
  liveShops: number;
  invalidRows: number;
  /** First few reasons rows were skipped, for the build log. */
  invalidReasons: string[];
  features: number;
  events: number;
  /** Why the snapshot can't be used; empty when it's fine. */
  errors: string[];
};

export function checkSnapshot(snapshot: SheetSnapshot): SnapshotCheck {
  const errors: string[] = [];
  const { header = [], rows = [] } = snapshot.Bookstores ?? {};
  const columns = new Set(header.map(h => String(h).toLowerCase().trim()));
  const missing = REQUIRED_COLUMNS.filter(c => !columns.has(c));
  if (missing.length) errors.push(`Bookstores tab is missing column(s): ${missing.join(', ')}`);

  let liveShops = 0;
  const invalidReasons: string[] = [];
  for (const row of rows) {
    if (!row.some(cell => String(cell ?? '').trim())) continue;
    const record = rowToRecord(header, row);
    if (!parseLive(record.live)) continue;
    const parsed = parseBookstoreRow(record);
    if (parsed.ok) liveShops++;
    else invalidReasons.push(parsed.reason);
  }

  const invalidRows = invalidReasons.length;
  if (liveShops < MIN_LIVE_SHOPS) errors.push(`only ${liveShops} valid live shops (expected at least ${MIN_LIVE_SHOPS})`);
  const share = invalidRows / Math.max(1, liveShops + invalidRows);
  if (share > MAX_INVALID_SHARE) {
    errors.push(`${invalidRows} invalid live rows (${Math.round(share * 100)}%, limit ${MAX_INVALID_SHARE * 100}%)`);
  }
  if (!snapshot.Features?.rows.length) errors.push('Features tab is empty');

  return {
    liveShops,
    invalidRows,
    invalidReasons: invalidReasons.slice(0, 5),
    features: snapshot.Features?.rows.length ?? 0,
    events: snapshot.Events?.rows.length ?? 0,
    errors,
  };
}
