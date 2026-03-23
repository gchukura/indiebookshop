import type { Bookstore } from '@/shared/schema';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300';

function extractPhotoReference(photo: unknown): string | null {
  if (!photo) return null;
  if (typeof photo === 'string') {
    const ref = String(photo).trim();
    return ref.length > 10 ? ref : null;
  }
  if (typeof photo === 'object' && photo !== null && 'photo_reference' in photo) {
    const ref = (photo as { photo_reference?: string }).photo_reference;
    return ref && typeof ref === 'string' && ref.trim().length > 10 ? ref.trim() : null;
  }
  if (typeof photo === 'object' && photo !== null && 'photoReference' in photo) {
    const ref = (photo as { photoReference?: string }).photoReference;
    return ref && typeof ref === 'string' && ref.trim().length > 10 ? ref.trim() : null;
  }
  return null;
}

/**
 * Returns the best thumbnail URL for a bookstore card/list, or null if no
 * real photo is available. Callers should skip rendering the image when null
 * rather than showing a generic placeholder.
 *
 * Priority:
 * 1. imageUrl (permanent CDN — Supabase URLs suppressed server-side during migration)
 * 2. First Google photo via place-photo proxy
 */
export function getBookshopThumbnailUrl(bookshop: Bookstore, maxWidth: number = 400): string | null {
  if (bookshop.imageUrl && typeof bookshop.imageUrl === 'string') {
    return bookshop.imageUrl;
  }

  const rawPhotos = bookshop.googlePhotos ?? (bookshop as { google_photos?: unknown[] }).google_photos;
  const photos = Array.isArray(rawPhotos) ? rawPhotos : [];
  const photoRef = photos[0] ? extractPhotoReference(photos[0]) : null;
  if (photoRef) {
    return `/api/place-photo?photo_reference=${encodeURIComponent(photoRef)}&maxwidth=${maxWidth}`;
  }

  return null;
}
