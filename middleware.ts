// Vercel Edge Middleware for rate limiting
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

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Only apply rate limiting to API routes
  if (!pathname.startsWith('/api')) {
    return new Response(null, { status: 200 });
  }

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
  // The headers will be added by Vercel's infrastructure
  return new Response(null, {
    status: 200,
    headers: {
      'X-RateLimit-Limit': String(config.max),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(resetTime),
    },
  });
}

// Configure which routes this middleware runs on
// Vercel will automatically detect this file and apply it to matching routes
export const config = {
  matcher: [
    '/api/:path*',
  ],
};

