import { Request, Response, NextFunction } from 'express';
import { IStorage } from './storage';
import { log } from './vite';

// Storage will be injected via middleware
let storage: IStorage;

// Simple in-memory cache for frequently accessed data
// Cache expires after 5 minutes
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired cache entries every 5 minutes
// This prevents memory leaks in high-traffic scenarios
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  for (const [key, value] of cache.entries()) {
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
  // OPTIMIZATION: Fetch only a limited set instead of all bookstores
  '/': async () => {
    const cacheKey = 'homepage-featured';
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch all bookstores but cache the result
    // In production, consider adding a "featured" flag to database
    // and fetching only those, or limiting to top 100 by rating
    const bookstores = await storage.getBookstores();
    const randomSelection = shuffleArray(bookstores).slice(0, 8);
    const result = { featuredBookshops: randomSelection };
    setCached(cacheKey, result);
    return result;
  },
  
  // Directory page - preload states, features, and popular bookshops for SEO links
  // OPTIMIZATION: Cache states list instead of fetching all bookstores every time
  '/directory': async () => {
    const cacheKey = 'directory-data';
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch all bookstores to get states (could be optimized with a DISTINCT query)
    const bookstores = await storage.getBookstores();
    const states = Array.from(new Set(bookstores.map(b => b.state).filter(Boolean)));
    const features = await storage.getFeatures();
    
    // Get popular bookshops for SEO links (top 15 by rating/reviews)
    const popularBookshops = [...bookstores]
      .sort((a, b) => {
        const aScore = (a.rating || 0) * 10 + (a.reviewCount || 0);
        const bScore = (b.rating || 0) * 10 + (b.reviewCount || 0);
        return bScore - aScore;
      })
      .slice(0, 15);
    
    const result = { states, features, popularBookshops };
    setCached(cacheKey, result);
    return result;
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