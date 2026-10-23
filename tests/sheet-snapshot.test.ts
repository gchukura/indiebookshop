import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIXTURE_PATH, type SheetSnapshot } from '@/lib/google-sheets-client';
import { checkSnapshot, MIN_LIVE_SHOPS } from '@/lib/data/sheet-snapshot';

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as SheetSnapshot;

/** The fixture's 200 shops repeated with new ids, to look like a full Sheet. */
function fullSheet(): SheetSnapshot {
  const { header, rows } = fixture.Bookstores!;
  const idCol = header.findIndex(h => h.toLowerCase().trim() === 'id');
  const copies = Math.ceil(MIN_LIVE_SHOPS / rows.length);
  const many = Array.from({ length: copies }, (_, c) =>
    rows.map(r => r.map((cell, i) => (i === idCol ? String(c * 100000 + Number(cell)) : cell)))
  ).flat();
  return { ...fixture, Bookstores: { header, rows: many } };
}

describe('checkSnapshot', () => {
  it('accepts a full, healthy Sheet', () => {
    const check = checkSnapshot(fullSheet());
    expect(check.errors).toEqual([]);
    expect(check.liveShops).toBeGreaterThanOrEqual(MIN_LIVE_SHOPS);
    expect(check.features).toBeGreaterThan(0);
  });

  it('rejects a Sheet with too few shops (e.g. a partial read)', () => {
    const check = checkSnapshot(fixture);
    expect(check.liveShops).toBeGreaterThan(0);
    expect(check.errors.join(' ')).toMatch(/valid live shops/);
  });

  it('rejects a renamed required column', () => {
    const sheet = fullSheet();
    const header = sheet.Bookstores!.header.map(h => (h.toLowerCase().trim() === 'name' ? 'shop_name' : h));
    const check = checkSnapshot({ ...sheet, Bookstores: { ...sheet.Bookstores!, header } });
    expect(check.errors.join(' ')).toMatch(/missing column\(s\): name/);
  });

  it('rejects a Sheet where many live rows are invalid', () => {
    const sheet = fullSheet();
    const { header, rows } = sheet.Bookstores!;
    const idCol = header.findIndex(h => h.toLowerCase().trim() === 'id');
    const broken = rows.map((r, i) => (i % 10 === 0 ? r.map((c, j) => (j === idCol ? 'not-a-number' : c)) : r));
    const check = checkSnapshot({ ...sheet, Bookstores: { header, rows: broken } });
    expect(check.invalidRows).toBeGreaterThan(0);
    expect(check.errors.join(' ')).toMatch(/invalid live rows/);
  });

  it('rejects an empty Features tab', () => {
    const check = checkSnapshot({ ...fullSheet(), Features: { header: ['id', 'name'], rows: [] } });
    expect(check.errors).toContain('Features tab is empty');
  });
});
