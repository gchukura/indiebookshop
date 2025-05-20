import { Request, Response, NextFunction } from 'express';

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

  // Case 1: Redirect old city URLs without state to the directory page
  // We can't automatically determine the state, so we redirect to the directory
  // which will help users find the correct city
  if (path.match(/^\/directory\/city\/([^\/]+)$/)) {
    // Don't redirect if the URL already includes a state prefix (like /oh/columbus)
    const pathParts = path.split('/');
    // If there are 4 parts (/directory/city/boston), redirect to directory
    if (pathParts.length === 4) {
      return res.redirect(301, '/directory/cities');
    }
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