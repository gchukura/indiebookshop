import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { Bookstore } from '@/shared/schema';

/**
 * Column selections optimized for egress costs
 * CRITICAL: These match the Phase 1 optimizations in server/supabase-storage.ts
 */
// Note: Using snake_case column names to match Supabase schema
// IMPORTANT: imageUrl column is camelCase in database, not snake_case
const LIST_COLUMNS = 'id,name,slug,city,state,county,street,zip,latitude,longitude,lat_numeric,lng_numeric,website,phone,live,google_rating,google_review_count,google_place_id,feature_ids,imageUrl,google_photos';

const DETAIL_COLUMNS = 'id,name,slug,city,state,county,street,zip,latitude,longitude,lat_numeric,lng_numeric,website,phone,live,description,google_place_id,google_rating,google_review_count,google_description,formatted_phone,website_verified,google_maps_url,google_types,formatted_address_google,business_status,google_price_level,google_data_updated_at,contact_data_fetched_at,opening_hours_json,ai_generated_description,description_source,description_generated_at,description_validated,feature_ids,hours_json';

const PHOTO_COLUMNS = 'google_photos';
const REVIEW_COLUMNS = 'google_reviews';
const FULL_DETAIL = `${DETAIL_COLUMNS},${PHOTO_COLUMNS},${REVIEW_COLUMNS}`;

/**
 * Helper function to map Supabase column names to Bookstore type
 */
function mapBookstoreData(item: any): Bookstore {
  return {
    ...item,
    latitude: item.lat_numeric?.toString() || item.latitude || null,
    longitude: item.lng_numeric?.toString() || item.longitude || null,
    featureIds: item.feature_ids || item.featureIds || [],
    imageUrl: item.image_url || item.imageUrl || null,
    googlePlaceId: item.google_place_id || null,
    googleRating: item.google_rating || null,
    googleReviewCount: item.google_review_count || null,
    googleDescription: item.google_description || null,
    googlePhotos: (() => {
      const photos = item.google_photos;
      if (!photos) return null;
      // If it's already an array, return it
      if (Array.isArray(photos)) return photos;
      // If it's a string, try to parse it
      if (typeof photos === 'string') {
        try {
          return JSON.parse(photos);
        } catch (e) {
          console.error('Error parsing google_photos JSON:', e);
          return null;
        }
      }
      return null;
    })(),
    googleReviews: (() => {
      const reviews = item.google_reviews;
      if (!reviews) return null;
      // If it's already an array, return it
      if (Array.isArray(reviews)) return reviews;
      // If it's a string, try to parse it
      if (typeof reviews === 'string') {
        try {
          return JSON.parse(reviews);
        } catch (e) {
          console.error('Error parsing google_reviews JSON:', e);
          return null;
        }
      }
      return null;
    })(),
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
    hours: item.hours_json
      ? (typeof item.hours_json === 'string' ? JSON.parse(item.hours_json) : item.hours_json)
      : null,
  } as Bookstore;
}

/**
 * Helper to generate slug from bookstore name
 */
function generateSlugFromName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

/**
 * Fetch random bookstores for homepage
 * Uses database-level randomization for optimal performance
 *
 * React cache() deduplicates requests within a single render
 */
export const getRandomBookstores = cache(async (count: number = 8): Promise<Bookstore[]> => {
  const supabase = createServerClient();

  // PostgREST doesn't support ORDER BY random(), so we fetch a larger set and randomize in-memory
  // Fetch 5x the requested count to ensure good randomization
  const fetchCount = Math.min(count * 5, 100); // Cap at 100 to control egress

  const { data, error } = await supabase
    .from('bookstores')
    .select(LIST_COLUMNS)
    .eq('live', true)
    .limit(fetchCount);

  if (error) {
    console.error('Error fetching random bookstores:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: error
    });
    throw error;
  }

  // Shuffle and take requested count
  const shuffled = (data || []).sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(mapBookstoreData);
});

/**
 * Fetch a single bookstore by slug
 * Optimized to query by slug column instead of fetching all bookstores
 * Also tries case-insensitive match and name-based search if direct slug match fails
 */
export const getBookstoreBySlug = cache(async (slug: string): Promise<Bookstore | null> => {
  try {
    const supabase = createServerClient();

    // First, try querying directly by slug column (case-sensitive, exact match)
    let { data, error } = await supabase
      .from('bookstores')
      .select(FULL_DETAIL)
      .eq('slug', slug)
      .eq('live', true)
      .single();

  // If not found, try case-insensitive slug match
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

  // If still not found, try searching by name pattern that could generate this slug
  // This handles cases where slug in DB doesn't exist or doesn't match
  if (error && error.code === 'PGRST116') {
    // Strategy 1: Search for bookshops with null slugs and check if name generates to this slug
    // This is more efficient than searching all bookshops
    const { data: nullSlugData, error: nullSlugError } = await supabase
      .from('bookstores')
      .select(FULL_DETAIL)
      .eq('live', true)
      .is('slug', null)
      .limit(200); // Check up to 200 bookshops with null slugs

    if (!nullSlugError && nullSlugData) {
      const matched = nullSlugData.find((item: any) => {
        const generatedSlug = generateSlugFromName(item.name);
        return generatedSlug.toLowerCase() === slug.toLowerCase();
      });

      if (matched) {
        return mapBookstoreData(matched);
      }
    }

    // Strategy 2: Convert slug back to a search pattern and search by name
    // Replace hyphens with spaces for better name matching
    const nameWords = slug.split('-').filter(w => w.length > 0);
    if (nameWords.length > 0) {
      // Try exact name match first (slug might be generated from exact name)
      const exactName = nameWords.join(' ');
      const { data: exactNameData, error: exactNameError } = await supabase
        .from('bookstores')
        .select(FULL_DETAIL)
        .eq('live', true)
        .ilike('name', exactName)
        .limit(10);

      if (!exactNameError && exactNameData) {
        const matched = exactNameData.find((item: any) => {
          const dbSlug = item.slug || generateSlugFromName(item.name);
          return dbSlug.toLowerCase() === slug.toLowerCase();
        });

        if (matched) {
          return mapBookstoreData(matched);
        }
      }

      // Then try partial name match with first word
      const { data: nameSearchData, error: nameError } = await supabase
        .from('bookstores')
        .select(FULL_DETAIL)
        .eq('live', true)
        .ilike('name', `%${nameWords[0]}%`)
        .limit(200); // Increased limit for better coverage

      if (!nameError && nameSearchData) {
        // Find the one that generates to this exact slug
        const matched = nameSearchData.find((item: any) => {
          const dbSlug = item.slug || generateSlugFromName(item.name);
          return dbSlug.toLowerCase() === slug.toLowerCase();
        });

        if (matched) {
          return mapBookstoreData(matched);
        }
      }
    }
  }

    if (error) {
      // Return null for not found (404 case)
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching bookstore by slug:', error);
      throw error;
    }

    return data ? mapBookstoreData(data) : null;
  } catch (err) {
    // Log error but don't throw - return null to trigger 404
    console.error('Error in getBookstoreBySlug:', err);
    return null;
  }
});

/**
 * Fetch a single bookstore by ID
 */
export const getBookstoreById = cache(async (id: number): Promise<Bookstore | null> => {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('bookstores')
    .select(FULL_DETAIL)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching bookstore by ID:', error);
    return null;
  }

  return data ? mapBookstoreData(data) : null;
});

/**
 * Fetch bookstores with filters
 */
export const getFilteredBookstores = cache(async (filters: {
  state?: string;
  city?: string;
  county?: string;
  features?: string; // Comma-separated feature IDs
}): Promise<Bookstore[]> => {
  const supabase = createServerClient();

  let query = supabase
    .from('bookstores')
    .select(LIST_COLUMNS)
    .eq('live', true);

  if (filters.state) {
    query = query.eq('state', filters.state);
  }

  if (filters.city) {
    query = query.ilike('city', filters.city);
  }

  if (filters.county) {
    query = query.ilike('county', filters.county);
  }

  const { data, error } = await query.order('name');

  if (error) {
    console.error('Error fetching filtered bookstores:', error);
    throw error;
  }

  let results = (data || []).map(mapBookstoreData);

  // Client-side feature filtering (if needed)
  if (filters.features) {
    const featureIds = filters.features.split(',').map(Number);
    results = results.filter(b =>
      featureIds.some(fid => b.featureIds?.includes(fid))
    );
  }

  return results;
});

/**
 * Fetch all distinct states
 * Uses pagination to handle Supabase's 1000 row limit
 */
export const getStates = cache(async (): Promise<string[]> => {
  const supabase = createServerClient();

  // Fetch with pagination to get all states (not just first 1000 bookstores)
  const allStates: string[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('bookstores')
      .select('state')
      .eq('live', true)
      .order('state')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching states:', error);
      throw error;
    }

    if (data && data.length > 0) {
      // Extract states and add to set
      const states = (data || []).map((b: any) => b.state).filter(Boolean);
      allStates.push(...states);
      from += pageSize;
      // If we got fewer than pageSize, we've reached the end
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  // Return unique states, sorted
  return Array.from(new Set(allStates)).sort();
});

/**
 * Fetch top popular bookstores by rating
 */
export const getPopularBookstores = cache(async (limit: number = 15): Promise<Bookstore[]> => {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('bookstores')
    .select(LIST_COLUMNS)
    .eq('live', true)
    .not('google_rating', 'is', null)
    .order('google_rating', { ascending: false })
    .order('google_review_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching popular bookstores:', error);
    throw error;
  }

  return (data || []).map(mapBookstoreData);
});

/**
 * Fetch all bookstores (for sitemap generation)
 * Note: This should only be used for build-time operations like sitemap generation
 */
export const getAllBookstores = cache(async (): Promise<Bookstore[]> => {
  const supabase = createServerClient();

  // Fetch with pagination
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
      console.error('Error fetching all bookstores:', error);
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
});

/**
 * Export slug generator for use in other modules
 */
export { generateSlugFromName };
