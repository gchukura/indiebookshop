// Vercel Edge Middleware for rate limiting and meta tag injection
// Uses Web API types compatible with Vercel Edge Functions

// Rate limiting storage (in-memory for Edge Middleware)
// In production, consider using Upstash Redis for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

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

// Constants for meta tag generation
const BASE_URL = 'https://indiebookshop.com';
const DESCRIPTION_TEMPLATE = '{name} is an independent bookshop in {city}, {state}. Discover events, specialty offerings, and more information about this local bookshop at IndiebookShop.com.';

/**
 * Generate a slug from a bookshop name (must match client-side logic)
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
 * Escape HTML entities to prevent XSS and ensure valid HTML
 */
function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 */
function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate meta tags HTML for a bookshop detail page
 */
function generateBookshopMetaTags(bookshop: any): string {
  // Generate canonical slug
  const slug = generateSlugFromName(bookshop.name);
  const canonicalUrl = `${BASE_URL}/bookshop/${slug}`;
  
  // Generate title
  const title = `${bookshop.name} | Independent Bookshop in ${bookshop.city}`;
  const fullTitle = `${title} | IndiebookShop.com`;
  const escapedTitle = escapeHtml(fullTitle);
  
  // Generate description
  let description = bookshop.description || '';
  if (!description || description.trim() === '') {
    // Use template if no description
    description = DESCRIPTION_TEMPLATE
      .replace('{name}', bookshop.name)
      .replace('{city}', bookshop.city || '')
      .replace('{state}', bookshop.state || '');
  }
  // Truncate to 160 characters (recommended max for meta descriptions)
  description = truncate(description, 160);
  const escapedDescription = escapeHtml(description);
  
  // Generate image URL
  const ogImage = bookshop.image_url || bookshop.imageUrl || `${BASE_URL}/images/default-bookshop.jpg`;
  const ogImageAlt = escapeHtml(`${bookshop.name} - Independent bookshop in ${bookshop.city}, ${bookshop.state}`);
  
  // Generate keywords
  const keywords = [
    bookshop.name,
    `${bookshop.name} bookshop`,
    `independent bookshop ${bookshop.city}`,
    `indie bookshop ${bookshop.city}`,
    `bookshops in ${bookshop.city}`,
    `${bookshop.city} ${bookshop.state} bookshops`,
    `independent bookshops ${bookshop.state}`
  ].filter(Boolean).join(', ');
  
  // Build meta tags HTML
  const metaTags = `
    <!-- Server-side injected meta tags for SEO -->
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <meta name="keywords" content="${escapeHtml(keywords)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${canonicalUrl}" />
    
    <!-- Open Graph Tags -->
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:alt" content="${ogImageAlt}" />
    <meta property="og:site_name" content="IndiebookShop.com" />
    <meta property="og:locale" content="en_US" />
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="${ogImageAlt}" />
    <meta name="twitter:site" content="@indiebookshop" />
  `;
  
  return metaTags;
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
    // Fetch all live bookstores and find by slug
    // Note: We can't use a slug index in edge runtime, so we fetch and filter
    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookstores?live=eq.true&select=*`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      console.error('Failed to fetch bookstores from Supabase:', response.status);
      return null;
    }
    
    const bookstores = await response.json();
    
    // Find bookshop by matching slug
    const bookshop = bookstores.find((b: any) => {
      const bookshopSlug = generateSlugFromName(b.name);
      return bookshopSlug === slug;
    });
    
    if (!bookshop) {
      return null;
    }
    
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
 * Inject meta tags into HTML
 */
function injectMetaTags(html: string, metaTags: string): string {
  // Find the closing </head> tag and inject meta tags before it
  if (html.includes('</head>')) {
    return html.replace('</head>', `${metaTags}</head>`);
  }
  
  // If no </head> tag found, try to inject after <head>
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${metaTags}`);
  }
  
  // Fallback: inject at the beginning of the body
  if (html.includes('<body>')) {
    return html.replace('<body>', `<head>${metaTags}</head><body>`);
  }
  
  // Last resort: prepend to HTML
  return `${metaTags}${html}`;
}

export async function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Handle meta tag injection for /bookshop/* routes
  if (pathname.startsWith('/bookshop/')) {
    const slug = pathname.split('/').pop();
    
    if (!slug) {
      return new Response(null, { status: 200 });
    }
    
    // Fetch bookshop data from Supabase
    const bookshop = await fetchBookshopBySlug(slug);
    
    if (!bookshop) {
      // Bookshop not found - pass through to 404
      return new Response(null, { status: 200 });
    }
    
    // Generate meta tags
    const metaTags = generateBookshopMetaTags(bookshop);
    
    // For Vercel Edge Middleware, we need to fetch the HTML from the origin
    // and inject meta tags before returning it
    try {
      // Construct URL to fetch the index.html
      // In Vercel, static files are served from the root
      const originUrl = new URL(request.url);
      originUrl.pathname = '/';
      
      // Fetch the index.html from the origin
      const htmlResponse = await fetch(originUrl.toString(), {
        headers: {
          'User-Agent': request.headers.get('User-Agent') || '',
          'Accept': 'text/html',
        },
      });
      
      if (!htmlResponse.ok) {
        // If we can't fetch the HTML, pass through
    return new Response(null, { status: 200 });
  }

      const html = await htmlResponse.text();
      
      // Inject meta tags
      const modifiedHtml = injectMetaTags(html, metaTags);
      
      // Return modified HTML
      return new Response(modifiedHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    } catch (error) {
      console.error('Error fetching HTML for meta tag injection:', error);
      // Pass through on error
      return new Response(null, { status: 200 });
    }
  }
  
  // Handle rate limiting for API routes
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
export const config = {
  matcher: [
    '/bookshop/:slug*',
    '/api/:path*',
  ],
  runtime: 'edge',
};
