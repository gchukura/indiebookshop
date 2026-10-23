/** Coordinates and great-circle distances for shops. */

import type { Bookstore } from '@/shared/schema';

export type LatLng = { lat: number; lng: number };

/** Parsed coordinates, or null if missing, invalid, or 0,0. */
export function shopCoordinates(shop: Pick<Bookstore, 'latitude' | 'longitude'>): LatLng | null {
  const lat = parseFloat(shop.latitude || '');
  const lng = parseFloat(shop.longitude || '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}

/** Haversine distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export const kmToMiles = (km: number) => km * 0.621371;

/** Haversine distance in miles. */
export function haversineMiles(a: LatLng, b: LatLng): number {
  return kmToMiles(distanceKm(a, b));
}

/**
 * The `n` shops nearest to a point, within `radiusMiles` if given, sorted by
 * distance. Shops without coordinates are skipped. ~3,000 shops is a trivial
 * in-memory scan.
 */
export function nearest<T extends Pick<Bookstore, 'latitude' | 'longitude'>>(
  shops: T[],
  lat: number,
  lng: number,
  n: number,
  radiusMiles = Infinity
): Array<{ shop: T; miles: number }> {
  const origin = { lat, lng };
  const hits: Array<{ shop: T; miles: number }> = [];
  for (const shop of shops) {
    const at = shopCoordinates(shop);
    if (!at) continue;
    const miles = haversineMiles(origin, at);
    if (miles <= radiusMiles) hits.push({ shop, miles });
  }
  return hits.sort((a, b) => a.miles - b.miles).slice(0, n);
}
