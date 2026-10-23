import { describe, expect, it } from 'vitest';
import type { Bookstore } from '@/shared/schema';
import { buildLocationIndex, nearestCities, pickDisplayName, sortShops } from '@/lib/data/location-index';
import { makeCityKey } from '@/lib/data/location-key';

let nextId = 1;
const shop = (city: string, state: string, county: string | null, rating: string | null, lat: number, lng: number) =>
  ({
    id: nextId++, name: `${city} Books ${nextId}`, slug: null, city, state, county,
    googleRating: rating, latitude: String(lat), longitude: String(lng), featureIds: [],
  }) as unknown as Bookstore;

function index(shops: Bookstore[]) {
  const byState: Record<string, Bookstore[]> = {};
  const byCity: Record<string, Bookstore[]> = {};
  const byCounty: Record<string, Bookstore[]> = {};
  for (const s of shops) {
    (byState[s.state.toLowerCase()] ??= []).push(s);
    (byCity[makeCityKey(s.city, s.state)] ??= []).push(s);
    if (s.county) (byCounty[makeCityKey(s.county, s.state)] ??= []).push(s);
  }
  return buildLocationIndex({ byState, byCity, byCounty });
}

const shops = [
  shop('Berkeley', 'CA', 'Alameda', '4.8', 37.87, -122.27),
  shop('Berkeley', 'CA', 'Alameda', '4.2', 37.87, -122.27),
  shop('Oakland', 'CA', 'Alameda', '4.9', 37.8, -122.27),
  shop('San Diego', 'CA', 'San Diego', null, 32.72, -117.16),
  shop('St. Paul', 'MN', 'Ramsey', '4.5', 44.95, -93.09),
  shop('St Paul', 'MN', 'Ramsey', '4.6', 44.95, -93.09),
  shop('TUCSON', 'AZ', 'Pima', '4.0', 32.22, -110.97),
  shop('Toronto', 'ON', null, '4.7', 43.65, -79.38),
];
const idx = index(shops);

describe('buildLocationIndex', () => {
  it('includes US states only, alphabetically', () => {
    expect(idx.states.map(s => s.slug)).toEqual(['arizona', 'california', 'minnesota']);
  });

  it('groups cities and counties with counts, most shops first', () => {
    const ca = idx.statesBySlug.california;
    expect(ca.cities.map(c => [c.slug, c.shops.length])).toEqual([
      ['berkeley', 2], ['oakland', 1], ['san-diego', 1],
    ]);
    expect(ca.countiesBySlug.alameda.displayName).toBe('Alameda County');
    expect(ca.countiesBySlug.alameda.cityNames).toEqual(['Berkeley', 'Oakland']);
  });

  it('merges spelling variants of a city under one slug', () => {
    const mn = idx.statesBySlug.minnesota;
    expect(mn.cities).toHaveLength(1);
    expect(mn.cities[0]).toMatchObject({ slug: 'st-paul', name: 'St. Paul' });
    expect(mn.cities[0].shops).toHaveLength(2);
    expect(idx.statesBySlug.arizona.cities[0].name).toBe('TUCSON');
  });

  it('sorts shops by rating, unrated last', () => {
    expect(idx.statesBySlug.california.shops.map(s => s.googleRating)).toEqual(['4.9', '4.8', '4.2', null]);
  });
});

describe('helpers', () => {
  it('pickDisplayName prefers mixed case, then frequency, then punctuation', () => {
    expect(pickDisplayName(['TUCSON', 'TUCSON', 'Tucson'])).toBe('Tucson');
    expect(pickDisplayName(['St Paul', 'St. Paul'])).toBe('St. Paul');
  });

  it('sortShops breaks rating ties by name', () => {
    const a = { name: 'B', googleRating: '4.5' } as Bookstore;
    const b = { name: 'A', googleRating: '4.5' } as Bookstore;
    expect(sortShops([a, b]).map(s => s.name)).toEqual(['A', 'B']);
  });

  it('nearestCities orders by distance', () => {
    const ca = idx.statesBySlug.california;
    expect(nearestCities(ca, ca.citiesBySlug.berkeley).map(c => c.slug)).toEqual(['oakland', 'san-diego']);
  });
});
