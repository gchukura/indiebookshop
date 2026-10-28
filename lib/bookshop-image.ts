import type { Bookstore } from '@/shared/schema';

/**
 * Shop photos live in Cloudflare R2 (scripts/fetch-google-photos.mjs) and are
 * served same-origin at /photos/... via a rewrite in next.config.mjs. Each photo
 * has a 1200px file, an `-800` copy, and a `-400` thumbnail next to it.
 *
 * Shops without a photo get a generic book placeholder from public/placeholders/,
 * picked by id so a shop always shows the same one. Placeholders are for display
 * only: never use them for og:image or structured data.
 */

export type PhotoSize = 'large' | 'thumb';

/** Photo widths in R2. Placeholders only come in large and thumb. */
export type PhotoWidth = PhotoSize | 'medium';

const PHOTO_SUFFIX: Record<PhotoWidth, string> = { large: '', medium: '-800', thumb: '-400' };

const PLACEHOLDER_COUNT = 18;

/** Converts a stored photo URL (r2.dev or /photos/...) to its same-origin path, or null if it's not ours. */
export function toPhotoPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith('/photos/')) return raw;
  try {
    const url = new URL(raw);
    return url.hostname.endsWith('.r2.dev') && url.pathname.startsWith('/photos/') ? url.pathname : null;
  } catch {
    return null;
  }
}

/** The shop's own photo, or null. */
export function getBookshopPhotoUrl(bookshop: Pick<Bookstore, 'imageUrl'>, size: PhotoWidth = 'large'): string | null {
  const path = toPhotoPath(bookshop.imageUrl);
  if (!path) return null;
  return path.replace(/\.webp$/, `${PHOTO_SUFFIX[size]}.webp`);
}

/** Generic book placeholder for a shop, stable per id. */
export function getPlaceholderUrl(id: number, size: PhotoSize = 'large'): string {
  const n = String((Math.abs(id || 0) % PLACEHOLDER_COUNT) + 1).padStart(2, '0');
  return `/placeholders/books-${n}${size === 'thumb' ? '-400' : ''}.webp`;
}

/** Photo for display on cards and detail pages: the shop's own, else its placeholder. */
export function getBookshopImageUrl(bookshop: Pick<Bookstore, 'id' | 'imageUrl'>, size: PhotoSize = 'thumb'): string {
  return getBookshopPhotoUrl(bookshop, size) ?? getPlaceholderUrl(bookshop.id, size);
}
