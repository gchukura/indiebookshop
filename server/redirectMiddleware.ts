import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

/**
 * Middleware to handle 301 redirects from legacy URL patterns to canonical formats
 * 
 * This helps consolidate SEO value by directing search engines and visitors
 * to our preferred URL structures
 */
export function redirectMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  
  // Only process GET requests (not API calls, assets, etc.)
  if (req.method !== 'GET' || path.startsWith('/api/') || path.includes('.')) {
    return next();
  }

  // Case 1: Redirect city pages without state to state-specific city pages
  if (path.match(/^\/directory\/city\/([^\/]+)$/)) {
    const citySlug = path.split('/').pop() as string;
    
    // Convert slug back to city name for matching
    // This is a simplified conversion - in reality we should have a proper slug-to-name mapping
    const cityName = citySlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Find the first bookstore with this city to get its state
    storage.getBookstoresByCity(cityName)
      .then(bookstores => {
        if (bookstores.length > 0 && bookstores[0].state) {
          // Get the state abbreviation
          const stateAbbr = bookstores[0].state.toLowerCase();
          
          // Redirect to the canonical URL with state in path
          return res.redirect(301, `/directory/city/${stateAbbr}/${citySlug}`);
        }
        // If we can't determine the state, proceed normally
        return next();
      })
      .catch(err => {
        console.error('Error in redirect middleware:', err);
        return next();
      });
    
    return; // Important: return here to prevent next() from being called immediately
  }
  
  // Case 2: Handle old bookstore URLs if you had them (e.g., /bookstore/123 -> /bookshop/123)
  if (path.match(/^\/bookstore\/(\d+)$/)) {
    const bookstoreId = path.split('/').pop();
    return res.redirect(301, `/bookshop/${bookstoreId}`);
  }

  // Case 3: Handle legacy category URLs if format has changed
  if (path.match(/^\/category\/(\d+)$/)) {
    const categoryId = path.split('/').pop();
    return res.redirect(301, `/directory/category/${categoryId}`);
  }

  // Case 4: Handle old state URL formats if applicable
  if (path.match(/^\/state\/([^\/]+)$/)) {
    const stateSlug = path.split('/').pop();
    return res.redirect(301, `/directory/state/${stateSlug}`);
  }

  // No redirects needed, continue to next middleware
  next();
}