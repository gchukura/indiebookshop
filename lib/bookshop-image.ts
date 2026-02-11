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
 * Returns the best thumbnail URL for a bookstore card/list:
 * 1. First Google photo (via place-photo API)
 * 2. imageUrl
 * 3. Fallback Unsplash
 */
export function getBookshopThumbnailUrl(bookshop: Bookstore, maxWidth: number = 400): string {
  const rawPhotos = bookshop.googlePhotos ?? (bookshop as { google_photos?: unknown[] }).google_photos;
  const photos = Array.isArray(rawPhotos) ? rawPhotos : [];
  const firstPhoto = photos[0];
  const photoRef = firstPhoto ? extractPhotoReference(firstPhoto) : null;

  if (photoRef) {
    return `/api/place-photo?photo_reference=${encodeURIComponent(photoRef)}&maxwidth=${maxWidth}`;
  }

  if (bookshop.imageUrl && typeof bookshop.imageUrl === 'string') {
    return bookshop.imageUrl;
  }

  return FALLBACK_IMAGE;
}
