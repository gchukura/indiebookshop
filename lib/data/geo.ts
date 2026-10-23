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
