// lib/data/bookstore-data.ts
// Centralized data processing layer with strategic caching
// Single processing function that powers all pages efficiently

import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { Bookstore } from '@/shared/schema';
import { safeMapGet, safeMapKeys } from './cache-utils';

// ===========================================
// COLUMN SELECTIONS (optimized for egress)
// ===========================================

const LIST_COLUMNS = 'id,name,slug,city,state,county,street,zip,latitude,longitude,lat_numeric,lng_numeric,website,phone,live,google_rating,google_review_count,google_place_id,feature_ids,imageUrl,google_photos';

const DETAIL_COLUMNS = 'id,name,slug,city,state,county,street,zip,latitude,longitude,lat_numeric,lng_numeric,website,phone,live,description,google_place_id,google_rating,google_review_count,google_description,formatted_phone,website_verified,google_maps_url,google_types,formatted_address_google,business_status,google_price_level,google_data_updated_at,contact_data_fetched_at,opening_hours_json,ai_generated_description,description_source,description_generated_at,description_validated,feature_ids,hours_json';

const PHOTO_COLUMNS = 'google_photos';
const REVIEW_COLUMNS = 'google_reviews';
const FULL_DETAIL = `${DETAIL_COLUMNS},${PHOTO_COLUMNS},${REVIEW_COLUMNS}`;

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
 * Safely parse jsonb columns (may be string or object)
 */
function parseJsonb(value: any): any[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
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

    // Index by city
    if (bookstore.city && bookstore.state) {
      const cityKey = `${bookstore.city.toLowerCase()}-${bookstore.state.toLowerCase()}`;
      if (!byCity[cityKey]) byCity[cityKey] = [];
      byCity[cityKey].push(bookstore);
      citiesSet.add(bookstore.city);
    }

    // Index by state
    if (bookstore.state) {
      const stateKey = bookstore.state.toLowerCase();
      if (!byState[stateKey]) byState[stateKey] = [];
      byState[stateKey].push(bookstore);
      statesSet.add(bookstore.state);
    }

    // Index by county
    if (bookstore.county && bookstore.state) {
      const countyKey = `${bookstore.county.toLowerCase()}-${bookstore.state.toLowerCase()}`;
      if (!byCounty[countyKey]) byCounty[countyKey] = [];
      byCounty[countyKey].push(bookstore);
      countiesSet.add(bookstore.county);
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
 * Main cached function that powers all pages
 * Processes ALL bookstore data once and caches for 1 hour
 * All helper functions reference this shared cache
 */
export const getProcessedBookstoreData = unstable_cache(
  async (): Promise<ProcessedBookstoreData> => {
    console.log('[BookstoreData] Fetching and processing all bookstore data...');
    const bookstores = await fetchAllBookstoreData();
    const processed = processBookstoreData(bookstores);
    console.log(`[BookstoreData] Processed ${processed.totalCount} bookstores`);
    return processed;
  },
  ['processed-bookstore-data'],
  {
    tags: ['bookstore-data'],
    revalidate: 3600 // 1 hour
  }
);

// ===========================================
// HELPER FUNCTIONS (use shared cache)
// ===========================================

/**
 * Get all bookstores (for sitemap, etc.)
 */
export const getAllBookstores = unstable_cache(
  async (): Promise<Bookstore[]> => {
    const data = await getProcessedBookstoreData();
    return data.all;
  },
  ['all-bookstores'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

/**
 * Get bookstores by city
 */
export const getBookstoresByCity = unstable_cache(
  async (city: string, state: string): Promise<Bookstore[]> => {
    const data = await getProcessedBookstoreData();
    const key = `${city.toLowerCase()}-${state.toLowerCase()}`;
    return safeMapGet(data.byCity, key) || [];
  },
  ['bookstores-by-city'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

/**
 * Get bookstores by state
 */
export const getBookstoresByState = unstable_cache(
  async (state: string): Promise<Bookstore[]> => {
    const data = await getProcessedBookstoreData();
    return safeMapGet(data.byState, state.toLowerCase()) || [];
  },
  ['bookstores-by-state'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

/**
 * Get bookstores by county
 */
export const getBookstoresByCounty = unstable_cache(
  async (county: string, state: string): Promise<Bookstore[]> => {
    const data = await getProcessedBookstoreData();
    const key = `${county.toLowerCase()}-${state.toLowerCase()}`;
    return safeMapGet(data.byCounty, key) || [];
  },
  ['bookstores-by-county'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

/**
 * Get bookstores by feature
 */
export const getBookstoresByFeature = unstable_cache(
  async (featureId: number): Promise<Bookstore[]> => {
    const data = await getProcessedBookstoreData();
    return safeMapGet(data.byFeature, String(featureId)) || [];
  },
  ['bookstores-by-feature'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

/**
 * Get bookstore by slug
 */
export const getBookstoreBySlug = unstable_cache(
  async (slug: string): Promise<Bookstore | null> => {
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
  },
  ['bookstore-by-slug'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

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
export const getStates = unstable_cache(
  async (): Promise<string[]> => {
    const data = await getProcessedBookstoreData();
    return data.states;
  },
  ['all-states'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

/**
 * Get all unique cities (with state info)
 */
export const getCitiesWithState = unstable_cache(
  async (): Promise<Array<{ city: string; state: string; count: number }>> => {
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
  },
  ['cities-with-state'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

/**
 * Get all unique counties (with state info)
 */
export const getCountiesWithState = unstable_cache(
  async (): Promise<Array<{ county: string; state: string; count: number }>> => {
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
  },
  ['counties-with-state'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

/**
 * Get featured bookstores (random sample)
 */
export const getFeaturedBookstores = unstable_cache(
  async (count: number = 8): Promise<Bookstore[]> => {
    const data = await getProcessedBookstoreData();
    // Re-shuffle for variety on each cache miss
    const shuffled = [...data.all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  },
  ['featured-bookstores'],
  { tags: ['bookstore-data'], revalidate: 1800 } // 30 minutes for more variety
);

/**
 * Get popular bookstores (by rating)
 */
export const getPopularBookstores = unstable_cache(
  async (limit: number = 15): Promise<Bookstore[]> => {
    const data = await getProcessedBookstoreData();
    return data.popular.slice(0, limit);
  },
  ['popular-bookstores'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

/**
 * Get related bookstores (same city > same state > random)
 */
export const getRelatedBookstores = unstable_cache(
  async (bookstore: Bookstore, limit: number = 6): Promise<Bookstore[]> => {
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
  },
  ['related-bookstores'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

/**
 * Get filtered bookstores with multiple criteria
 */
export const getFilteredBookstores = unstable_cache(
  async (filters: {
    state?: string;
    city?: string;
    county?: string;
    features?: number[];
  }): Promise<Bookstore[]> => {
    const data = await getProcessedBookstoreData();
    let results: Bookstore[] = data.all;

    // Filter by state
    if (filters.state) {
      results = safeMapGet(data.byState, filters.state.toLowerCase()) || [];
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
  },
  ['filtered-bookstores'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

// ===========================================
// STATS & COUNTS
// ===========================================

/**
 * Get total bookstore count
 */
export const getTotalBookstoreCount = unstable_cache(
  async (): Promise<number> => {
    const data = await getProcessedBookstoreData();
    return data.totalCount;
  },
  ['total-bookstore-count'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

/**
 * Get count by state
 */
export const getCountByState = unstable_cache(
  async (state: string): Promise<number> => {
    const data = await getProcessedBookstoreData();
    const bookstores = safeMapGet(data.byState, state.toLowerCase()) || [];
    return bookstores.length;
  },
  ['count-by-state'],
  { tags: ['bookstore-data'], revalidate: 3600 }
);

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
