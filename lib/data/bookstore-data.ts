// lib/data/bookstore-data.ts
// Centralized data layer: reads the build-time Sheet snapshot and builds the indexes
// Single processing function that powers all pages efficiently

import { cache } from 'react';
import { getBookstoresFromSheets, getEventsFromSheets, getFeaturesFromSheets } from '@/lib/google-sheets-client';
import { Bookstore, Event, Feature } from '@/shared/schema';
import { getStateAbbrev, STATE_ABBREV_TO_FULL } from '@/lib/state-utils';
import { getBookstoreSlug } from './slug';
import { makeCityKey } from './location-key';
import { daysSinceEpoch, pickFeaturedBookstores } from './featured';
import { nearestBookstores, type NearbyShop } from './nearby';
import { upcomingEvents } from './events';

/**
 * The data is the Sheet snapshot taken at build time (.data/sheet.json), fixed for
 * the life of a deployment, so each read below runs once per server process and is
 * kept. A failed read isn't kept, so the next call retries.
 */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () =>
    (promise ??= load().catch(err => {
      promise = null;
      throw err;
    }));
}

/** Listing fields only (LISTING_FIELDS): powers home, directory, location pages, sitemap, search. */
const getListingBookstores = once(() => getBookstoresFromSheets(true));

/** Every column, for shop detail pages. */
const fetchFullBookstoreData = once(() => getBookstoresFromSheets(false));

/** Features tab (id → name). */
export const getFeatures = once((): Promise<Feature[]> => getFeaturesFromSheets());

/** Events tab. */
const getAllEvents = once((): Promise<Event[]> => getEventsFromSheets());

/** A shop's events from today on, soonest first (undated ones last). */
export async function getUpcomingEvents(bookshopId: number): Promise<Event[]> {
  const events = (await getAllEvents()).filter(e => e.bookshopId === bookshopId);
  return upcomingEvents(events, new Date().toISOString().slice(0, 10));
}

/** Every shop's events from today on, soonest first. */
export async function getAllUpcomingEvents(): Promise<Event[]> {
  return upcomingEvents(await getAllEvents(), new Date().toISOString().slice(0, 10));
}

/** The nearest shops by distance (miles), or same-state shops when the shop has no coordinates. */
export async function getNearbyBookstores(bookstore: Bookstore, limit: number = 6): Promise<NearbyShop[]> {
  const data = await getProcessedBookstoreData();
  return nearestBookstores(data.all, bookstore, limit);
}

// ===========================================
// TYPES
// ===========================================

export interface ProcessedBookstoreData {
  // All bookstores (for sitemap, etc.)
  all: Bookstore[];

  // Lookup objects
  byId: Record<number, Bookstore>;
  byCity: Record<string, Bookstore[]>;
  byState: Record<string, Bookstore[]>;
  byCounty: Record<string, Bookstore[]>;
  byFeature: Record<string, Bookstore[]>;
  bySlug: Record<string, Bookstore>;

  // Unique sorted lists
  cities: string[];
  states: string[];
  counties: string[];
  features: number[];

  // Pre-computed collections
  popular: Bookstore[];

  // Stats
  totalCount: number;
  lastUpdated: string;
}

// ===========================================
// DATA PROCESSING
// ===========================================

/**
 * Process raw bookstore data into efficient lookup structures
 * Creates Maps/objects for O(1) lookups by city, state, county, feature
 */
function processBookstoreData(bookstores: Bookstore[]): ProcessedBookstoreData {
  // Initialize lookup objects
  const byId: Record<number, Bookstore> = {};
  const byCity: Record<string, Bookstore[]> = {};
  const byState: Record<string, Bookstore[]> = {};
  const byCounty: Record<string, Bookstore[]> = {};
  const byFeature: Record<string, Bookstore[]> = {};
  const bySlug: Record<string, Bookstore> = {};

  // Track unique values
  const citiesSet = new Set<string>();
  const statesSet = new Set<string>();
  const countiesSet = new Set<string>();
  const featuresSet = new Set<number>();

  // Single pass through all bookstores
  for (const bookstore of bookstores) {
    // Index by id
    byId[bookstore.id] = bookstore;

    // Index by slug
    const slug = getBookstoreSlug(bookstore);
    if (slug) {
      bySlug[slug.toLowerCase()] = bookstore;
    }

    // Normalize for consistent lookups: use canonical state abbreviation so "California" and "CA" match
    const stateNorm = (bookstore.state || '').trim();
    const stateAbbrev = stateNorm ? getStateAbbrev(stateNorm) : '';
    const cityNorm = (bookstore.city || '').trim();
    const countyNorm = (bookstore.county || '').trim();

    // Index by city (key by state abbrev so city+state lookup is consistent)
    if (cityNorm && stateAbbrev) {
      const cityKey = makeCityKey(cityNorm, stateAbbrev);
      if (!byCity[cityKey]) byCity[cityKey] = [];
      byCity[cityKey].push(bookstore);
      citiesSet.add(cityNorm);
    }

    // Index by state (always key by abbreviation)
    if (stateAbbrev) {
      const stateKey = stateAbbrev.toLowerCase();
      if (!byState[stateKey]) byState[stateKey] = [];
      byState[stateKey].push(bookstore);
      statesSet.add(stateAbbrev);
    }

    // Index by county (key by state abbrev)
    if (countyNorm && stateAbbrev) {
      const countyKey = makeCityKey(countyNorm, stateAbbrev);
      if (!byCounty[countyKey]) byCounty[countyKey] = [];
      byCounty[countyKey].push(bookstore);
      countiesSet.add(countyNorm);
    }

    // Index by feature
    if (bookstore.featureIds && Array.isArray(bookstore.featureIds)) {
      for (const featureId of bookstore.featureIds) {
        const featureKey = String(featureId);
        if (!byFeature[featureKey]) byFeature[featureKey] = [];
        byFeature[featureKey].push(bookstore);
        featuresSet.add(featureId);
      }
    }
  }

  // Pre-compute popular (by rating). Featured is picked per day in getFeaturedBookstores.
  const popular = [...bookstores]
    .filter(b => b.googleRating)
    .sort((a, b) => {
      const ratingA = parseFloat(a.googleRating || '0');
      const ratingB = parseFloat(b.googleRating || '0');
      if (ratingB !== ratingA) return ratingB - ratingA;
      return (b.googleReviewCount || 0) - (a.googleReviewCount || 0);
    })
    .slice(0, 15);

  return {
    all: bookstores,
    byId,
    byCity,
    byState,
    byCounty,
    byFeature,
    bySlug,
    cities: Array.from(citiesSet).sort(),
    states: Array.from(statesSet).sort((a, b) =>
      (STATE_ABBREV_TO_FULL[a] || a).localeCompare(STATE_ABBREV_TO_FULL[b] || b)
    ),
    counties: Array.from(countiesSet).sort(),
    features: Array.from(featuresSet).sort((a, b) => a - b),
    popular,
    totalCount: bookstores.length,
    lastUpdated: new Date().toISOString(),
  };
}

// ===========================================
// MAIN CACHED FUNCTION
// ===========================================

/** Processed once per server process (see once() above); React cache() dedupes within a request. */
const loadProcessedBookstoreData = once(async () => processBookstoreData(await getListingBookstores()));

/** Main function that powers all pages. */
export const getProcessedBookstoreData = cache((): Promise<ProcessedBookstoreData> => loadProcessedBookstoreData());

// ===========================================
// HELPER FUNCTIONS (use shared cache)
// ===========================================

/**
 * Get all bookstores (for sitemap, etc.)
 */
export async function getAllBookstores(): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  return data.all;
}

/**
 * Get bookstores by city
 */
export async function getBookstoresByCity(city: string, state: string): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  const stateAbbrev = getStateAbbrev(state);
  return data.byCity[makeCityKey(city, stateAbbrev)] || [];
}

/**
 * Get bookstores by state
 */
export async function getBookstoresByState(state: string): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  const stateAbbrev = getStateAbbrev(state);
  return data.byState[stateAbbrev.toLowerCase()] || [];
}

/**
 * Get bookstores by county
 */
export async function getBookstoresByCounty(county: string, state: string): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  const stateAbbrev = getStateAbbrev(state);
  return data.byCounty[makeCityKey(county, stateAbbrev)] || [];
}

/**
 * Get bookstores by feature
 */
export async function getBookstoresByFeature(featureId: number): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  return data.byFeature[String(featureId)] || [];
}

/**
 * Get bookstore by slug
 */
export async function getBookstoreBySlug(slug: string): Promise<Bookstore | null> {
  const data = await getProcessedBookstoreData();
  const bookstore = data.bySlug[slug.toLowerCase()];

  if (bookstore) return bookstore;

  // Fallback: check if any bookstore's generated slug matches
  for (const b of data.all) {
    if (getBookstoreSlug(b).toLowerCase() === slug.toLowerCase()) {
      return b;
    }
  }

  return null;
}

/**
 * Get bookstore by slug with full details (contact info, reviews, hours, etc.).
 */
export async function getBookstoreBySlugFull(slug: string): Promise<Bookstore | null> {
  const bookstores = await fetchFullBookstoreData();
  const lowerSlug = slug.toLowerCase();
  return (
    bookstores.find(b => getBookstoreSlug(b).toLowerCase() === lowerSlug) ??
    null
  );
}

/**
 * Get all unique states
 */
export async function getStates(): Promise<string[]> {
  const data = await getProcessedBookstoreData();
  return data.states;
}

/**
 * Get all unique cities (with state info)
 */
export async function getCitiesWithState(): Promise<Array<{ city: string; state: string; count: number }>> {
  const data = await getProcessedBookstoreData();
  const cities: Array<{ city: string; state: string; count: number }> = [];

  for (const key of Object.keys(data.byCity)) {
    const bookstores = data.byCity[key] || [];
    if (bookstores.length > 0) {
      // Get proper case from first bookstore
      cities.push({
        city: bookstores[0].city,
        state: bookstores[0].state,
        count: bookstores.length,
      });
    }
  }

  return cities.sort((a, b) => a.city.localeCompare(b.city));
}

/**
 * Get all unique counties (with state info)
 */
export async function getCountiesWithState(): Promise<Array<{ county: string; state: string; count: number }>> {
  const data = await getProcessedBookstoreData();
  const counties: Array<{ county: string; state: string; count: number }> = [];

  for (const key of Object.keys(data.byCounty)) {
    const bookstores = data.byCounty[key] || [];
    if (bookstores.length > 0) {
      counties.push({
        county: bookstores[0].county!,
        state: bookstores[0].state,
        count: bookstores.length,
      });
    }
  }

  return counties.sort((a, b) => a.county.localeCompare(b.county));
}

/**
 * Featured bookstores for today (or this week). Same result for every render
 * and cache hit within the period (UTC), so the homepage doesn't change between requests.
 */
export async function getFeaturedBookstores(count: number = 8, period: 'day' | 'week' = 'day'): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  const day = daysSinceEpoch();
  return pickFeaturedBookstores(data.all, count, period === 'week' ? Math.floor(day / 7) : day);
}

/**
 * Get popular bookstores (by rating)
 */
export async function getPopularBookstores(limit: number = 15): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  return data.popular.slice(0, limit);
}

/**
 * Get filtered bookstores with multiple criteria
 */
export async function getFilteredBookstores(filters: {
  state?: string;
  city?: string;
  county?: string;
  features?: number[];
}): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  let results: Bookstore[] = data.all;

  // Filter by state (byState is keyed by canonical abbreviation)
  if (filters.state) {
    const stateAbbrev = getStateAbbrev(filters.state.trim());
    if (stateAbbrev) {
      results = data.byState[stateAbbrev.toLowerCase()] || [];
    }
  }

  // Filter by city (requires state context; keys use state abbrev)
  if (filters.city && filters.state) {
    results = data.byCity[makeCityKey(filters.city, filters.state)] || [];
  }

  // Filter by county (requires state context; keys use state abbrev)
  if (filters.county && filters.state) {
    results = data.byCounty[makeCityKey(filters.county, filters.state)] || [];
  }

  // Filter by features
  if (filters.features && filters.features.length > 0) {
    results = results.filter(b =>
      b.featureIds && filters.features!.some(fid => b.featureIds!.includes(fid))
    );
  }

  return results;
}

// ===========================================
// STATS & COUNTS
// ===========================================

/**
 * Get total bookstore count
 */
export async function getTotalBookstoreCount(): Promise<number> {
  const data = await getProcessedBookstoreData();
  return data.totalCount;
}

/**
 * Get count by state
 */
export async function getCountByState(state: string): Promise<number> {
  const data = await getProcessedBookstoreData();
  const stateAbbrev = getStateAbbrev(state);
  const bookstores = data.byState[stateAbbrev.toLowerCase()] || [];
  return bookstores.length;
}

/**
 * Get bookstore by ID with full details.
 * Uses the full-data cache (no 2 MB limit).
 */
export async function getBookstoreById(id: number): Promise<Bookstore | null> {
  const bookstores = await fetchFullBookstoreData();
  return bookstores.find(b => b.id === id) ?? null;
}
