// lib/data/bookstore-data.ts
// Centralized data processing layer with strategic caching
// Single processing function that powers all pages efficiently

import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { Bookstore } from '@/shared/schema';
import { safeMapGet, safeMapKeys } from './cache-utils';

// In-memory cache for processed data (survives across requests in dev)
let processedDataCache: ProcessedBookstoreData | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// ===========================================
// COLUMN SELECTIONS (optimized for egress)
// ===========================================

const LIST_COLUMNS = 'id,name,slug,city,state,county,street,zip,latitude,longitude,lat_numeric,lng_numeric,website,phone,live,google_rating,google_review_count,google_place_id,feature_ids,imageUrl,google_photos';

const DETAIL_COLUMNS = 'id,name,slug,city,state,county,street,zip,latitude,longitude,lat_numeric,lng_numeric,website,phone,live,description,google_place_id,google_rating,google_review_count,google_description,formatted_phone,website_verified,google_maps_url,google_types,formatted_address_google,business_status,google_price_level,google_data_updated_at,contact_data_fetched_at,opening_hours_json,ai_generated_description,description_source,description_generated_at,description_validated,feature_ids,hours_json';

const PHOTO_COLUMNS = 'google_photos';
const REVIEW_COLUMNS = 'google_reviews';
const FULL_DETAIL = `${DETAIL_COLUMNS},${PHOTO_COLUMNS},${REVIEW_COLUMNS}`;

/** US state abbreviation → full name so directory ?state=FL works when DB stores "Florida" */
const STATE_ABBREV_TO_FULL: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// ===========================================
// TYPES
// ===========================================

export interface ProcessedBookstoreData {
  // All bookstores (for sitemap, etc.)
  all: Bookstore[];

  // Lookup Maps (serialized as objects by cache)
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
 * Maps Supabase column names to Bookstore type
 * Handles schema-specific conversions and legacy column fallbacks
 */
function mapBookstoreData(item: any): Bookstore {
  return {
    ...item,
    // Use numeric columns for calculations, convert to string for display
    latitude: item.lat_numeric?.toString() || item.latitude || null,
    longitude: item.lng_numeric?.toString() || item.longitude || null,
    // Use array column (preferred over comma-separated text)
    featureIds: item.feature_ids || item.featureIds || [],
    // Handle camelCase column name
    imageUrl: item.image_url || item.imageUrl || null,
    // Parse google_rating from TEXT to number if needed
    googleRating: item.google_rating || null,
    googlePlaceId: item.google_place_id || null,
    googleReviewCount: item.google_review_count || null,
    googleDescription: item.google_description || null,
    // Handle jsonb columns (defensive parsing)
    googlePhotos: parseJsonb(item.google_photos),
    googleReviews: parseJsonb(item.google_reviews),
    googlePriceLevel: item.google_price_level || null,
    googleDataUpdatedAt: item.google_data_updated_at || null,
    formattedPhone: item.formatted_phone || null,
    websiteVerified: item.website_verified || null,
    openingHoursJson: item.opening_hours_json || null,
    googleMapsUrl: item.google_maps_url || null,
    googleTypes: item.google_types || null,
    formattedAddressGoogle: item.formatted_address_google || null,
    businessStatus: item.business_status || null,
    contactDataFetchedAt: item.contact_data_fetched_at || null,
    aiGeneratedDescription: item.ai_generated_description || null,
    descriptionGeneratedAt: item.description_generated_at || null,
    descriptionValidated: item.description_validated ?? null,
    descriptionSource: item.description_source || null,
    // Prefer jsonb hours over text
    hours: item.hours_json
      ? (typeof item.hours_json === 'string' ? JSON.parse(item.hours_json) : item.hours_json)
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
 * Fetch all bookstore data from Supabase
 * Uses pagination to handle large datasets efficiently
 */
async function fetchAllBookstoreData(): Promise<Bookstore[]> {
  const supabase = createServerClient();
  const allBookstores: any[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('bookstores')
      .select(LIST_COLUMNS)
      .eq('live', true)
      .order('name')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching bookstores:', error);
      break;
    }

    if (data && data.length > 0) {
      allBookstores.push(...data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allBookstores.map(mapBookstoreData);
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
    // Index by slug
    const slug = bookstore.slug || generateSlugFromName(bookstore.name);
    if (slug) {
      bySlug[slug.toLowerCase()] = bookstore;
    }

    // Normalize for consistent lookups (trim so " FL " and "FL" match)
    const stateNorm = (bookstore.state || '').trim();
    const cityNorm = (bookstore.city || '').trim();
    const countyNorm = (bookstore.county || '').trim();

    // Index by city
    if (cityNorm && stateNorm) {
      const cityKey = `${cityNorm.toLowerCase()}-${stateNorm.toLowerCase()}`;
      if (!byCity[cityKey]) byCity[cityKey] = [];
      byCity[cityKey].push(bookstore);
      citiesSet.add(cityNorm);
    }

    // Index by state
    if (stateNorm) {
      const stateKey = stateNorm.toLowerCase();
      if (!byState[stateKey]) byState[stateKey] = [];
      byState[stateKey].push(bookstore);
      statesSet.add(stateNorm);
    }

    // Index by county
    if (countyNorm && stateNorm) {
      const countyKey = `${countyNorm.toLowerCase()}-${stateNorm.toLowerCase()}`;
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
    byCity,
    byState,
    byCounty,
    byFeature,
    bySlug,
    cities: Array.from(citiesSet).sort(),
    states: Array.from(statesSet).sort(),
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
  const key = `${city.toLowerCase()}-${state.toLowerCase()}`;
  return safeMapGet(data.byCity, key) || [];
}

/**
 * Get bookstores by state
 */
export async function getBookstoresByState(state: string): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  return safeMapGet(data.byState, state.toLowerCase()) || [];
}

/**
 * Get bookstores by county
 */
export async function getBookstoresByCounty(county: string, state: string): Promise<Bookstore[]> {
  const data = await getProcessedBookstoreData();
  const key = `${county.toLowerCase()}-${state.toLowerCase()}`;
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
 * Get bookstore by slug with full details
 * Fetches directly from DB for complete data including photos/reviews
 */
export async function getBookstoreBySlugFull(slug: string): Promise<Bookstore | null> {
  const supabase = createServerClient();

  // Try exact slug match first
  let { data, error } = await supabase
    .from('bookstores')
    .select(FULL_DETAIL)
    .eq('slug', slug)
    .eq('live', true)
    .single();

  // If not found, try case-insensitive
  if (error && error.code === 'PGRST116') {
    const { data: caseInsensitiveData, error: caseError } = await supabase
      .from('bookstores')
      .select(FULL_DETAIL)
      .eq('live', true)
      .ilike('slug', slug)
      .limit(1)
      .maybeSingle();

    if (!caseError && caseInsensitiveData) {
      data = caseInsensitiveData;
      error = null;
    }
  }

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching bookstore by slug:', error);
    return null;
  }

  return data ? mapBookstoreData(data) : null;
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
    const cityKey = `${bookstore.city.toLowerCase()}-${bookstore.state.toLowerCase()}`;
    const cityBookstores = (safeMapGet(data.byCity, cityKey) || [])
      .filter(b => b.id !== bookstore.id);

    if (cityBookstores.length >= 3) {
      return cityBookstores.slice(0, limit);
    }
  }

  // Fall back to same state
  if (bookstore.state) {
    const stateBookstores = (safeMapGet(data.byState, bookstore.state.toLowerCase()) || [])
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

  // Filter by state (support abbreviation, full name, and match any canonical state in data)
  if (filters.state) {
    const stateParam = filters.state.trim();
    const stateKey = stateParam.toLowerCase();
    results = safeMapGet(data.byState, stateKey) || [];
    if (results.length === 0 && stateKey.length === 2) {
      const fullName = STATE_ABBREV_TO_FULL[stateParam.toUpperCase()];
      if (fullName) results = safeMapGet(data.byState, fullName.toLowerCase()) || [];
    }
    if (results.length === 0 && stateKey.length > 2) {
      const abbrev = Object.entries(STATE_ABBREV_TO_FULL).find(([, full]) => full.toLowerCase() === stateKey)?.[0];
      if (abbrev) results = safeMapGet(data.byState, abbrev.toLowerCase()) || [];
    }
    // Match any state in data that equals param (case-insensitive)
    if (results.length === 0 && data.states.length > 0) {
      const match = data.states.find((s) => s.trim().toLowerCase() === stateKey);
      if (match) results = safeMapGet(data.byState, match.trim().toLowerCase()) || [];
    }
  }

  // Filter by city (requires state context)
  if (filters.city && filters.state) {
    const cityKey = `${filters.city.toLowerCase()}-${filters.state.toLowerCase()}`;
    results = safeMapGet(data.byCity, cityKey) || [];
  }

  // Filter by county (requires state context)
  if (filters.county && filters.state) {
    const countyKey = `${filters.county.toLowerCase()}-${filters.state.toLowerCase()}`;
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
  const bookstores = safeMapGet(data.byState, state.toLowerCase()) || [];
  return bookstores.length;
}

/**
 * Get bookstore by ID (with full details)
 * Fetches directly from DB for complete data including photos/reviews
 */
export async function getBookstoreById(id: number): Promise<Bookstore | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('bookstores')
    .select(FULL_DETAIL)
    .eq('id', id)
    .eq('live', true)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching bookstore by id:', error);
    }
    return null;
  }

  return data ? mapBookstoreData(data) : null;
}
