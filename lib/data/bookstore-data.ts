// lib/data/bookstore-data.ts
// Centralized data processing layer with strategic caching
// Single processing function that powers all pages efficiently

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getBookstoresFromSheets, getFeaturesFromSheets } from '@/lib/google-sheets-client';
import { Bookstore, Feature } from '@/shared/schema';
import { getStateAbbrev, STATE_ABBREV_TO_FULL } from '@/lib/state-utils';
import { safeMapGet, safeMapKeys } from './cache-utils';
import { getBookstoreSlug } from './slug';
import { makeCityKey } from './location-key';
import { daysSinceEpoch, pickFeaturedBookstores } from './featured';

// In-memory cache for the *processed* result (avoids re-processing on warm Lambda instances)
let processedDataCache: ProcessedBookstoreData | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch stripped listing rows from Google Sheets, cached in Vercel's shared
 * Data Cache (survives cold starts, shared across Lambda instances).
 * Detail-page-only fields are omitted so the payload stays under the 2 MB limit.
 */
const getCachedRawBookstores = unstable_cache(
  () => getBookstoresFromSheets(true), // listingOnly=true — strips detail fields
  ['bookstores-raw'],
  { revalidate: 3600 } // 1 hour
);

/** Features tab (id → name), cached like the listing so pages don't each read the Sheet. */
export const getFeatures = unstable_cache(
  async (): Promise<Feature[]> => getFeaturesFromSheets(),
  ['features'],
  { revalidate: 3600 }
);

/**
 * Full bookstore data for detail pages — all columns included.
 * Stored in module-level memory only (no unstable_cache) so there is no 2 MB limit.
 */
let fullDataCache: Bookstore[] | null = null;
let fullDataTimestamp = 0;

async function fetchFullBookstoreData(): Promise<Bookstore[]> {
  const now = Date.now();
  if (fullDataCache && (now - fullDataTimestamp) < CACHE_TTL_MS) {
    return fullDataCache;
  }
  console.log('[BookstoreData] Fetching full bookstore data for detail pages...');
  fullDataCache = await getBookstoresFromSheets(false); // listingOnly=false — all columns
  fullDataTimestamp = now;
  return fullDataCache;
}

// ===========================================
// TYPES
// ===========================================

export interface ProcessedBookstoreData {
  // All bookstores (for sitemap, etc.)
  all: Bookstore[];

  // Lookup Maps (serialized as objects by cache)
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
// RAW DATA FETCHING
// ===========================================

/**
 * Fetch all bookstore data from Google Sheets.
 * The Sheets client loads every column in a single API call; the
 * in-memory TTL cache means this runs at most once per hour.
 */
async function fetchAllBookstoreData(): Promise<Bookstore[]> {
  // getCachedRawBookstores hits Vercel's shared Data Cache — no Sheets API call on cache hit
  return getCachedRawBookstores();
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

/**
 * Main function that powers all pages
 * Uses in-memory cache to avoid unstable_cache 2MB limit
 * React cache() provides request deduplication
 */
export const getProcessedBookstoreData = cache(
  async (): Promise<ProcessedBookstoreData> => {
    const now = Date.now();

    // Return cached data if still valid
    if (processedDataCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
      console.log('[BookstoreData] Returning cached data');
      return processedDataCache;
    }

    console.log('[BookstoreData] Fetching and processing all bookstore data...');
    const bookstores = await fetchAllBookstoreData();
    const processed = processBookstoreData(bookstores);
    console.log(`[BookstoreData] Processed ${processed.totalCount} bookstores`);

    // Update in-memory cache
    processedDataCache = processed;
    cacheTimestamp = now;

    return processed;
  }
);

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
  return safeMapGet(data.byCity, makeCityKey(city, stateAbbrev)) || [];
}

/**
 * Get bookstores by state
 */
export async function getBookstoresByState(state: string): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  const stateAbbrev = getStateAbbrev(state);
  return safeMapGet(data.byState, stateAbbrev.toLowerCase()) || [];
}

/**
 * Get bookstores by county
 */
export async function getBookstoresByCounty(county: string, state: string): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  const stateAbbrev = getStateAbbrev(state);
  return safeMapGet(data.byCounty, makeCityKey(county, stateAbbrev)) || [];
}

/**
 * Get bookstores by feature
 */
export async function getBookstoresByFeature(featureId: number): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  return safeMapGet(data.byFeature, String(featureId)) || [];
}

/**
 * Get bookstore by slug
 */
export async function getBookstoreBySlug(slug: string): Promise<Bookstore | null> {
  const data = await getProcessedBookstoreData();
  const bookstore = safeMapGet(data.bySlug, slug.toLowerCase());

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
 * Uses the full-data cache which is NOT subject to the unstable_cache 2 MB limit.
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

  for (const key of safeMapKeys(data.byCity)) {
    const bookstores = safeMapGet(data.byCity, key) || [];
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

  for (const key of safeMapKeys(data.byCounty)) {
    const bookstores = safeMapGet(data.byCounty, key) || [];
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
 * Featured bookstores for today. Same result for every render and cache hit on
 * a given day (UTC), so the homepage doesn't change between requests.
 */
export async function getFeaturedBookstores(count: number = 8): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  return pickFeaturedBookstores(data.all, count, daysSinceEpoch());
}

/**
 * Get popular bookstores (by rating)
 */
export async function getPopularBookstores(limit: number = 15): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  return data.popular.slice(0, limit);
}

/**
 * Get related bookstores (same city > same state > random)
 */
export async function getRelatedBookstores(bookstore: Bookstore, limit: number = 6): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();

  // Try same city first
  if (bookstore.city && bookstore.state) {
    const cityBookstores = (safeMapGet(data.byCity, makeCityKey(bookstore.city, bookstore.state)) || [])
      .filter(b => b.id !== bookstore.id);

    if (cityBookstores.length >= 3) {
      return cityBookstores.slice(0, limit);
    }
  }

  // Fall back to same state
  if (bookstore.state) {
    const stateAbbrev = getStateAbbrev(bookstore.state);
    const stateBookstores = (safeMapGet(data.byState, stateAbbrev.toLowerCase()) || [])
      .filter(b => b.id !== bookstore.id);

    if (stateBookstores.length > 0) {
      return stateBookstores.slice(0, limit);
    }
  }

  // Last resort: today's featured shops
  return pickFeaturedBookstores(data.all, limit + 1, daysSinceEpoch())
    .filter(b => b.id !== bookstore.id)
    .slice(0, limit);
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
      results = safeMapGet(data.byState, stateAbbrev.toLowerCase()) || [];
    }
  }

  // Filter by city (requires state context; keys use state abbrev)
  if (filters.city && filters.state) {
    results = safeMapGet(data.byCity, makeCityKey(filters.city, filters.state)) || [];
  }

  // Filter by county (requires state context; keys use state abbrev)
  if (filters.county && filters.state) {
    results = safeMapGet(data.byCounty, makeCityKey(filters.county, filters.state)) || [];
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
  const bookstores = safeMapGet(data.byState, stateAbbrev.toLowerCase()) || [];
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
