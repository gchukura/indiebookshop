/**
 * Zod schema for one row of the Bookstores tab, after header mapping.
 *
 * Input: `Record<string, string>` keyed by the lowercased, trimmed header name
 * (see rowToRecord). Every cell is a string; missing columns read as ''.
 * Output: a fully typed Bookstore.
 *
 * Hard failures (the row is skipped and counted): missing/non-numeric id,
 * missing name, or a Sheets error value (#REF!, #N/A, …) in name/city/state.
 * Soft failures: a malformed JSON or number cell becomes null and the row is kept,
 * so one bad cell doesn't drop a shop from the directory.
 */

import { z } from 'zod';
import type { Bookstore } from '@/shared/schema';
import { toPhotoPath } from '@/lib/bookshop-image';

export type SheetRecord = Record<string, string>;

/** Maps a raw row to { header: cell } using the header row (lowercased, trimmed). */
export function rowToRecord(headers: string[], row: string[]): SheetRecord {
  const record: SheetRecord = {};
  headers.forEach((h, i) => {
    const key = String(h).toLowerCase().trim();
    if (key && !(key in record)) record[key] = String(row[i] ?? '').trim();
  });
  return record;
}

// ---------------------------------------------------------------------------
// Cell coercions
// ---------------------------------------------------------------------------

const isSheetError = (v: string) => v.startsWith('#');

/** Empty → null, else the trimmed string. */
const optionalText = (v: string | undefined) => (v ?? '').trim() || null;

/** Empty or unparseable → null. */
function optionalInt(v: string | undefined): number | null {
  const n = parseInt((v ?? '').trim(), 10);
  return Number.isNaN(n) ? null : n;
}

/** '' → null, 'true'/'1' → true, anything else → false. */
function optionalBool(v: string | undefined): boolean | null {
  const s = (v ?? '').trim().toLowerCase();
  if (!s) return null;
  return s === 'true' || s === '1';
}

/** Missing/empty → live. Only 'false', '0', 'no' hide a shop. */
export function parseLive(v: string | undefined): boolean {
  const s = (v ?? '').trim().toLowerCase();
  return !(s === 'false' || s === '0' || s === 'no');
}

/**
 * feature_ids in any of the formats a CSV export may produce:
 * PostgreSQL array literal {1,2,3}, JSON array [1,2,3], or comma-separated 1,2,3.
 */
export function parseFeatureIds(raw: string | undefined): number[] {
  const s = (raw ?? '').trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s.replace(/^\{/, '[').replace(/\}$/, ']'));
    if (Array.isArray(parsed)) return parsed.map(Number).filter(n => !Number.isNaN(n));
  } catch {
    // fall through to comma split
  }
  return s
    .replace(/[{}[\]]/g, '')
    .split(',')
    .map(part => parseInt(part.trim(), 10))
    .filter(n => !Number.isNaN(n));
}

/** Parses a JSON cell and validates it; empty, invalid JSON, or wrong shape → null. */
function jsonCell<T extends z.ZodTypeAny>(schema: T) {
  return (v: string | undefined): z.infer<T> | null => {
    const s = (v ?? '').trim();
    if (!s) return null;
    try {
      const result = schema.safeParse(JSON.parse(s));
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  };
}

const openingHoursSchema = z.object({
  open_now: z.boolean().optional().default(false),
  weekday_text: z.array(z.string()).optional().default([]),
  periods: z
    .array(
      z.object({
        open: z.object({ day: z.number(), time: z.string() }),
        close: z.object({ day: z.number(), time: z.string() }).optional(),
      })
    )
    .optional(),
});

const reviewsSchema = z.array(
  z.object({
    author_name: z.string(),
    rating: z.number(),
    text: z.string(),
    time: z.number(),
  }).passthrough()
);

const stringArraySchema = z.array(z.string());

// ---------------------------------------------------------------------------
// Row schema
// ---------------------------------------------------------------------------

const requiredCell = (label: string) =>
  z
    .string({ required_error: `missing ${label}` })
    .trim()
    .min(1, `missing ${label}`)
    .refine(v => !isSheetError(v), v => ({ message: `${label} is a sheet error (${v})` }));

const notSheetError = (label: string) =>
  z
    .string()
    .default('')
    .transform(v => v.trim())
    .refine(v => !isSheetError(v), v => ({ message: `${label} is a sheet error (${v})` }));

export const bookstoreRowSchema = z
  .object({
    id: z
      .string({ required_error: 'missing id' })
      .trim()
      .regex(/^\d+$/, 'id is not a positive integer')
      .transform(Number),
    name: requiredCell('name'),
    city: notSheetError('city'),
    state: notSheetError('state'),
  })
  .passthrough()
  .transform((r): Bookstore => {
    const c = r as unknown as SheetRecord;
    return {
      id: r.id,
      name: r.name,
      slug: optionalText(c.slug),
      street: optionalText(c.street),
      city: r.city,
      state: r.state,
      zip: optionalText(c.zip),
      county: optionalText(c.county),
      description: optionalText(c.description),
      // Only R2 photos are served (as same-origin /photos/... paths); anything
      // else, like the dead Supabase Storage URLs, is dropped.
      imageUrl: toPhotoPath(c.image_url || c.imageurl),
      photoAttribution: optionalText(c.photo_attribution),
      photoAttributionUrl: optionalText(c.photo_attribution_url),
      website: optionalText(c.website),
      phone: optionalText(c.phone),
      latitude: optionalText(c.lat_numeric) ?? optionalText(c.latitude),
      longitude: optionalText(c.lng_numeric) ?? optionalText(c.longitude),
      featureIds: parseFeatureIds(c.feature_ids || c.featureids),
      live: parseLive(c.live),
      googlePlaceId: optionalText(c.google_place_id),
      googleRating: optionalText(c.google_rating),
      googleReviewCount: optionalInt(c.google_review_count) || null,
      googleDescription: optionalText(c.google_description),
      googleReviews: jsonCell(reviewsSchema)(c.google_reviews),
      googlePriceLevel: optionalInt(c.google_price_level),
      googleDataUpdatedAt: optionalText(c.google_data_updated_at),
      formattedPhone: optionalText(c.formatted_phone),
      websiteVerified: optionalBool(c.website_verified),
      openingHoursJson: jsonCell(openingHoursSchema)(c.opening_hours_json),
      googleMapsUrl: optionalText(c.google_maps_url),
      googleTypes: jsonCell(stringArraySchema)(c.google_types),
      formattedAddressGoogle: optionalText(c.formatted_address_google),
      businessStatus: optionalText(c.business_status),
      contactDataFetchedAt: optionalText(c.contact_data_fetched_at),
      aiGeneratedDescription: optionalText(c.ai_generated_description),
      descriptionGeneratedAt: optionalText(c.description_generated_at),
      descriptionValidated: optionalBool(c.description_validated),
      descriptionSource: optionalText(c.description_source),
    };
  });

/** Fields kept in listing records (cards, directory, filters). Everything else is left out. */
const LISTING_FIELDS = [
  'id', 'name', 'slug', 'city', 'state', 'county', 'imageUrl', 'live',
  'latitude', 'longitude', 'featureIds', 'googleRating', 'googleReviewCount',
] as const satisfies ReadonlyArray<keyof Bookstore>;

const LISTING_DESCRIPTION_LENGTH = 150;

/**
 * Listing record derived from a full row by picking LISTING_FIELDS plus a cut
 * description, so the whole list fits in Vercel's 2 MB unstable_cache entry
 * (~0.75 MB for 2,165 shops; writing the other fields as null took ~1.9 MB).
 * Detail-only fields are absent (undefined) — read them from the full cache.
 */
export function toListingBookstore(full: Bookstore): Bookstore {
  const listing: Record<string, unknown> = {};
  for (const field of LISTING_FIELDS) listing[field] = full[field];
  listing.description = (full.description ?? '').slice(0, LISTING_DESCRIPTION_LENGTH);
  return listing as Bookstore;
}

export type RowParseResult =
  | { ok: true; bookstore: Bookstore }
  | { ok: false; reason: string };

/** Parses one mapped row; on failure returns the first issue as a reason. */
export function parseBookstoreRow(record: SheetRecord): RowParseResult {
  const result = bookstoreRowSchema.safeParse(record);
  if (result.success) return { ok: true, bookstore: result.data };
  const issue = result.error.issues[0];
  const id = record.id ? `id ${record.id}` : 'no id';
  return { ok: false, reason: `${id}: ${issue.message}` };
}
