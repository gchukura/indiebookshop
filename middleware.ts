// Vercel Edge Middleware for rate limiting and meta tag injection
// Uses Web API types compatible with Vercel Edge Functions

// Simple in-memory cache for bookshop data (Edge Middleware compatible)
// Cache expires after 5 minutes
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

// Cache for base HTML (index.html) - reduces origin fetches
let cachedBaseHtml: string | null = null;
let cachedBaseHtmlExpires = 0;
const BASE_HTML_CACHE_TTL = 60 * 1000; // 1 minute

function getCachedBaseHtml(): string | null {
  if (cachedBaseHtml && Date.now() < cachedBaseHtmlExpires) {
    return cachedBaseHtml;
  }
  cachedBaseHtml = null;
  return null;
}

function setCachedBaseHtml(html: string): void {
  cachedBaseHtml = html;
  cachedBaseHtmlExpires = Date.now() + BASE_HTML_CACHE_TTL;
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

// Constants for meta tag generation
const BASE_URL = 'https://www.indiebookshop.com';
// Enhanced template to meet 120+ character minimum for SEO
const DESCRIPTION_TEMPLATE = '{name} is an independent bookshop in {city}, {state}. Discover this local indie bookstore, browse their curated selection of books, and support independent bookselling in your community. Visit IndiebookShop.com to learn more about this bookshop and find similar indie bookstores near you.';

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
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="IndiebookShop.com" />
    <meta property="og:locale" content="en_US" />
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="${ogImageAlt}" />
    <meta name="twitter:image:width" content="1200" />
    <meta name="twitter:image:height" content="630" />
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

/**
 * Generate static SEO content for homepage (without dynamic bookshop links)
 */
function generateHomepageSeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Discover Independent Bookshops Across America</h1>
        <p>Welcome to IndiebookShop.com, the most comprehensive directory of independent bookshops in the United States and Canada. We feature over 3,000 carefully curated independent bookstores across all 50 states, helping book lovers discover unique literary spaces in their communities and while traveling.</p>
        <p>Independent bookshops are more than just stores—they are cultural hubs that foster community, support local economies, and celebrate the diversity of literature. Unlike chain stores, indie bookshops offer personalized recommendations, expert curation, and a sense of belonging that algorithms can never replicate.</p>
        <p>Our directory makes it easy to find independent bookshops by location, specialty, and features. Whether you're looking for a bookshop with a coffee shop, rare books, children's sections, or reading spaces, you can search our interactive map or browse by state, city, or category.</p>
        <p>Each bookshop listing includes detailed information about location, hours, contact information, and special features. Many listings also feature photos, descriptions, and links to bookshop websites and social media profiles.</p>
        <p>Supporting independent bookshops helps preserve literary culture and keeps money in local communities. When you shop at an indie bookstore, you're supporting local jobs, local authors, and the unique character of your neighborhood.</p>
        <nav>
          <a href="/directory">Browse All Bookshops</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
          <a href="/submit-bookshop">Add Your Bookshop</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate static SEO content for directory page
 */
function generateDirectorySeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Browse Our Directory of Independent Bookshops</h1>
        <p>Explore our comprehensive directory of over 3,000 independent bookshops across the United States and Canada. Use our interactive map to find bookshops near you, or browse by state, city, or specialty features.</p>
        <p>Our directory includes detailed information about each independent bookstore, including location, contact information, hours of operation, and special features like coffee shops, reading spaces, rare book collections, and children's sections.</p>
        <p>Whether you're looking for a cozy neighborhood bookshop, a large independent bookstore with extensive selections, or a specialty shop focusing on specific genres or interests, our directory helps you discover the perfect literary destination.</p>
        <p>Each bookshop page provides comprehensive details to help you plan your visit, including address, phone number, website links, and descriptions of what makes each shop unique. Many listings also include photos and links to bookshop events and social media profiles.</p>
        <p>Supporting independent bookshops strengthens local communities and preserves literary culture. When you shop at an indie bookstore, you're supporting local jobs, local authors, and the unique character of your neighborhood.</p>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
          <a href="/submit-bookshop">Add Your Bookshop</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate static SEO content for About page
 */
function generateAboutSeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>About IndiebookShop.com</h1>
        <p>IndiebookShop.com is dedicated to supporting and promoting independent bookshops across America. Our mission is to connect readers with local independent booksellers, helping preserve the unique character and community value that indie bookstores bring to neighborhoods nationwide.</p>
        <p>We believe that independent bookshops are essential cultural institutions that foster community, support local economies, and celebrate the diversity of literature. Unlike chain stores, indie bookshops offer personalized recommendations, expert curation, and a sense of belonging that creates lasting connections between readers and their local literary community.</p>
        <p>Our comprehensive directory features over 3,000 carefully curated independent bookstores across all 50 U.S. states and Canada. Each listing includes detailed information about location, hours, contact details, and special features, making it easy for book lovers to discover their next favorite bookshop.</p>
        <p>We work closely with bookshop owners and the independent bookselling community to ensure our directory is accurate and up-to-date. Bookshop owners can submit their stores or update existing listings to help readers find them.</p>
        <p>By supporting independent bookshops, we're helping preserve literary culture and keeping money in local communities. When you shop at an indie bookstore, you're supporting local jobs, local authors, and the unique character of your neighborhood.</p>
        <nav>
          <a href="/">Home</a>
          <a href="/directory">Browse Directory</a>
          <a href="/contact">Contact Us</a>
          <a href="/submit-bookshop">Add Your Bookshop</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate static SEO content for Contact page
 */
function generateContactSeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Contact IndiebookShop.com</h1>
        <p>We'd love to hear from you! Whether you have questions about our directory, want to submit or update a bookshop listing, have suggestions for improving our service, or just want to share your love of independent bookstores, we're here to help.</p>
        <p>Our team is committed to supporting the independent bookselling community and making it easier for readers to discover local bookshops. If you own or manage an independent bookstore, we can help you get listed in our directory or update your existing listing with current information, photos, and special features.</p>
        <p>If you notice any incorrect information in our directory, please let us know so we can keep our listings accurate and helpful for book lovers everywhere. We rely on the community to help us maintain the quality and completeness of our directory.</p>
        <p>For general inquiries, bookshop submissions, corrections, or feedback, please use our contact form. We typically respond within a few business days and appreciate your patience as we work to support the independent bookselling community.</p>
        <p>Thank you for supporting independent bookshops and helping us build the most comprehensive directory of indie bookstores in America. Together, we can help preserve the unique character and community value that independent bookshops bring to neighborhoods across the country.</p>
        <nav>
          <a href="/">Home</a>
          <a href="/directory">Browse Directory</a>
          <a href="/about">About Us</a>
          <a href="/submit-bookshop">Submit Bookshop</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate static SEO content for Events page
 */
function generateEventsSeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Independent Bookshop Events Calendar</h1>
        <p>Discover literary events happening at independent bookshops across America. Our events calendar features author readings, book signings, book clubs, poetry readings, children's story time, workshops, and other literary gatherings at indie bookstores nationwide.</p>
        <p>Independent bookshops are vibrant community hubs that host a wide variety of literary events throughout the year. From bestselling author appearances to local writer showcases, from book club discussions to children's story hours, indie bookstores offer unique opportunities to connect with authors, fellow readers, and your local literary community.</p>
        <p>Our events calendar makes it easy to find upcoming literary events near you. Browse by date, location, or event type to discover author readings, book signings, book clubs, poetry readings, workshops, and more happening at independent bookshops in your area.</p>
        <p>If you're a bookshop owner or event organizer, you can submit your upcoming events to our calendar to help readers discover your literary programming. We welcome submissions for author readings, book signings, book clubs, poetry readings, children's story time, workshops, and other literary events.</p>
        <p>Attending events at independent bookshops is a great way to support local booksellers, meet authors, discover new books, and connect with your local reading community. Check our calendar regularly to stay informed about literary events happening at indie bookstores near you.</p>
        <nav>
          <a href="/">Home</a>
          <a href="/directory">Browse Bookshops</a>
          <a href="/submit-event">Submit Event</a>
          <a href="/about">About Us</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate static SEO content for Blog page
 */
function generateBlogSeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Independent Bookshop Blog</h1>
        <p>Read stories, interviews, and insights about independent bookshops across America. Our blog celebrates the unique character, community value, and cultural importance of indie bookstores, featuring articles about local booksellers, author events, bookshop culture, and the literary community.</p>
        <p>Independent bookshops are more than just stores—they are cultural institutions that foster community, support local economies, and celebrate the diversity of literature. Our blog explores the stories behind these beloved community spaces, from the booksellers who curate their collections to the authors who visit, from the readers who gather for events to the communities that form around these literary hubs.</p>
        <p>Discover articles about the history of independent bookselling, profiles of notable indie bookshops, interviews with booksellers and authors, stories about bookshop cats and other bookstore traditions, and insights into how independent bookstores contribute to local culture and community.</p>
        <p>Whether you're a book lover, a bookseller, an author, or simply someone who appreciates the unique character of independent bookshops, our blog offers engaging content about the people, places, and stories that make indie bookstores special.</p>
        <p>Stay connected with the independent bookselling community through our blog, and discover the stories that celebrate the cultural importance and community value of independent bookshops across America.</p>
        <nav>
          <a href="/">Home</a>
          <a href="/directory">Browse Bookshops</a>
          <a href="/events">View Events</a>
          <a href="/about">About Us</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Inject SEO body content into HTML before the root div
 */
function injectSeoBodyContent(html: string, seoContent: string): string {
  if (!html || !seoContent) return html;
  
  // Check if SEO content is already injected
  if (html.includes('<!-- Server-side injected SEO body content -->')) {
    return html;
  }
  
  // Find <div id="root"> and inject before it
  const rootDivPattern = /<div\s+id=["']root["'][^>]*>/i;
  const rootDivMatch = html.match(rootDivPattern);
  
  if (rootDivMatch) {
    const rootDivTag = rootDivMatch[0];
    const seoContentWithMarker = `<!-- Server-side injected SEO body content -->\n${seoContent}`;
    html = html.replace(rootDivTag, seoContentWithMarker + '\n' + rootDivTag);
  } else if (html.includes('</body>')) {
    // Fallback: inject before </body>
    html = html.replace('</body>', `<!-- Server-side injected SEO body content -->\n${seoContent}\n</body>`);
  }
  
  return html;
}

export async function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Handle SEO content injection for static pages
  const staticPages: Record<string, () => string> = {
    '/': generateHomepageSeoContent,
    '/directory': generateDirectorySeoContent,
    '/about': generateAboutSeoContent,
    '/contact': generateContactSeoContent,
    '/events': generateEventsSeoContent,
    '/blog': generateBlogSeoContent,
  };
  
  const seoContentGenerator = staticPages[pathname];
  if (seoContentGenerator) {
    try {
      // Get cached HTML or fetch from origin
      let html = getCachedBaseHtml();
      
      if (!html) {
        // In Vercel Edge Middleware, fetching from origin can create loops
        // Instead, we'll use NextResponse.rewrite() pattern or fetch with special handling
        // Try fetching from a path that doesn't match our matcher
        let htmlResponse: Response | null = null;
        
        // Strategy: Fetch from /index.html which is NOT in our matcher
        // This should bypass the middleware and get the static file directly
        try {
          const fetchUrl = new URL(request.url);
          fetchUrl.pathname = '/index.html';
          // Remove search params to avoid issues
          fetchUrl.search = '';
          
          // Use a fresh request to avoid middleware loops
          htmlResponse = await fetch(fetchUrl.toString(), {
            method: 'GET',
            headers: {
              'Accept': 'text/html',
              // Don't include User-Agent to avoid triggering middleware
            },
            // Use cache: 'default' to allow caching but prevent loops
            cache: 'default',
          });
          
          // Log for debugging
          if (htmlResponse.ok) {
            console.log(`[Edge Middleware] Successfully fetched /index.html for ${pathname}`);
          } else {
            console.warn(`[Edge Middleware] Failed to fetch /index.html, status: ${htmlResponse.status}`);
          }
        } catch (error) {
          console.error(`[Edge Middleware] Error fetching /index.html for ${pathname}:`, error);
        }
        
        if (!htmlResponse || !htmlResponse.ok) {
          console.error(`[Edge Middleware] Cannot fetch HTML for ${pathname}, passing through`);
          // Pass through - let Vercel serve the static file
          // The SEO content won't be injected, but the page will still work
          return new Response(null, { status: 200 });
        }
        
        html = await htmlResponse.text();
        
        // Verify we got valid HTML
        if (!html || !html.includes('<!DOCTYPE html>')) {
          console.error(`[Edge Middleware] Invalid HTML for ${pathname}, length: ${html?.length || 0}`);
          return new Response(null, { status: 200 });
        }
        
        // Verify it has the root div (needed for injection)
        if (!html.includes('<div id="root">') && !html.includes('<div id=\'root\'>')) {
          console.warn(`[Edge Middleware] HTML missing root div for ${pathname}`);
        }
        
        setCachedBaseHtml(html);
        console.log(`[Edge Middleware] Cached HTML for ${pathname}, length: ${html.length}`);
      }
      
      // Generate and inject SEO content
      const seoContent = seoContentGenerator();
      const modifiedHtml = injectSeoBodyContent(html, seoContent);
      
      return new Response(modifiedHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    } catch (error) {
      console.error('Error injecting SEO content for static page:', error);
      return new Response(null, { status: 200 });
    }
  }
  
  // Handle meta tag injection for /bookshop/* routes
  if (pathname.startsWith('/bookshop/')) {
    const slug = pathname.split('/').pop();
    
    if (!slug) {
      return new Response(null, { status: 200 });
    }
    
    // OPTIMIZATION: Check cache first
    let bookshop = getCachedBookshop(slug);
    
    if (!bookshop) {
      // Fetch bookshop data from Supabase
      bookshop = await fetchBookshopBySlug(slug);
      
      if (!bookshop) {
        // Bookshop not found - pass through to 404
        return new Response(null, { status: 200 });
      }
      
      // Cache the result
      setCachedBookshop(slug, bookshop);
    }
    
    // Generate meta tags
    const metaTags = generateBookshopMetaTags(bookshop);
    
    // OPTIMIZATION: Use cached base HTML if available
    let html = getCachedBaseHtml();
    
    if (!html) {
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

        html = await htmlResponse.text();
        
        // Cache the base HTML
        setCachedBaseHtml(html);
      } catch (error) {
        console.error('Error fetching HTML for meta tag injection:', error);
        // Pass through on error
        return new Response(null, { status: 200 });
      }
    }
      
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
export const config = {
  matcher: [
    '/',
    '/directory',
    '/about',
    '/contact',
    '/events',
    '/blog',
    '/bookshop/:slug*',
    '/api/:path*',
  ],
  runtime: 'edge',
  // Exclude sitemap from middleware - it's a public resource that shouldn't be rate limited
  // The matcher above will still match /api/sitemap, but the middleware logic will pass it through
};
