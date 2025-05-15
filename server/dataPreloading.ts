import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { log } from './vite';

/**
 * Data preloading configuration - maps routes to data fetching functions
 */
const PRELOAD_CONFIG: Record<string, (req: Request) => Promise<Record<string, any>>> = {
  // Home page - preload featured bookshops
  '/': async () => {
    const bookstores = await storage.getBookstores();
    const randomSelection = shuffleArray(bookstores).slice(0, 8);
    return { featuredBookshops: randomSelection };
  },
  
  // Directory page - preload states and features
  '/directory': async () => {
    const states = Array.from(new Set((await storage.getBookstores()).map(b => b.state)));
    const features = await storage.getFeatures();
    return { states, features };
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
  
  // Individual bookshop page
  '/bookshop/:id': async (req) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return { bookshop: null };
    
    const bookshop = await storage.getBookstore(id);
    const events = await storage.getEventsByBookshop(id);
    
    return { bookshop, events };
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
 * Middleware that preloads data for specific routes
 */
export function dataPreloadMiddleware(req: Request, res: Response, next: NextFunction) {
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
  
  // Preload data
  preloadFn(req)
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
}