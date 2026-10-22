import { describe, expect, it } from 'vitest';
import { parseBookstoreRow, rowToRecord, toListingBookstore } from '@/lib/data/bookstore-row';

const headers = [
  'id', 'name', 'slug', 'street', 'city', 'state', 'zip', 'county', 'description', 'imageurl',
  'live', 'lat_numeric', 'lng_numeric', 'feature_ids', 'google_rating', 'google_review_count',
  'google_reviews', 'opening_hours_json', 'website_verified', 'google_price_level', 'photo_attribution',
];

const validRow = [
  '42', 'Test Books', 'test-books', '1 Main St', 'Nashville', 'TN', '37201', 'Davidson', 'A shop.',
  'https://pub-abc.r2.dev/photos/42-deadbeef.webp', 'TRUE', '36.16', '-86.78', '{1,3}', '4.7', '120',
  '[{"author_name":"A","rating":5,"text":"Great","time":1700000000}]',
  '{"open_now":true,"weekday_text":["Monday: 9 AM – 5 PM"]}', 'true', '2', 'Jane Doe',
];

const parse = (overrides: Record<number, string> = {}) => {
  const row = validRow.map((v, i) => overrides[i] ?? v);
  return parseBookstoreRow(rowToRecord(headers, row));
};

describe('bookstoreRowSchema', () => {
  it('parses and coerces a valid row', () => {
    const result = parse();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const b = result.bookstore;
    expect(b.id).toBe(42);
    expect(b.name).toBe('Test Books');
    expect(b.imageUrl).toBe('/photos/42-deadbeef.webp');
    expect(b.live).toBe(true);
    expect(b.latitude).toBe('36.16');
    expect(b.featureIds).toEqual([1, 3]);
    expect(b.googleReviewCount).toBe(120);
    expect(b.googlePriceLevel).toBe(2);
    expect(b.websiteVerified).toBe(true);
    expect(b.googleReviews?.[0].author_name).toBe('A');
    expect(b.openingHoursJson?.weekday_text).toEqual(['Monday: 9 AM – 5 PM']);
    expect(b.photoAttribution).toBe('Jane Doe');
    expect(b.website).toBeNull(); // missing column
  });

  it('rejects a row with no name', () => {
    const result = parse({ 1: '' });
    expect(result).toEqual({ ok: false, reason: 'id 42: missing name' });
  });

  it('rejects a row whose name is a sheet error', () => {
    const result = parse({ 1: '#REF!' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/name is a sheet error/);
  });

  it('rejects a non-numeric id', () => {
    const result = parse({ 0: 'abc' });
    expect(result.ok).toBe(false);
  });

  it('keeps the row but nulls hours when the hours JSON is invalid', () => {
    const result = parse({ 17: '{"open_now": tru' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.bookstore.openingHoursJson).toBeNull();
  });

  it('drops photo URLs that are not on R2', () => {
    const result = parse({ 9: 'https://xyz.supabase.co/storage/v1/object/public/bookshop-photos/a.jpg' });
    expect(result.ok && result.bookstore.imageUrl).toBeNull();
  });
});

describe('toListingBookstore', () => {
  it('keeps listing fields, leaves out detail fields, and trims the description', () => {
    const result = parse({ 8: 'x'.repeat(300) });
    if (!result.ok) throw new Error(result.reason);
    const listing = toListingBookstore(result.bookstore);
    expect(listing.name).toBe('Test Books');
    expect(listing.googleRating).toBe('4.7');
    expect(listing.imageUrl).toBe('/photos/42-deadbeef.webp');
    expect(listing.featureIds).toEqual([1, 3]);
    expect(listing.description).toHaveLength(150);
    expect(listing).not.toHaveProperty('street');
    expect(listing).not.toHaveProperty('googleReviews');
    expect(listing).not.toHaveProperty('photoAttribution');
  });
});
