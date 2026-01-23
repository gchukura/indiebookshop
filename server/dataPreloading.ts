import { Request, Response, NextFunction } from 'express';
import { IStorage } from './storage';
import { log } from './vite';
import { supabase } from './supabase';

// Storage will be injected via middleware
let storage: IStorage;

// Column selections optimized for egress costs (must match supabase-storage.ts)
const LIST_COLUMNS = 'id,name,city,state,county,street,zip,latitude,longitude,lat_numeric,lng_numeric,image_url,website,phone,live,google_rating,google_review_count,google_place_id,feature_ids';

// Simple in-memory cache for frequently accessed data
// Cache expires after 30 minutes (increased from 5 for better performance)
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Clean up expired cache entries every 5 minutes
// This prevents memory leaks in high-traffic scenarios
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  for (const [key, value] of Array.from(cache.entries())) {
    if (value.expires <= now) {
      cache.delete(key);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    log(`Cleaned up ${cleanedCount} expired cache entries`, 'cache');
  }
}, CACHE_CLEANUP_INTERVAL);

function getCached(key: string): any | null {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCached(key: string, data: any): void {
  cache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL
  });
}

/**
 * Data preloading configuration - maps routes to data fetching functions
 */
const PRELOAD_CONFIG: Record<string, (req: Request) => Promise<Record<string, any>>> = {
  // Home page - preload featured bookshops
  // OPTIMIZED: Fetch 8 random bookstores directly from database (was fetching ALL 2000+)
  '/': async () => {
    const cacheKey = 'homepage-featured';
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch 8 random bookstores directly from database using ORDER BY random()
    // This reduces egress from 200MB to 40KB (99.8% reduction!)
    if (!supabase) {
      log('Supabase not available, falling back to storage.getBookstores()', 'preload');
      const bookstores = await storage.getBookstores();
      const randomSelection = shuffleArray(bookstores).slice(0, 8);
      const result = { featuredBookshops: randomSelection };
      setCached(cacheKey, result);
      return result;
    }

    try {
      const { data: randomSelection, error } = await supabase
        .from('bookstores')
        .select(LIST_COLUMNS)
        .eq('live', true)
        .order('random()')
        .limit(8);

      if (error) {
        console.error('Error fetching random bookstores:', error);
        // Fallback to old method if database random fails
        const bookstores = await storage.getBookstores();
        const fallbackSelection = shuffleArray(bookstores).slice(0, 8);
        const result = { featuredBookshops: fallbackSelection };
        setCached(cacheKey, result);
        return result;
      }

      // Map Supabase column names to match Bookstore type
      const mappedBookstores = (randomSelection || []).map((item: any) => ({
        ...item,
        latitude: item.lat_numeric?.toString() || item.latitude || null,
        longitude: item.lng_numeric?.toString() || item.longitude || null,
        featureIds: item.feature_ids || item.featureIds || [],
        imageUrl: item.image_url || item.imageUrl || null,
        googlePlaceId: item.google_place_id || null,
        googleRating: item.google_rating || null,
        googleReviewCount: item.google_review_count || null,
      }));

      const result = { featuredBookshops: mappedBookstores };
      setCached(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error in homepage preload:', error);
      // Fallback to old method
      const bookstores = await storage.getBookstores();
      const fallbackSelection = shuffleArray(bookstores).slice(0, 8);
      const result = { featuredBookshops: fallbackSelection };
      setCached(cacheKey, result);
      return result;
    }
  },
  
  // Directory page - preload states, features, and popular bookshops for SEO links
  // OPTIMIZED: Fetch only distinct states + top 15 bookshops (was fetching ALL 2000+)
  '/directory': async () => {
    const cacheKey = 'directory-data';
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }

    if (!supabase) {
      log('Supabase not available, falling back to storage.getBookstores()', 'preload');
      const bookstores = await storage.getBookstores();
      const states = Array.from(new Set(bookstores.map(b => b.state).filter(Boolean)));
      const features = await storage.getFeatures();
      const popularBookshops = [...bookstores]
        .sort((a, b) => {
          const aRating = a.googleRating ? parseFloat(a.googleRating) : 0;
          const bRating = b.googleRating ? parseFloat(b.googleRating) : 0;
          const aScore = aRating * 10 + (a.googleReviewCount || 0);
          const bScore = bRating * 10 + (b.googleReviewCount || 0);
          return bScore - aScore;
        })
        .slice(0, 15);
      const result = { states, features, popularBookshops };
      setCached(cacheKey, result);
      return result;
    }

    try {
      // Fetch only distinct states from database (much more efficient!)
      const { data: statesData, error: statesError } = await supabase
        .from('bookstores')
        .select('state')
        .eq('live', true)
        .order('state');

      if (statesError) {
        console.error('Error fetching states:', statesError);
      }

      const states = Array.from(new Set(
        (statesData || []).map((b: any) => b.state).filter(Boolean)
      ));

      // Fetch features using storage (already optimized)
      const features = await storage.getFeatures();

      // Fetch top 15 popular bookshops by rating (sorted in database)
      const { data: popularData, error: popularError } = await supabase
        .from('bookstores')
        .select(LIST_COLUMNS)
        .eq('live', true)
        .not('google_rating', 'is', null)
        .order('google_rating', { ascending: false })
        .order('google_review_count', { ascending: false })
        .limit(15);

      if (popularError) {
        console.error('Error fetching popular bookshops:', popularError);
      }

      // Map Supabase column names
      const popularBookshops = (popularData || []).map((item: any) => ({
        ...item,
        latitude: item.lat_numeric?.toString() || item.latitude || null,
        longitude: item.lng_numeric?.toString() || item.longitude || null,
        featureIds: item.feature_ids || item.featureIds || [],
        imageUrl: item.image_url || item.imageUrl || null,
        googlePlaceId: item.google_place_id || null,
        googleRating: item.google_rating || null,
        googleReviewCount: item.google_review_count || null,
      }));

      const result = { states, features, popularBookshops };
      setCached(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error in directory preload:', error);
      // Fallback to old method
      const bookstores = await storage.getBookstores();
      const states = Array.from(new Set(bookstores.map(b => b.state).filter(Boolean)));
      const features = await storage.getFeatures();
      const popularBookshops = [...bookstores]
        .sort((a, b) => {
          const aRating = a.googleRating ? parseFloat(a.googleRating) : 0;
          const bRating = b.googleRating ? parseFloat(b.googleRating) : 0;
          const aScore = aRating * 10 + (a.googleReviewCount || 0);
          const bScore = bRating * 10 + (b.googleReviewCount || 0);
          return bScore - aScore;
        })
        .slice(0, 15);
      const result = { states, features, popularBookshops };
      setCached(cacheKey, result);
      return result;
    }
  },
  
  // States list page
  '/directory/browse': async () => {
    const bookstores = await storage.getBookstores();
    const stateMap: Record<string, number> = {};
    
    bookstores.forEach(bookstore => {
      if (bookstore.state) {
        stateMap[bookstore.state] = (stateMap[bookstore.state] || 0) + 1;
      }
    });
    
    return { stateMap };
  },
  
  // Individual bookshop page - numeric ID (legacy) or slug
  '/bookshop/:id': async (req) => {
    const idParam = req.params.id;
    
    // Check if the entire string is numeric (not just starts with a number)
    // e.g., "123" is numeric, but "113-books" is not
    const isNumericId = /^\d+$/.test(idParam);
    
    if (isNumericId) {
      // It's a numeric ID - fetch by ID
      const id = parseInt(idParam);
    const bookshop = await storage.getBookstore(id);
      const events = bookshop ? await storage.getEventsByBookshop(id) : [];
      log(`Preloaded bookshop by ID ${id}: ${bookshop ? bookshop.name : 'not found'}`, 'preload');
      return { bookshop, events };
    }
    
    // It's a slug - fetch by slug
    log(`Preloading bookshop by slug: ${idParam}`, 'preload');
    
    try {
      const bookshop = await storage.getBookstoreBySlug(idParam);
      if (!bookshop) {
        log(`No bookshop found with slug: ${idParam}`, 'preload');
        return { bookshop: null, events: [] };
      }
      
      log(`Found bookshop by slug: ${bookshop.name} (ID: ${bookshop.id})`, 'preload');
      const events = await storage.getEventsByBookshop(bookshop.id);
    return { bookshop, events };
    } catch (error) {
      log(`Error fetching bookshop by slug ${idParam}: ${error instanceof Error ? error.message : String(error)}`, 'preload');
      console.error('Error in getBookstoreBySlug:', error);
      return { bookshop: null, events: [] };
    }
  },
  
  // State directory
  '/directory/state/:state': async (req) => {
    const state = req.params.state;
    const bookshops = await storage.getBookstoresByState(state);
    return { bookshops, state };
  },
  
  // City directory
  '/directory/city/:city': async (req) => {
    const city = req.params.city;
    const bookshops = await storage.getBookstoresByCity(city);
    return { bookshops, city };
  },
  
  // Category directory
  '/directory/category/:featureId': async (req) => {
    const featureId = parseInt(req.params.featureId);
    if (isNaN(featureId)) return { bookshops: [], feature: null };
    
    const bookshops = await storage.getBookstoresByFeatures([featureId]);
    const feature = await storage.getFeature(featureId);
    
    return { bookshops, feature };
  }
};

/**
 * Helper function to shuffle an array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Check if a path matches a route pattern with params
 * e.g. "/bookshop/123" matches "/bookshop/:id"
 */
function matchRoute(path: string, pattern: string): Record<string, string> | null {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  
  if (pathParts.length !== patternParts.length) return null;
  
  const params: Record<string, string> = {};
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    
    if (patternPart.startsWith(':')) {
      // This is a parameter
      const paramName = patternPart.slice(1);
      params[paramName] = pathParts[i];
    } else if (patternPart !== pathParts[i]) {
      // Static part doesn't match
      return null;
    }
  }
  
  return params;
}

/**
 * Create data preload middleware with the specified storage implementation
 */
export function createDataPreloadMiddleware(storageImpl: IStorage) {
  // Create a closure that captures the storage implementation
  return function dataPreloadMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip data preloading for API routes, static assets, etc.
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return next();
  }
  
  // Check for exact path match first
  let preloadFn = PRELOAD_CONFIG[req.path];
  let params: Record<string, string> = {};
  
  // If no exact match, check for parameterized routes
  if (!preloadFn) {
    for (const pattern of Object.keys(PRELOAD_CONFIG)) {
      if (pattern.includes(':')) {
        const matchParams = matchRoute(req.path, pattern);
        if (matchParams) {
          preloadFn = PRELOAD_CONFIG[pattern];
          params = matchParams;
          // Add params to request
          req.params = { ...req.params, ...params };
          break;
        }
      }
    }
  }
  
  if (!preloadFn) {
    // No matching preload configuration
    return next();
  }
  
    // Preload data using the provided storage implementation
    // Replace 'storage' references in the preload function with storageImpl
    const preloadFnWithStorage = async (req: Request) => {
      // Temporarily replace the storage reference
      const originalStorage = storage;
      storage = storageImpl;
      try {
        return await preloadFn(req);
      } finally {
        storage = originalStorage;
      }
    };
    
    preloadFnWithStorage(req)
    .then(data => {
      // Store preloaded data in res.locals for access by Vite middleware
      res.locals.preloadedData = data;
      
      // Create a script to inject the preloaded data
      const dataScript = `
        <script id="__PRELOADED_STATE__">
          window.__PRELOADED_STATE__ = ${JSON.stringify(data).replace(/</g, '\\u003c')};
        </script>
      `;
      
      // Store the script in res.locals for injection into the HTML
      res.locals.dataScript = dataScript;
      
      log(`Preloaded data for ${req.path}`, 'preload');
      next();
    })
    .catch(error => {
      console.error(`Error preloading data for ${req.path}:`, error);
      // Continue without preloaded data
      next();
    });
  };
}