// Serverless-compatible version of SupabaseStorage for Vercel deployment
import { supabase } from './supabase-serverless.js';

// County lookup mapping (simplified version for serverless)
const COUNTY_MAPPING = {
  'CA': {
    'Los Angeles': 'Los Angeles',
    'San Francisco': 'San Francisco',
    'San Diego': 'San Diego',
    'Oakland': 'Alameda',
    'Berkeley': 'Alameda',
    'Palo Alto': 'Santa Clara',
    'San Jose': 'Santa Clara',
    'Sacramento': 'Sacramento',
    'Fresno': 'Fresno',
    'Long Beach': 'Los Angeles',
    'Santa Monica': 'Los Angeles',
    'Pasadena': 'Los Angeles',
    'Santa Barbara': 'Santa Barbara',
    'Santa Cruz': 'Santa Cruz',
    'Monterey': 'Monterey',
    'Napa': 'Napa',
    'Sonoma': 'Sonoma',
    'Carmel': 'Monterey',
    'Malibu': 'Los Angeles'
  },
  'NY': {
    'New York': 'New York',
    'Brooklyn': 'Kings',
    'Buffalo': 'Erie',
    'Rochester': 'Monroe',
    'Syracuse': 'Onondaga',
    'Albany': 'Albany',
    'Yonkers': 'Westchester',
    'White Plains': 'Westchester',
    'Ithaca': 'Tompkins',
    'Queens': 'Queens',
    'Bronx': 'Bronx',
    'Staten Island': 'Richmond'
  },
  'MA': {
    'Boston': 'Suffolk',
    'Cambridge': 'Middlesex',
    'Worcester': 'Worcester',
    'Springfield': 'Hampden',
    'Lowell': 'Middlesex',
    'Somerville': 'Middlesex',
    'Amherst': 'Hampshire',
    'Northampton': 'Hampshire',
    'Salem': 'Essex'
  },
  'ME': {
    'Portland': 'Cumberland',
    'Bangor': 'Penobscot',
    'Augusta': 'Kennebec',
    'Brunswick': 'Cumberland',
    'Bar Harbor': 'Hancock',
    'Camden': 'Knox',
    'Rockland': 'Knox'
  },
  'VT': {
    'Burlington': 'Chittenden',
    'Montpelier': 'Washington',
    'Brattleboro': 'Windham',
    'Woodstock': 'Windsor',
    'Manchester': 'Bennington',
    'Middlebury': 'Addison',
    'Stowe': 'Lamoille'
  },
  'NH': {
    'Portsmouth': 'Rockingham',
    'Hanover': 'Grafton',
    'Keene': 'Cheshire',
    'Concord': 'Merrimack',
    'Manchester': 'Hillsborough'
  },
  'CO': {
    'Denver': 'Denver',
    'Boulder': 'Boulder',
    'Fort Collins': 'Larimer',
    'Colorado Springs': 'El Paso',
    'Aspen': 'Pitkin',
    'Telluride': 'San Miguel',
    'Durango': 'La Plata'
  },
  'WA': {
    'Seattle': 'King',
    'Tacoma': 'Pierce',
    'Spokane': 'Spokane',
    'Bellingham': 'Whatcom',
    'Port Townsend': 'Jefferson',
    'Bainbridge Island': 'Kitsap',
    'Olympia': 'Thurston',
    'Walla Walla': 'Walla Walla'
  },
  'OR': {
    'Portland': 'Multnomah',
    'Eugene': 'Lane',
    'Bend': 'Deschutes',
    'Ashland': 'Jackson',
    'Hood River': 'Hood River',
    'Astoria': 'Clatsop',
    'Cannon Beach': 'Clatsop'
  },
  'MI': {
    'Ann Arbor': 'Washtenaw',
    'Detroit': 'Wayne',
    'Grand Rapids': 'Kent',
    'Traverse City': 'Grand Traverse',
    'Petoskey': 'Emmet',
    'Lansing': 'Ingham'
  },
  'IL': {
    'Chicago': 'Cook',
    'Evanston': 'Cook',
    'Oak Park': 'Cook',
    'Naperville': 'DuPage',
    'Champaign': 'Champaign',
    'Urbana': 'Champaign',
    'Springfield': 'Sangamon'
  }
};

function lookupCounty(bookshop) {
  const { city, state } = bookshop;
  
  if (!city || !state) return null;
  
  const normalizedCity = city.trim();
  const normalizedState = state.trim();
  
  if (COUNTY_MAPPING[normalizedState] && COUNTY_MAPPING[normalizedState][normalizedCity]) {
    return COUNTY_MAPPING[normalizedState][normalizedCity];
  }
  
  return null;
}

function populateCountyData(bookshops) {
  return bookshops.map(bookshop => {
    if (bookshop.county) return bookshop;
    
    const county = lookupCounty(bookshop);
    
    return county ? { ...bookshop, county } : bookshop;
  });
}

/**
 * SupabaseStorage - Serverless-compatible version
 * Implements IStorage interface using Supabase as the data source
 * This replaces Google Sheets storage for reading bookstores, features, and events
 */
export class SupabaseStorage {
  constructor() {
    this.slugToBookstoreId = new Map();
    this.isInitialized = false;
    
    // Initialize slug mappings asynchronously
    this.initializeSlugMappings();
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeSlugMappings();
    }
  }

  /**
   * Generate a slug from a bookshop name (must match client-side logic)
   */
  generateSlugFromName(name) {
    if (!name || typeof name !== 'string') {
      return '';
    }
    
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .trim();                  // Trim leading/trailing spaces
  }

  /**
   * Initialize slug mappings for fast lookups
   */
  async initializeSlugMappings() {
    if (!supabase) {
      console.warn('Serverless: Supabase client not available, cannot initialize slug mappings');
      // Mark as initialized even if Supabase isn't available to prevent infinite retries
      // The fallback in getBookstoreBySlug will handle lookups
      this.isInitialized = true;
      return;
    }

    try {
      console.log('Serverless: Initializing bookshop slug mappings from Supabase...');
      this.slugToBookstoreId.clear();

      // Fetch all live bookstores with pagination to handle Supabase's 1000 row limit
      const allBookstores = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('bookstores')
          .select('id, name, live')
          .eq('live', true)
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Serverless: Error fetching bookstores for slug mapping:', error);
          // Mark as initialized even on error to prevent infinite retries
          // The fallback in getBookstoreBySlug will handle lookups
          this.isInitialized = true;
          return;
        }

        if (data && data.length > 0) {
          allBookstores.push(...data);
          from += pageSize;
          // If we got fewer than pageSize, we've reached the end
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      if (allBookstores.length === 0) {
        console.warn('Serverless: No bookstores returned from Supabase');
        // Mark as initialized even if no bookstores found to prevent infinite retries
        this.isInitialized = true;
        return;
      }

      let duplicatesFound = 0;

      allBookstores.forEach(bookstore => {
        const slug = this.generateSlugFromName(bookstore.name);

        if (this.slugToBookstoreId.has(slug)) {
          duplicatesFound++;
          const existingId = this.slugToBookstoreId.get(slug);
          console.log(`Serverless: Duplicate slug "${slug}" detected. Previous ID: ${existingId}, New: "${bookstore.name}" (ID: ${bookstore.id})`);
        }

        this.slugToBookstoreId.set(slug, bookstore.id);
      });

      if (duplicatesFound > 0) {
        console.log(`Serverless: Found ${duplicatesFound} duplicate slugs. In cases of duplicates, the last bookshop with that slug will be used.`);
      }

      console.log(`Serverless: Created ${this.slugToBookstoreId.size} slug mappings for bookshops (fetched ${allBookstores.length} total)`);
      this.isInitialized = true;
    } catch (error) {
      console.error('Serverless: Error initializing slug mappings:', error);
      // Mark as initialized even on error to prevent infinite retries
      // The fallback in getBookstoreBySlug will handle lookups
      this.isInitialized = true;
    }
  }

  // User operations (not implemented - using Supabase auth)
  async getUser(id) {
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error || !data) return undefined;
    return data;
  }

  async getUserByUsername(username) {
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
    if (error || !data) return undefined;
    return data;
  }

  async createUser(user) {
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) throw error;
    return data;
  }

  async updateUserFavorites(userId, favorites) {
    if (!supabase) return undefined;
    const { data, error } = await supabase
      .from('users')
      .update({ favorites })
      .eq('id', userId)
      .select()
      .single();
    if (error || !data) return undefined;
    return data;
  }

  // Bookstore operations
  async getBookstores() {
    if (!supabase) {
      console.warn('Serverless: Supabase client not available');
      return [];
    }

    try {
      // Fetch all bookstores with pagination to handle Supabase's 1000 row limit
      const allBookstores = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error, count } = await supabase
          .from('bookstores')
          .select('*', { count: 'exact' })
          .eq('live', true)
          .order('name')
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Serverless: Error fetching bookstores from Supabase:', error);
          break;
        }

        if (data && data.length > 0) {
          allBookstores.push(...data);
          from += pageSize;
          // If we got fewer than pageSize, we've reached the end
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`Serverless: Fetched ${allBookstores.length} bookstores (paginated)`);

      // Map Supabase column names to match Bookstore type
      const bookstores = allBookstores.map((item) => {
        // Extract snake_case fields we'll map to camelCase
        const {
          lat_numeric,
          lng_numeric,
          feature_ids,
          image_url,
          hours_json,
          google_place_id,
          google_rating,
          google_review_count,
          google_description,
          google_photos,
          google_reviews,
          google_price_level,
          google_data_updated_at,
          formatted_phone,
          website_verified,
          opening_hours_json,
          google_maps_url,
          google_types,
          formatted_address_google,
          business_status,
          contact_data_fetched_at,
          ai_generated_description,
          description_generated_at,
          description_validated,
          description_source,
          ...rest
        } = item;
        
        return {
          ...rest,
          latitude: lat_numeric?.toString() || item.latitude || null,
          longitude: lng_numeric?.toString() || item.longitude || null,
          featureIds: feature_ids || item.featureIds || [],
          imageUrl: image_url || item.imageUrl || null,
          // Map hours from hours_json (jsonb) to hours for frontend
          // Prefer hours_json (jsonb) over "hours (JSON)" (text)
          hours: (() => {
            if (hours_json) {
              return typeof hours_json === 'string' ? JSON.parse(hours_json) : hours_json;
            }
            if (item['hours (JSON)']) {
              return typeof item['hours (JSON)'] === 'string' ? JSON.parse(item['hours (JSON)']) : item['hours (JSON)'];
            }
            return null;
          })(),
          // Map Google Places fields from snake_case to camelCase
          googlePlaceId: google_place_id || null,
          googleRating: google_rating || null,
          googleReviewCount: google_review_count || null,
          googleDescription: google_description || null,
          googlePhotos: (() => {
            if (!google_photos) return null;
            // If it's already an array, return it
            if (Array.isArray(google_photos)) return google_photos;
            // If it's a string, try to parse it
            if (typeof google_photos === 'string') {
              try {
                return JSON.parse(google_photos);
              } catch (e) {
                console.error('Serverless: Error parsing google_photos JSON:', e);
                return null;
              }
            }
            return null;
          })(),
          googleReviews: (() => {
            if (!google_reviews) return null;
            // If it's already an array, return it
            if (Array.isArray(google_reviews)) return google_reviews;
            // If it's a string, try to parse it
            if (typeof google_reviews === 'string') {
              try {
                return JSON.parse(google_reviews);
              } catch (e) {
                console.error('Serverless: Error parsing google_reviews JSON:', e);
                return null;
              }
            }
            return null;
          })(),
          googlePriceLevel: google_price_level || null,
          googleDataUpdatedAt: google_data_updated_at || null,
          // Map Google Places contact & basic data fields
          formattedPhone: formatted_phone || null,
          websiteVerified: website_verified || null,
          openingHoursJson: opening_hours_json || null,
          googleMapsUrl: google_maps_url || null,
          googleTypes: google_types || null,
          formattedAddressGoogle: formatted_address_google || null,
          businessStatus: business_status || null,
          contactDataFetchedAt: contact_data_fetched_at || null,
          // Map AI-generated description fields from snake_case to camelCase
          aiGeneratedDescription: ai_generated_description || null,
          descriptionGeneratedAt: description_generated_at || null,
          descriptionValidated: description_validated ?? null,
          descriptionSource: description_source || null,
        };
      });

      return populateCountyData(bookstores);
    } catch (error) {
      console.error('Serverless: Error in getBookstores:', error);
      return [];
    }
  }

  async getBookstore(id) {
    if (!supabase) return undefined;

    try {
      const { data, error } = await supabase
        .from('bookstores')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return undefined;

      // Map Supabase column names
      // Extract snake_case fields we'll map to camelCase
      const {
        lat_numeric,
        lng_numeric,
        feature_ids,
        image_url,
        hours_json,
        google_place_id,
        google_rating,
        google_review_count,
        google_description,
        google_photos,
        google_reviews,
        google_price_level,
        google_data_updated_at,
        formatted_phone,
        website_verified,
        opening_hours_json,
        google_maps_url,
        google_types,
        formatted_address_google,
        business_status,
        contact_data_fetched_at,
        ai_generated_description,
        description_generated_at,
        description_validated,
        description_source,
        ...rest
      } = data;
      
      return {
        ...rest,
        latitude: lat_numeric?.toString() || data.latitude || null,
        longitude: lng_numeric?.toString() || data.longitude || null,
        featureIds: feature_ids || data.featureIds || [],
        imageUrl: image_url || data.imageUrl || null,
        // Map hours from hours_json (jsonb) to hours for frontend
        // Prefer hours_json (jsonb) over "hours (JSON)" (text)
        hours: (() => {
          if (hours_json) {
            return typeof hours_json === 'string' ? JSON.parse(hours_json) : hours_json;
          }
          if (data['hours (JSON)']) {
            return typeof data['hours (JSON)'] === 'string' ? JSON.parse(data['hours (JSON)']) : data['hours (JSON)'];
          }
          return null;
        })(),
        // Map Google Places fields from snake_case to camelCase
        googlePlaceId: google_place_id || null,
        googleRating: google_rating || null,
        googleReviewCount: google_review_count || null,
        googleDescription: google_description || null,
        googlePhotos: (() => {
          if (!google_photos) return null;
          // If it's already an array, return it
          if (Array.isArray(google_photos)) return google_photos;
          // If it's a string, try to parse it
          if (typeof google_photos === 'string') {
            try {
              return JSON.parse(google_photos);
            } catch (e) {
              console.error('Serverless: Error parsing google_photos JSON:', e);
              return null;
            }
          }
          return null;
        })(),
        googleReviews: (() => {
          if (!google_reviews) return null;
          // If it's already an array, return it
          if (Array.isArray(google_reviews)) return google_reviews;
          // If it's a string, try to parse it
          if (typeof google_reviews === 'string') {
            try {
              return JSON.parse(google_reviews);
            } catch (e) {
              console.error('Serverless: Error parsing google_reviews JSON:', e);
              return null;
            }
          }
          return null;
        })(),
        googlePriceLevel: google_price_level || null,
        googleDataUpdatedAt: google_data_updated_at || null,
        // Map Google Places contact & basic data fields
        formattedPhone: formatted_phone || null,
        websiteVerified: website_verified || null,
        openingHoursJson: opening_hours_json || null,
        googleMapsUrl: google_maps_url || null,
        googleTypes: google_types || null,
        formattedAddressGoogle: formatted_address_google || null,
        businessStatus: business_status || null,
        contactDataFetchedAt: contact_data_fetched_at || null,
        // Map AI-generated description fields from snake_case to camelCase
        aiGeneratedDescription: ai_generated_description || null,
        descriptionGeneratedAt: description_generated_at || null,
        descriptionValidated: description_validated ?? null,
        descriptionSource: description_source || null,
      };
    } catch (error) {
      console.error('Serverless: Error fetching bookstore by ID:', error);
      return undefined;
    }
  }

  async getBookstoreBySlug(slug) {
    console.log('Serverless: [getBookstoreBySlug] Starting lookup for slug:', slug);
    console.log('Serverless: [getBookstoreBySlug] Supabase client available?', !!supabase);
    console.log('Serverless: [getBookstoreBySlug] Is initialized?', this.isInitialized);
    console.log('Serverless: [getBookstoreBySlug] Slug map size:', this.slugToBookstoreId.size);
    
    // Ensure initialization, but don't block if it fails
    try {
      await this.ensureInitialized();
      console.log('Serverless: [getBookstoreBySlug] After ensureInitialized - isInitialized:', this.isInitialized);
      console.log('Serverless: [getBookstoreBySlug] After ensureInitialized - slug map size:', this.slugToBookstoreId.size);
    } catch (error) {
      console.error('Serverless: Error ensuring initialization in getBookstoreBySlug:', error);
      console.error('Serverless: Error stack:', error.stack);
      // Continue with fallback even if initialization failed
    }

    if (!supabase) {
      console.error('Serverless: [getBookstoreBySlug] ERROR: Supabase client not available');
      console.error('Serverless: [getBookstoreBySlug] SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
      console.error('Serverless: [getBookstoreBySlug] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
      return undefined;
    }

    console.log(`Serverless: [getBookstoreBySlug] Looking up bookstore with slug: "${slug}"`);
    console.log(`Serverless: [getBookstoreBySlug] Slug map size: ${this.slugToBookstoreId.size}`);

    // Check if we already have this slug mapped
    const bookstoreId = this.slugToBookstoreId.get(slug);

    if (bookstoreId) {
      console.log(`Serverless: [getBookstoreBySlug] Found ID ${bookstoreId} in slug map, fetching from Supabase...`);
      const bookstore = await this.getBookstore(bookstoreId);
      if (bookstore) {
        console.log(`Serverless: [getBookstoreBySlug] Found bookstore by slug map: "${bookstore.name}" (ID: ${bookstoreId})`);
      }
      return bookstore;
    }

    // Fallback - if no mapping exists, try direct search
    try {
      console.log(`Serverless: [getBookstoreBySlug] Slug not in map, using fallback search...`);
      // Fetch all bookstores and find by slug (less efficient but works as fallback)
      const bookstores = await this.getBookstores();
      console.log(`Serverless: [getBookstoreBySlug] Fetched ${bookstores.length} bookstores for fallback search`);
      
      const bookstoreWithSlug = bookstores.find(b => {
        if (!b.live) return false; // Skip non-live bookstores
        const nameSlug = this.generateSlugFromName(b.name);
        return nameSlug === slug;
      });

      if (bookstoreWithSlug) {
        console.log(`Serverless: [getBookstoreBySlug] Found bookstore via fallback: "${bookstoreWithSlug.name}" (ID: ${bookstoreWithSlug.id})`);
        // Add to map for future lookups
        this.slugToBookstoreId.set(slug, bookstoreWithSlug.id);
        return bookstoreWithSlug;
      } else {
        console.log(`Serverless: [getBookstoreBySlug] No bookstore found with slug: "${slug}"`);
      }

      return bookstoreWithSlug;
    } catch (error) {
      console.error('Serverless: Error in getBookstoreBySlug fallback:', error);
      return undefined;
    }
  }

  async getBookstoresByState(state) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('bookstores')
      .select('*')
      .eq('state', state)
      .eq('live', true)
      .order('name');
    
    if (error || !data) return [];
    
    return (data || []).map((item) => ({
      ...item,
      latitude: item.lat_numeric?.toString() || item.latitude || null,
      longitude: item.lng_numeric?.toString() || item.longitude || null,
      featureIds: item.feature_ids || item.featureIds || [],
      imageUrl: item.image_url || item.imageUrl || null,
      // Map Google Places fields from snake_case to camelCase
      googlePlaceId: item.google_place_id || null,
      googleRating: item.google_rating || null,
      googleReviewCount: item.google_review_count || null,
      googleDescription: item.google_description || null,
      googlePhotos: item.google_photos || null,
      googleReviews: item.google_reviews || null,
      googlePriceLevel: item.google_price_level || null,
      googleDataUpdatedAt: item.google_data_updated_at || null,
    }));
  }

  async getBookstoresByCity(city) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('bookstores')
      .select('*')
      .ilike('city', city)
      .eq('live', true)
      .order('name');
    
    if (error || !data) return [];
    
    return (data || []).map((item) => ({
      ...item,
      latitude: item.lat_numeric?.toString() || item.latitude || null,
      longitude: item.lng_numeric?.toString() || item.longitude || null,
      featureIds: item.feature_ids || item.featureIds || [],
      imageUrl: item.image_url || item.imageUrl || null,
      // Map Google Places fields from snake_case to camelCase
      googlePlaceId: item.google_place_id || null,
      googleRating: item.google_rating || null,
      googleReviewCount: item.google_review_count || null,
      googleDescription: item.google_description || null,
      googlePhotos: item.google_photos || null,
      googleReviews: item.google_reviews || null,
      googlePriceLevel: item.google_price_level || null,
      googleDataUpdatedAt: item.google_data_updated_at || null,
    }));
  }

  async getBookstoresByFeatures(featureIds) {
    if (!supabase || !featureIds || !featureIds.length) return [];
    
    // Supabase doesn't have a direct array contains operator, so we need to query differently
    // This is a simplified version - you may need to adjust based on your schema
    const { data, error } = await supabase
      .from('bookstores')
      .select('*')
      .eq('live', true);
    
    if (error || !data) return [];
    
    // Filter client-side for now (can be optimized with a join table query)
    const bookstores = (data || []).map((item) => ({
      ...item,
      latitude: item.lat_numeric?.toString() || item.latitude || null,
      longitude: item.lng_numeric?.toString() || item.longitude || null,
      featureIds: item.feature_ids || item.featureIds || [],
      imageUrl: item.image_url || item.imageUrl || null,
      // Map Google Places fields from snake_case to camelCase
      googlePlaceId: item.google_place_id || null,
      googleRating: item.google_rating || null,
      googleReviewCount: item.google_review_count || null,
      googleDescription: item.google_description || null,
      googlePhotos: item.google_photos || null,
      googleReviews: item.google_reviews || null,
      googlePriceLevel: item.google_price_level || null,
      googleDataUpdatedAt: item.google_data_updated_at || null,
    }));

    return bookstores.filter(b => {
      const bookshopFeatures = b.featureIds || [];
      return featureIds.some(fid => bookshopFeatures.includes(fid));
    });
  }

  async getFilteredBookstores(filters) {
    if (!supabase) return [];

    let query = supabase.from('bookstores').select('*').eq('live', true);

    if (filters.state) {
      query = query.eq('state', filters.state);
    }

    if (filters.city) {
      query = query.ilike('city', filters.city);
    }

    // Note: County filtering may need special handling depending on your schema
    if (filters.county) {
      query = query.ilike('county', filters.county);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    // Debug: Check if google_photos is in the raw data (development only)
    if (process.env.NODE_ENV === 'development' && data && data.length > 0) {
      const sample = data.find(item => item.google_photos);
      if (sample) {
        console.log('Serverless: Sample google_photos from filter query:', {
          name: sample.name,
          hasGooglePhotos: !!sample.google_photos,
          type: typeof sample.google_photos,
          isArray: Array.isArray(sample.google_photos)
        });
      }
    }

    let bookstores = (data || []).map((item) => ({
      ...item,
      latitude: item.lat_numeric?.toString() || item.latitude || null,
      longitude: item.lng_numeric?.toString() || item.longitude || null,
      featureIds: item.feature_ids || item.featureIds || [],
      imageUrl: item.image_url || item.imageUrl || null,
      // Map hours from hours_json (jsonb) to hours for frontend
      hours: (() => {
        if (item.hours_json) {
          return typeof item.hours_json === 'string' ? JSON.parse(item.hours_json) : item.hours_json;
        }
        if (item['hours (JSON)']) {
          return typeof item['hours (JSON)'] === 'string' ? JSON.parse(item['hours (JSON)']) : item['hours (JSON)'];
        }
        return null;
      })(),
      // Map Google Places fields from snake_case to camelCase
      googlePlaceId: item.google_place_id || null,
      googleRating: item.google_rating || null,
      googleReviewCount: item.google_review_count || null,
      googleDescription: item.google_description || null,
      googlePhotos: (() => {
        if (!item.google_photos) return null;
        // If it's already an array, return it
        if (Array.isArray(item.google_photos)) return item.google_photos;
        // If it's a string, try to parse it
        if (typeof item.google_photos === 'string') {
          try {
            return JSON.parse(item.google_photos);
          } catch (e) {
            console.error('Serverless: Error parsing google_photos JSON in getFilteredBookstores:', e);
            return null;
          }
        }
        return null;
      })(),
      googleReviews: (() => {
        if (!item.google_reviews) return null;
        // If it's already an array, return it
        if (Array.isArray(item.google_reviews)) return item.google_reviews;
        // If it's a string, try to parse it
        if (typeof item.google_reviews === 'string') {
          try {
            return JSON.parse(item.google_reviews);
          } catch (e) {
            console.error('Serverless: Error parsing google_reviews JSON in getFilteredBookstores:', e);
            return null;
          }
        }
        return null;
      })(),
      googlePriceLevel: item.google_price_level || null,
      googleDataUpdatedAt: item.google_data_updated_at || null,
    }));

    // Filter by features if provided
    if (filters.featureIds && filters.featureIds.length > 0) {
      bookstores = bookstores.filter(b => {
        const bookshopFeatures = b.featureIds || [];
        return filters.featureIds.some(fid => bookshopFeatures.includes(fid));
      });
    }

    return populateCountyData(bookstores);
  }

  async createBookstore(bookstore) {
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error } = await supabase.from('bookstores').insert(bookstore).select().single();
    if (error) throw error;
    return data;
  }

  // Feature operations
  async getFeatures() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('features').select('*').order('name');
    if (error || !data) return [];
    
    // Map features to include id field for client compatibility
    // Supabase features table may use slug as primary key, but client expects numeric id
    // Generate stable numeric IDs from slugs for compatibility
    return data.map((feature, index) => {
      // If feature already has id field, use it
      if (feature.id !== undefined && feature.id !== null) {
        return feature;
      }
      
      // Generate stable numeric ID from slug using hash function
      // This ensures same slug always gets same ID
      let numericId = index + 1; // Fallback to index-based ID
      if (feature.slug) {
        // Simple hash function to convert slug to numeric ID
        let hash = 0;
        for (let i = 0; i < feature.slug.length; i++) {
          const char = feature.slug.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        numericId = Math.abs(hash) % 100000; // Keep IDs reasonable (0-99999)
      }
      
      return {
        id: numericId,
        name: feature.name,
        slug: feature.slug,
        description: feature.description,
        keywords: feature.keywords,
        icon: feature.icon,
        created_at: feature.created_at,
        // Include any other fields that might exist
        ...feature
      };
    });
  }

  async getFeature(id) {
    if (!supabase) return undefined;
    
    // Try querying by id first (if id column exists)
    let { data, error } = await supabase.from('features').select('*').eq('id', id).single();
    
    // If query by id fails, try to find by matching generated ID from slug
    if (error || !data) {
      // Get all features and find one that matches the generated ID
      const allFeatures = await this.getFeatures();
      data = allFeatures.find(f => f.id === id);
      if (!data) return undefined;
    }
    
    // Ensure id field exists in response
    if (data && !data.id && data.slug) {
      // Generate ID from slug (same logic as getFeatures)
      let hash = 0;
      for (let i = 0; i < data.slug.length; i++) {
        const char = data.slug.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      data.id = Math.abs(hash) % 100000;
    }
    
    return data;
  }

  async createFeature(feature) {
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error } = await supabase.from('features').insert(feature).select().single();
    if (error) throw error;
    return data;
  }

  // Event operations
  async getEvents() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('events').select('*').order('date');
    if (error || !data) return [];
    return data;
  }

  async getEventsByBookshop(bookshopId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('bookshopId', bookshopId)
      .order('date');
    if (error || !data) return [];
    return data;
  }

  async createEvent(event) {
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error } = await supabase.from('events').insert(event).select().single();
    if (error) throw error;
    return data;
  }
}

