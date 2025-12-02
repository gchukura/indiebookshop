import { Request, Response, NextFunction } from 'express';

/**
 * Helper function to decode a slug back to a readable name
 * Converts "new-york" → "New York"
 */
function decodeSlug(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper function to normalize state slug to abbreviation
 * Handles both "va", "virginia", "VA" → "VA"
 */
function normalizeStateSlug(stateSlug: string): string {
  const upper = stateSlug.toUpperCase();
  
  // If it's already a 2-letter abbreviation, return it
  if (upper.length === 2) {
    return upper;
  }
  
  // Try to match against common state name patterns
  const stateNameMap: { [key: string]: string } = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new-hampshire': 'NH', 'new-jersey': 'NJ',
    'new-mexico': 'NM', 'new-york': 'NY', 'north-carolina': 'NC', 'north-dakota': 'ND',
    'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA',
    'rhode-island': 'RI', 'south-carolina': 'SC', 'south-dakota': 'SD',
    'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
    'virginia': 'VA', 'washington': 'WA', 'west-virginia': 'WV', 'wisconsin': 'WI',
    'wyoming': 'WY'
  };
  
  const normalized = stateSlug.toLowerCase().replace(/\s+/g, '-');
  return stateNameMap[normalized] || upper;
}

/**
 * Middleware to handle 301 redirects from legacy URL patterns to canonical formats
 * 
 * This helps consolidate SEO value by directing search engines and visitors
 * to our preferred URL structures (the unified /directory page with query parameters)
 */
export function redirectMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  
  // Only process GET requests (not API calls, assets, etc.)
  if (req.method !== 'GET' || path.startsWith('/api/') || path.includes('.')) {
    return next();
  }

  // Redirect old list pages to unified directory page
  if (path === '/directory/browse' || path === '/directory/states') {
    return res.redirect(301, '/directory');
  }

  if (path === '/directory/cities') {
    return res.redirect(301, '/directory');
  }

  if (path === '/directory/counties') {
    return res.redirect(301, '/directory');
  }

  if (path === '/directory/categories') {
    return res.redirect(301, '/directory');
  }

  // Case 1a: Redirect /directory/state (no params) → /directory (unified page)
  if (path === '/directory/state') {
    return res.redirect(301, '/directory');
  }

  // Case 1b: Redirect /directory/state/:state → /directory?state=:state
  const stateMatch = path.match(/^\/directory\/state\/([^\/]+)$/);
  if (stateMatch) {
    const stateSlug = decodeURIComponent(stateMatch[1]);
    const stateAbbr = normalizeStateSlug(stateSlug);
    return res.redirect(301, `/directory?state=${encodeURIComponent(stateAbbr)}`);
  }

  // Case 2: Redirect /directory/city (no params) → /directory (unified page)
  if (path === '/directory/city') {
    return res.redirect(301, '/directory');
  }

  // Case 3: Redirect /directory/city/:state/:city → /directory?state=:state&city=:city
  const cityStateMatch = path.match(/^\/directory\/city\/([^\/]+)\/([^\/]+)$/);
  if (cityStateMatch) {
    const stateSlug = decodeURIComponent(cityStateMatch[1]);
    const citySlug = decodeURIComponent(cityStateMatch[2]);
    const stateAbbr = normalizeStateSlug(stateSlug);
    const cityName = decodeSlug(citySlug);
    return res.redirect(301, `/directory?state=${encodeURIComponent(stateAbbr)}&city=${encodeURIComponent(cityName)}`);
  }

  // Case 4: Redirect /directory/city/:city → /directory?city=:city
  const cityOnlyMatch = path.match(/^\/directory\/city\/([^\/]+)$/);
  if (cityOnlyMatch) {
    const citySlug = decodeURIComponent(cityOnlyMatch[1]);
    const cityName = decodeSlug(citySlug);
    return res.redirect(301, `/directory?city=${encodeURIComponent(cityName)}`);
  }

  // Case 5: Redirect /directory/city-state/:citystate → /directory?state=:state&city=:city
  const cityStateCombinedMatch = path.match(/^\/directory\/city-state\/([^\/]+)$/);
  if (cityStateCombinedMatch) {
    const combined = decodeURIComponent(cityStateCombinedMatch[1]);
    const parts = combined.split('-');
    if (parts.length >= 2) {
      const stateSlug = parts[parts.length - 1];
      const citySlug = parts.slice(0, parts.length - 1).join('-');
      const stateAbbr = normalizeStateSlug(stateSlug);
      const cityName = decodeSlug(citySlug);
      return res.redirect(301, `/directory?state=${encodeURIComponent(stateAbbr)}&city=${encodeURIComponent(cityName)}`);
    }
  }

  // Case 6a: Redirect /directory/county (no params) → /directory (unified page)
  if (path === '/directory/county') {
    return res.redirect(301, '/directory');
  }

  // Case 6b: Redirect /directory/county/:state/:county → /directory?state=:state&county=:county
  const countyStateMatch = path.match(/^\/directory\/county\/([^\/]+)\/([^\/]+)$/);
  if (countyStateMatch) {
    const stateSlug = decodeURIComponent(countyStateMatch[1]);
    const countySlug = decodeURIComponent(countyStateMatch[2]);
    const stateAbbr = normalizeStateSlug(stateSlug);
    // Remove "county" suffix if present and decode slug
    let countyName = decodeSlug(countySlug);
    countyName = countyName.replace(/\s+County$/i, '');
    return res.redirect(301, `/directory?state=${encodeURIComponent(stateAbbr)}&county=${encodeURIComponent(countyName)}`);
  }

  // Case 7: Redirect /directory/county-state/:countystate → /directory?state=:state&county=:county
  const countyStateCombinedMatch = path.match(/^\/directory\/county-state\/([^\/]+)$/);
  if (countyStateCombinedMatch) {
    const combined = decodeURIComponent(countyStateCombinedMatch[1]);
    const parts = combined.split('-');
    if (parts.length >= 2) {
      const stateSlug = parts[parts.length - 1];
      const countySlug = parts.slice(0, parts.length - 1).join('-');
      const stateAbbr = normalizeStateSlug(stateSlug);
      let countyName = decodeSlug(countySlug);
      countyName = countyName.replace(/\s+County$/i, '');
      return res.redirect(301, `/directory?state=${encodeURIComponent(stateAbbr)}&county=${encodeURIComponent(countyName)}`);
    }
  }

  // Case 8a: Redirect /directory/category (no params) → /directory (unified page)
  if (path === '/directory/category') {
    return res.redirect(301, '/directory');
  }

  // Case 8b: Redirect /directory/category/:featureId → /directory?features=:featureId
  const categoryMatch = path.match(/^\/directory\/category\/([^\/]+)$/);
  if (categoryMatch) {
    const featureId = decodeURIComponent(categoryMatch[1]);
    // If it's a numeric ID, use it directly; otherwise it might be a slug
    return res.redirect(301, `/directory?features=${encodeURIComponent(featureId)}`);
  }

  // Case 9: Handle old bookstore URLs (e.g., /bookstore/123 -> /bookshop/123)
  // Note: The client-side BookshopDetailPage will then redirect numeric IDs to slug-based URLs
  // for proper canonical URLs. This two-step redirect ensures backward compatibility while
  // maintaining SEO-friendly slug URLs as the canonical format.
  if (path.match(/^\/bookstore\/(\d+)$/)) {
    const bookstoreId = path.split('/').pop();
    return res.redirect(301, `/bookshop/${bookstoreId}`);
  }
  
  // Case 9b: Handle numeric IDs in /bookshop/:id (legacy URLs)
  // Redirect to slug-based URL via client-side redirect in BookshopDetailPage
  // The canonical tag will always point to the slug-based URL
  // This ensures all bookshop detail pages use slug-based canonical URLs
  const bookshopNumericMatch = path.match(/^\/bookshop\/(\d+)$/);
  if (bookshopNumericMatch) {
    // Allow the request to proceed - BookshopDetailPage will handle the redirect to slug
    // This is acceptable because:
    // 1. The canonical tag always uses the slug-based URL
    // 2. Client-side redirect is fast and preserves SEO value
    // 3. Avoids complex server-side lookups in middleware
    return next();
  }

  // Case 10: Handle legacy category URLs (e.g., /category/123 -> /directory/category/123 -> /directory?features=123)
  const legacyCategoryMatch = path.match(/^\/category\/(\d+)$/);
  if (legacyCategoryMatch) {
    const categoryId = legacyCategoryMatch[1];
    return res.redirect(301, `/directory?features=${categoryId}`);
  }

  // Case 11: Handle old state URL formats (e.g., /state/VA -> /directory?state=VA)
  const legacyStateMatch = path.match(/^\/state\/([^\/]+)$/);
  if (legacyStateMatch) {
    const stateSlug = decodeURIComponent(legacyStateMatch[1]);
    const stateAbbr = normalizeStateSlug(stateSlug);
    return res.redirect(301, `/directory?state=${encodeURIComponent(stateAbbr)}`);
  }

  // Case 12: Redirect /submit to /submit-bookshop for SEO consistency (canonical URL)
  if (path === '/submit') {
    return res.redirect(301, '/submit-bookshop');
  }

  // No redirects needed, continue to next middleware
  next();
}
