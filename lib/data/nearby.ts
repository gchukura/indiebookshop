import type { Bookstore } from '@/shared/schema';
import { getStateAbbrev } from '@/lib/state-utils';
import { distanceKm, kmToMiles, shopCoordinates } from './geo';

export type NearbyShop = { shop: Bookstore; miles?: number };

/**
 * The `limit` shops nearest to `shop` by straight-line distance. If the shop
 * has no coordinates, falls back to other shops in the same state (no distance).
 */
export function nearestBookstores(all: Bookstore[], shop: Bookstore, limit = 6): NearbyShop[] {
  const origin = shopCoordinates(shop);
  const others = all.filter(b => b.id !== shop.id);
  if (!origin) {
    const state = getStateAbbrev(shop.state);
    return others.filter(b => getStateAbbrev(b.state) === state).slice(0, limit).map(b => ({ shop: b }));
  }
  return others
    .flatMap(b => {
      const at = shopCoordinates(b);
      return at ? [{ shop: b, miles: kmToMiles(distanceKm(origin, at)) }] : [];
    })
    .sort((a, b) => a.miles - b.miles)
    .slice(0, limit);
}
