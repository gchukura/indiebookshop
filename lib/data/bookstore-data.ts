// lib/data/bookstore-data.ts
// Centralized data processing layer with strategic caching
// Single processing function that powers all pages efficiently

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getBookstoresFromSheets } from '@/lib/google-sheets-client';
import { Bookstore } from '@/shared/schema';
import { getStateAbbrev, STATE_ABBREV_TO_FULL } from '@/lib/state-utils';
import { safeMapGet, safeMapKeys } from './cache-utils';

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
  const rows = await getBookstoresFromSheets(false); // listingOnly=false — all columns
  fullDataCache = rows.map(mapBookstoreData);
  fullDataTimestamp = now;
  return fullDataCache;
}

export { getStateAbbrev, getStateDisplayName, STATE_ABBREV_TO_FULL } from '@/lib/state-utils';

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
  featured: Bookstore[];
  popular: Bookstore[];

  // Stats
  totalCount: number;
  lastUpdated: string;
}

// ===========================================
// DATA MAPPING FUNCTION
// ===========================================

/**
 * Maps raw row data (from Google Sheets) to the Bookstore type.
 * The Google Sheets client already handles all column-name mapping and
 * JSON parsing, so this is a lightweight identity pass with a few
 * numeric-column fallbacks retained for safety.
 */
function mapBookstoreData(item: any): Bookstore {
  // item comes from getBookstoresFromSheets() which already returns camelCase properties.
  // Each override checks snake_case first (legacy/Supabase path) then camelCase (Sheets path).
  return {
    ...item,
    // Numeric columns — prefer pre-parsed numeric field
    latitude: item.lat_numeric?.toString() || item.latitude || null,
    longitude: item.lng_numeric?.toString() || item.longitude || null,
    // Feature IDs
    featureIds: item.feature_ids || item.featureIds || [],
    // Image URL — sheet column is camelCase "imageUrl"
    imageUrl: item.image_url || item.imageUrl || null,
    // Google enrichment fields — snake_case from Supabase, camelCase from Sheets
    googleRating: item.google_rating || item.googleRating || null,
    googlePlaceId: item.google_place_id || item.googlePlaceId || null,
    googleReviewCount: item.google_review_count || item.googleReviewCount || null,
    googleDescription: item.google_description || item.googleDescription || null,
    googlePhotos: parseJsonb(item.google_photos ?? item.googlePhotos),
    googleReviews: parseJsonb(item.google_reviews ?? item.googleReviews),
    googlePriceLevel: item.google_price_level || item.googlePriceLevel || null,
    googleDataUpdatedAt: item.google_data_updated_at || item.googleDataUpdatedAt || null,
    formattedPhone: item.formatted_phone || item.formattedPhone || null,
    websiteVerified: item.website_verified ?? item.websiteVerified ?? null,
    openingHoursJson: item.opening_hours_json || item.openingHoursJson || null,
    googleMapsUrl: item.google_maps_url || item.googleMapsUrl || null,
    googleTypes: item.google_types || item.googleTypes || null,
    formattedAddressGoogle: item.formatted_address_google || item.formattedAddressGoogle || null,
    businessStatus: item.business_status || item.businessStatus || null,
    contactDataFetchedAt: item.contact_data_fetched_at || item.contactDataFetchedAt || null,
    aiGeneratedDescription: item.ai_generated_description || item.aiGeneratedDescription || null,
    descriptionGeneratedAt: item.description_generated_at || item.descriptionGeneratedAt || null,
    descriptionValidated: item.description_validated ?? item.descriptionValidated ?? null,
    descriptionSource: item.description_source || item.descriptionSource || null,
    // Prefer parsed JSON hours over raw text
    hours: (item.hours_json || item.openingHoursJson)
      ? (() => { const v = item.hours_json || item.openingHoursJson; return typeof v === 'string' ? JSON.parse(v) : v; })()
      : null,
  } as Bookstore;
}

/**
 * Safely parse jsonb columns (may be string, array, or object from Supabase/PostgREST)
 */
function parseJsonb(value: any): any[] | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  // Supabase/PostgREST sometimes returns JSONB as plain object (e.g. indexed keys)
  if (typeof value === 'object') {
    const arr = Object.values(value);
    return arr.length > 0 ? arr : null;
  }
  return null;
}

/**
 * Generate slug from bookstore name
 */
export function generateSlugFromName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
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
  const rows = await getCachedRawBookstores();
  return rows.map(mapBookstoreData);
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
    const slug = bookstore.slug || generateSlugFromName(bookstore.name);
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
      const cityKey = `${cityNorm.toLowerCase()}-${stateAbbrev.toLowerCase()}`;
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
      const countyKey = `${countyNorm.toLowerCase()}-${stateAbbrev.toLowerCase()}`;
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

  // Pre-compute featured (random sample) and popular (by rating)
  const shuffled = [...bookstores].sort(() => Math.random() - 0.5);
  const featured = shuffled.slice(0, 8);

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
    featured,
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
  const key = `${city.trim().toLowerCase()}-${stateAbbrev.toLowerCase()}`;
  return safeMapGet(data.byCity, key) || [];
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
  const key = `${county.trim().toLowerCase()}-${stateAbbrev.toLowerCase()}`;
  return safeMapGet(data.byCounty, key) || [];
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
    const generatedSlug = b.slug || generateSlugFromName(b.name);
    if (generatedSlug.toLowerCase() === slug.toLowerCase()) {
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
    bookstores.find(b => (b.slug || generateSlugFromName(b.name)).toLowerCase() === lowerSlug) ??
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
    const [city, state] = key.split('-');
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
    const [county, state] = key.split('-');
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
 * Get featured bookstores (random sample)
 */
export async function getFeaturedBookstores(count: number = 8): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  // Re-shuffle for variety
  const shuffled = [...data.all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
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
    const stateAbbrev = getStateAbbrev(bookstore.state);
    const cityKey = `${bookstore.city.toLowerCase()}-${stateAbbrev.toLowerCase()}`;
    const cityBookstores = (safeMapGet(data.byCity, cityKey) || [])
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

  // Last resort: random from featured
  return data.featured.filter(b => b.id !== bookstore.id).slice(0, limit);
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
    const stateAbbrev = getStateAbbrev(filters.state.trim());
    const cityKey = `${filters.city.trim().toLowerCase()}-${stateAbbrev.toLowerCase()}`;
    results = safeMapGet(data.byCity, cityKey) || [];
  }

  // Filter by county (requires state context; keys use state abbrev)
  if (filters.county && filters.state) {
    const stateAbbrev = getStateAbbrev(filters.state.trim());
    const countyKey = `${filters.county.trim().toLowerCase()}-${stateAbbrev.toLowerCase()}`;
    results = safeMapGet(data.byCounty, countyKey) || [];
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
