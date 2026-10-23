/**
 * Groups shops into states → cities / counties for the /bookshops pages.
 * Pure (no data fetching) so it can be unit-tested; see lib/data/locations.ts
 * for the cached server getter.
 *
 * Cities are grouped by slug within a state, so "St. Paul" and "St Paul", or
 * "TUCSON" and "Tucson", share one page under the best-cased name.
 */

import type { Bookstore } from '@/shared/schema';
import { STATE_ABBREV_TO_FULL, getStateAbbrev } from '@/lib/state-utils';
import { splitCityKey } from './location-key';
import { getBookstoreSlug } from './slug';
import { distanceKm } from './geo';
import {
  cityToSlug,
  countyDisplayName,
  countyToSlug,
  stateToSlug,
  stripCountySuffix,
} from './location-slugs';

export type CityLocation = {
  name: string;
  slug: string;
  stateAbbrev: string;
  shops: Bookstore[];
  /** Most common county among the city's shops, if any. */
  county: string | null;
  /** Average of the shops' coordinates, used for "nearby cities". */
  center: { lat: number; lng: number } | null;
};

export type CountyLocation = {
  /** Without the "County" suffix, e.g. "Alameda". */
  name: string;
  /** e.g. "Alameda County", "Orleans Parish". */
  displayName: string;
  slug: string;
  stateAbbrev: string;
  shops: Bookstore[];
  /** Cities in the county, most shops first. */
  cityNames: string[];
};

export type StateLocation = {
  abbrev: string;
  name: string;
  slug: string;
  shops: Bookstore[];
  /** Most shops first, then by name. */
  cities: CityLocation[];
  /** Alphabetical. */
  counties: CountyLocation[];
  citiesBySlug: Record<string, CityLocation>;
  countiesBySlug: Record<string, CountyLocation>;
};

export type LocationIndex = {
  /** US states and DC that have shops, alphabetical. */
  states: StateLocation[];
  statesBySlug: Record<string, StateLocation>;
};

type IndexInput = {
  byState: Record<string, Bookstore[]>;
  byCity: Record<string, Bookstore[]>;
  byCounty: Record<string, Bookstore[]>;
};

/** Highest rating first (unrated last), then by name. */
export function sortShops(shops: Bookstore[]): Bookstore[] {
  const rating = (b: Bookstore) => parseFloat(b.googleRating || '') || 0;
  return [...shops].sort((a, b) => rating(b) - rating(a) || a.name.localeCompare(b.name));
}

/**
 * Picks the display spelling among variants of one place name: mixed case
 * beats ALL CAPS / all lowercase, then the most common, then the longer one
 * (so "St. Paul" beats "St Paul").
 */
export function pickDisplayName(variants: string[]): string {
  const counts = new Map<string, number>();
  for (const v of variants) {
    const name = v.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const mixedCase = (s: string) => s !== s.toUpperCase() && s !== s.toLowerCase();
  return [...counts.entries()].sort(
    ([a, ca], [b, cb]) =>
      Number(mixedCase(b)) - Number(mixedCase(a)) || cb - ca || b.length - a.length || a.localeCompare(b)
  )[0]?.[0] ?? '';
}

function mostCommon(values: Array<string | null | undefined>): string | null {
  const names = values.map(v => v?.trim()).filter((v): v is string => Boolean(v));
  return names.length ? pickDisplayName(names) : null;
}

function centerOf(shops: Bookstore[]): CityLocation['center'] {
  const points = shops
    .map(s => ({ lat: parseFloat(s.latitude || ''), lng: parseFloat(s.longitude || '') }))
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0));
  if (!points.length) return null;
  return {
    lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
    lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
  };
}

/** Groups index entries ("place|st" → shops) by state abbrev and place slug. */
function groupByPlaceSlug(
  index: Record<string, Bookstore[]>,
  placeOf: (shop: Bookstore) => string | null,
  slugOf: (place: string) => string
): Map<string, Map<string, Bookstore[]>> {
  const byState = new Map<string, Map<string, Bookstore[]>>();
  for (const [key, shops] of Object.entries(index)) {
    if (!shops?.length) continue;
    const abbrev = splitCityKey(key).state.toUpperCase();
    const slug = slugOf(placeOf(shops[0]) ?? '');
    if (!abbrev || !slug) continue;
    const places = byState.get(abbrev) ?? byState.set(abbrev, new Map()).get(abbrev)!;
    places.set(slug, [...(places.get(slug) ?? []), ...shops]);
  }
  return byState;
}

export function buildLocationIndex({ byState, byCity, byCounty }: IndexInput): LocationIndex {
  const citiesByState = groupByPlaceSlug(byCity, s => s.city, cityToSlug);
  const countiesByState = groupByPlaceSlug(byCounty, s => s.county, countyToSlug);

  const states: StateLocation[] = [];
  for (const [key, stateShops] of Object.entries(byState)) {
    const abbrev = getStateAbbrev(key);
    const name = STATE_ABBREV_TO_FULL[abbrev];
    if (!name || !stateShops?.length) continue; // US states and DC only

    const cities: CityLocation[] = [...(citiesByState.get(abbrev) ?? new Map<string, Bookstore[]>())].map(([slug, shops]) => ({
      name: pickDisplayName(shops.map(s => s.city)),
      slug,
      stateAbbrev: abbrev,
      shops: sortShops(shops),
      county: mostCommon(shops.map(s => s.county && stripCountySuffix(s.county))),
      center: centerOf(shops),
    }));
    cities.sort((a, b) => b.shops.length - a.shops.length || a.name.localeCompare(b.name));

    const counties: CountyLocation[] = [...(countiesByState.get(abbrev) ?? new Map<string, Bookstore[]>())].map(([slug, shops]) => {
      const countyName = stripCountySuffix(pickDisplayName(shops.map(s => s.county ?? '')));
      const cityCounts = new Map<string, number>();
      for (const s of shops) {
        const city = cities.find(c => c.slug === cityToSlug(s.city))?.name ?? s.city;
        if (city) cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
      }
      return {
        name: countyName,
        displayName: countyDisplayName(countyName, abbrev),
        slug,
        stateAbbrev: abbrev,
        shops: sortShops(shops),
        cityNames: [...cityCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c),
      };
    });
    counties.sort((a, b) => a.name.localeCompare(b.name));

    states.push({
      abbrev,
      name,
      slug: stateToSlug(abbrev),
      shops: sortShops(stateShops),
      cities,
      counties,
      citiesBySlug: Object.fromEntries(cities.map(c => [c.slug, c])),
      countiesBySlug: Object.fromEntries(counties.map(c => [c.slug, c])),
    });
  }
  states.sort((a, b) => a.name.localeCompare(b.name));

  return { states, statesBySlug: Object.fromEntries(states.map(s => [s.slug, s])) };
}

/** Other cities in the same state, nearest first (cities without coordinates last). */
export function nearestCities(state: StateLocation, city: CityLocation, limit = 12): CityLocation[] {
  const others = state.cities.filter(c => c.slug !== city.slug);
  const origin = city.center;
  if (!origin) return others.slice(0, limit);
  return others
    .map(c => ({ c, d: c.center ? distanceKm(origin, c.center) : Infinity }))
    .sort((a, b) => a.d - b.d || b.c.shops.length - a.c.shops.length)
    .slice(0, limit)
    .map(({ c }) => c);
}

/** Shops with usable coordinates, in the shape the map island needs. */
export function toMapShops(shops: Bookstore[]): Array<{ name: string; slug: string; lat: number; lng: number }> {
  return shops.flatMap(s => {
    const lat = parseFloat(s.latitude || '');
    const lng = parseFloat(s.longitude || '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return [];
    return [{ name: s.name, slug: getBookstoreSlug(s), lat, lng }];
  });
}
