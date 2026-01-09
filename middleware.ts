// Vercel Edge Middleware for rate limiting and location variant redirects
// Uses Web API types compatible with Vercel Edge Functions
// NOTE: SEO injection is now handled by serverless functions (api/static-pages.js and api/bookshop-slug.js)

// Simple in-memory cache for bookshop data (Edge Middleware compatible)
// Cache expires after 5 minutes
// Used only for location variant redirects, not for SEO injection
const bookshopCache = new Map<string, { data: any; expires: number }>();
const BOOKSHOP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedBookshop(slug: string): any | null {
  const cached = bookshopCache.get(slug);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  bookshopCache.delete(slug);
  return null;
}

function setCachedBookshop(slug: string, data: any): void {
  bookshopCache.set(slug, {
    data,
    expires: Date.now() + BOOKSHOP_CACHE_TTL
  });
}

// Rate limiting storage (in-memory for Edge Middleware)
// In production, consider using Upstash Redis for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries every 5 minutes
// This prevents memory leaks in high-traffic scenarios
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  const now = Date.now();
  
  // Clean up expired bookshop cache entries
  let bookshopCacheCleaned = 0;
  for (const [key, value] of bookshopCache.entries()) {
    if (value.expires <= now) {
      bookshopCache.delete(key);
      bookshopCacheCleaned++;
    }
  }
  
  // Clean up expired rate limit entries
  let rateLimitCleaned = 0;
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
      rateLimitCleaned++;
    }
  }
  
  // Log cleanup activity (only in development or if significant cleanup occurred)
  if (bookshopCacheCleaned > 0 || rateLimitCleaned > 0) {
    console.log(`[Cache Cleanup] Removed ${bookshopCacheCleaned} bookshop cache entries and ${rateLimitCleaned} rate limit entries`);
  }
}, CLEANUP_INTERVAL);

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message: string; // Error message
}

// Rate limit configurations
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Stricter rate limiting for submission endpoints
  '/api/bookstores/submit': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes
    message: 'Too many submissions from this IP, please try again later.',
  },
  '/api/events': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes
    message: 'Too many event submissions from this IP, please try again later.',
  },
  // General API rate limiting
  '/api': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
  },
};

/**
 * Get client IP address from request
 */
function getClientIP(request: Request): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to a default (shouldn't happen in Vercel)
  return 'unknown';
}

/**
 * Check if request should be rate limited
 */
function checkRateLimit(
  ip: string,
  path: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `${ip}:${path}`;
  const record = rateLimitStore.get(key);

  // If no record exists or window has expired, create new record
  if (!record || record.resetTime < now) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: config.max - 1,
      resetTime,
    };
  }

  // If limit exceeded, deny request
  if (record.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  
  return {
    allowed: true,
    remaining: config.max - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Find the most specific rate limit config for a path
 */
function getRateLimitConfig(path: string): RateLimitConfig | null {
  // Check specific paths first (more specific)
  if (rateLimitConfigs[path]) {
    return rateLimitConfigs[path];
  }
  
  // Check if path starts with any configured path
  for (const [configPath, config] of Object.entries(rateLimitConfigs)) {
    if (path.startsWith(configPath)) {
      return config;
    }
  }
  
  return null;
}

/**
 * Generate a slug from a bookshop name (must match client-side logic)
 * Used only for location variant redirects
 */
function generateSlugFromName(name: string): string {
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
 * Fetch bookshop data from Supabase by slug
 */
async function fetchBookshopBySlug(slug: string): Promise<any | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not set in edge middleware');
    return null;
  }
  
  try {
    // OPTIMIZATION: Use direct slug column query instead of fetching all bookstores
    // This dramatically reduces egress (from all bookstores to just 1 record)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookstores?slug=eq.${encodeURIComponent(slug)}&live=eq.true&select=*&limit=1`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        // No bookshop found with this slug - this is expected
        return null;
      }
      console.error('Failed to fetch bookshop from Supabase:', response.status);
      return null;
    }
    
    const bookstores = await response.json();
    
    if (!bookstores || bookstores.length === 0) {
      return null;
    }
    
    const bookshop = bookstores[0];
    
    // Map Supabase column names to expected format
    return {
      ...bookshop,
      latitude: bookshop.lat_numeric?.toString() || bookshop.latitude || null,
      longitude: bookshop.lng_numeric?.toString() || bookshop.longitude || null,
      featureIds: bookshop.feature_ids || bookshop.featureIds || [],
      imageUrl: bookshop.image_url || bookshop.imageUrl || null,
    };
  } catch (error) {
    console.error('Error fetching bookshop from Supabase:', error);
    return null;
  }
}

/**
 * Try to find a bookshop by trying different slug variations
 * This handles location variants like "powells-books-portland" by trying:
 * 1. Full slug
 * 2. Remove last part (portland) → "powells-books"
 * 3. Remove another part → "powells"
 * etc.
 */
async function findBookshopBySlugVariations(
  slug: string
): Promise<{ bookshop: any; matchedSlug: string } | null> {
  // Try the full slug first
  let bookshop = await fetchBookshopBySlug(slug);
  if (bookshop) {
    return { bookshop, matchedSlug: slug };
  }

  // If not found, try progressively removing parts from the end
  // This handles location variants like "powells-books-portland"
  const parts = slug.split('-');
  
  // Try removing parts from the end (city name, etc.)
  for (let i = parts.length - 1; i >= 1; i--) {
    const baseSlug = parts.slice(0, i).join('-');
    if (baseSlug && baseSlug.length > 0) {
      bookshop = await fetchBookshopBySlug(baseSlug);
      if (bookshop) {
        return { bookshop, matchedSlug: baseSlug };
      }
    }
  }

  return null;
}


export async function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Log middleware execution for debugging
  console.log(`[Edge Middleware] Executing for pathname: ${pathname}`);
  
  // Rewrite static pages to serverless function BEFORE static file serving
  // This ensures SEO injection works even when Vercel would serve static files
  const staticPages = ['/', '/directory', '/about', '/contact', '/events', '/blog'];
  if (staticPages.includes(pathname)) {
    console.log(`[Edge Middleware] Rewriting static page ${pathname} to /api/static-pages.js`);
    // Rewrite the request to the serverless function
    const rewriteUrl = new URL(request.url);
    rewriteUrl.pathname = '/api/static-pages.js';
    // Preserve query string
    const rewrittenRequest = new Request(rewriteUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    // Fetch from the rewritten URL and return the response
    try {
      const response = await fetch(rewrittenRequest);
      return response;
    } catch (error) {
      console.error(`[Edge Middleware] Error rewriting ${pathname}:`, error);
      // Pass through on error
      return new Response(null, { status: 200 });
    }
  }
  
  // Handle location variant redirects for /bookshop/* routes
  // SEO injection is now handled by serverless functions (api/bookshop-slug.js)
  if (pathname.startsWith('/bookshop/')) {
    try {
      const requestedSlug = pathname.split('/').pop();
      
      if (!requestedSlug) {
        return new Response(null, { status: 200 });
      }
      
      // Skip if it's numeric (handled by client-side redirect)
      if (/^\d+$/.test(requestedSlug)) {
        return new Response(null, { status: 200 });
      }
      
      // Check if this looks like a location variant (has multiple hyphens)
      // Location variants typically have 2+ parts: "name-city" or "name-books-city"
      const parts = requestedSlug.split('-');
      if (parts.length >= 2) {
        try {
          const result = await findBookshopBySlugVariations(requestedSlug);
          if (result) {
            const { bookshop, matchedSlug } = result;
            const canonicalSlug = generateSlugFromName(bookshop.name);
            
            // If the requested slug doesn't match the canonical slug, redirect
            if (canonicalSlug && requestedSlug !== canonicalSlug) {
              const canonicalUrl = `${url.origin}/bookshop/${canonicalSlug}`;
              console.log(`[Edge Middleware] Location variant redirect: ${pathname} → ${canonicalUrl}`);
              return Response.redirect(canonicalUrl, 301);
            }
          }
        } catch (error) {
          console.error('[Edge Middleware] Error looking up bookshop for location variant redirect:', error);
          // Pass through on error - let serverless function handle it
        }
      }
      
      // Pass through to serverless function for SEO injection
      return new Response(null, { status: 200 });
    } catch (error) {
      console.error('[Edge Middleware] Error in location variant redirect:', error);
      // Pass through on error
      return new Response(null, { status: 200 });
    }
  }
  
  // Handle rate limiting for API routes
  // Note: /sitemap.xml rewrites to /api/sitemap, but middleware runs on original path
  // so /sitemap.xml won't match /api/:path* and won't be rate limited (which is correct)
  if (pathname.startsWith('/api')) {
  // Get rate limit config for this path
  const config = getRateLimitConfig(pathname);
  if (!config) {
    // No rate limiting configured for this path
    return new Response(null, { status: 200 });
  }

  // Get client IP
  const ip = getClientIP(request);
  
  // Check rate limit
  const result = checkRateLimit(ip, pathname, config);

  // If rate limited, return 429 response
  if (!result.allowed) {
    const remaining = Math.max(0, result.remaining);
    const resetTime = Math.ceil(result.resetTime / 1000);
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    
    return new Response(
      JSON.stringify({ message: config.message }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(resetTime),
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  // Add rate limit headers to successful response
  const remaining = Math.max(0, result.remaining);
  const resetTime = Math.ceil(result.resetTime / 1000);
  
  // Return response with rate limit headers
  // Note: In Vercel Edge Middleware, we can't modify the response headers
  // of the actual request, so we return a pass-through response
  return new Response(null, {
    status: 200,
    headers: {
      'X-RateLimit-Limit': String(config.max),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(resetTime),
    },
  });
  }
  
  return new Response(null, { status: 200 });
}

// Configure which routes this middleware runs on
// NOTE: SEO injection is now handled by serverless functions
// This middleware handles:
// 1. Rewriting static pages to serverless function (before static file serving)
// 2. Location variant redirects for /bookshop/* routes
// 3. Rate limiting for /api/* routes
export const config = {
  matcher: [
    '/',                 // Homepage - rewrite to static-pages.js
    '/directory',        // Static pages - rewrite to static-pages.js
    '/about',
    '/contact',
    '/events',
    '/blog',
    '/bookshop/:slug*',  // For location variant redirects only
    '/api/:path*',       // For rate limiting
  ],
  runtime: 'edge',
  // Exclude sitemap from middleware - it's a public resource that shouldn't be rate limited
  // The matcher above will still match /api/sitemap, but the middleware logic will pass it through
};
