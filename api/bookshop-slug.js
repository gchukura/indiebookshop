// Vercel Serverless Function for server-side meta tag injection on /bookshop/* routes
// Using Node.js runtime instead of Edge Function for better compatibility

// Note: This uses the Supabase REST API directly for compatibility

// Constants for meta tag generation
const BASE_URL = 'https://indiebookshop.com';
const DESCRIPTION_TEMPLATE = '{name} is an independent bookshop in {city}, {state}. Discover events, specialty offerings, and more information about this local bookshop at IndiebookShop.com.';

/**
 * Generate a slug from a bookshop name (must match client-side logic)
 */
function generateSlugFromName(name) {
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
function escapeHtml(text) {
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
function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate meta tags HTML for a bookshop detail page
 */
function generateBookshopMetaTags(bookshop) {
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
 * Inject meta tags into HTML
 */
function injectMetaTags(html, metaTags) {
  // Replace the default title if it exists
  html = html.replace(/<title>.*?<\/title>/i, metaTags);
  
  // Also inject before closing </head> tag as backup
  if (html.includes('</head>')) {
    // Check if meta tags are already injected (avoid duplicates)
    if (!html.includes('<!-- Server-side injected meta tags for SEO -->')) {
      html = html.replace('</head>', `${metaTags}</head>`);
    }
  } else if (html.includes('<head>')) {
    // If no closing head tag, inject after opening head tag
    html = html.replace('<head>', `<head>${metaTags}`);
  }
  
  return html;
}

/**
 * Fetch bookshop data from Supabase by slug using REST API
 * Uses direct fetch to Supabase REST API (compatible with edge runtime)
 */
async function fetchBookshopBySlug(slug) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables not set in edge function');
    return null;
  }
  
  try {
    // Fetch all live bookstores using Supabase REST API
    // Note: We fetch all because we don't have a slug column indexed
    // This could be optimized by adding a slug column to Supabase
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
    
    if (!bookstores || bookstores.length === 0) {
      return null;
    }
    
    // Find bookshop by matching slug
    const bookshop = bookstores.find((b) => {
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
 * Main handler for /bookshop/:slug routes
 * Node.js serverless function (not Edge Function) for better compatibility
 */
export default async function handler(req, res) {
  try {
    // Log all request details for debugging
    console.log('[Serverless Function] ===== BOOKSHOP SLUG FUNCTION CALLED =====');
    console.log('[Serverless Function] Request URL:', req.url);
    console.log('[Serverless Function] Request method:', req.method);
    console.log('[Serverless Function] Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('[Serverless Function] Request query:', req.query);
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    console.log('[Serverless Function] Parsed pathname:', pathname);
    console.log('[Serverless Function] Parsed search params:', url.searchParams.toString());
    
    // Extract slug from pathname
    // Route rewrite: /bookshop/113-books -> /api/bookshop-slug
    // Vercel should pass the original path in headers or we extract from referer
    let slug = null;
    
    // Method 1: Try to get from x-vercel-original-path or x-invoke-path header
    const originalPath = req.headers['x-vercel-original-path'] || 
                         req.headers['x-invoke-path'] ||
                         req.headers['x-vercel-rewrite-path'];
    
    if (originalPath) {
      console.log('[Serverless Function] Original path from header:', originalPath);
      const match = originalPath.match(/^\/bookshop\/([^/]+)/);
      if (match) {
        slug = match[1];
      }
    }
    
    // Method 2: Extract from pathname if it contains /bookshop/
    if (!slug) {
    if (pathname.startsWith('/api/bookshop/')) {
      slug = pathname.replace('/api/bookshop/', '').split('/')[0];
    } else if (pathname.startsWith('/bookshop/')) {
      slug = pathname.replace('/bookshop/', '').split('/')[0];
      }
    }
    
    // Method 3: Try query parameter (fallback)
    if (!slug) {
      slug = url.searchParams.get('slug') || req.query?.slug;
    }
    
    console.log('[Serverless Function] Extracted slug:', slug);
    
    // Always fetch base HTML first (for fallback)
    const baseUrl = url.origin || `https://${req.headers.host}`;
    let baseHtml = null;
    
    try {
      console.log('[Serverless Function] Fetching base HTML from:', baseUrl);
      const htmlResponse = await fetch(`${baseUrl}/`, {
        headers: {
          'User-Agent': req.headers['user-agent'] || '',
          'Accept': 'text/html',
        },
      });
      
      if (htmlResponse.ok) {
        baseHtml = await htmlResponse.text();
      }
    } catch (error) {
      console.error('[Serverless Function] Error fetching base HTML:', error);
    }
    
    // If no slug, just return base HTML (let React handle routing)
    if (!slug || slug === 'bookshop' || slug === 'api' || slug === 'bookshop-slug') {
      console.log('[Serverless Function] No valid slug found, returning base HTML');
      if (baseHtml) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(baseHtml);
      }
      // Fallback if we can't fetch base HTML
      return res.status(200).send('<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>');
    }
    
    // Fetch bookshop data from Supabase
    console.log('[Serverless Function] Fetching bookshop for slug:', slug);
    const bookshop = await fetchBookshopBySlug(slug);
    console.log('[Serverless Function] Bookshop found:', !!bookshop);
    
    // If bookshop not found, return base HTML (let React handle 404)
    if (!bookshop) {
      console.log('[Serverless Function] Bookshop not found for slug:', slug, '- returning base HTML');
      if (baseHtml) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(baseHtml);
      }
      // Fallback if we can't fetch base HTML
      return res.status(200).send('<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>');
    }
    
    // Generate meta tags
    console.log('[Serverless Function] Generating meta tags for:', bookshop.name);
    const metaTags = generateBookshopMetaTags(bookshop);
    console.log('[Serverless Function] Meta tags generated, length:', metaTags.length);
    
    // Inject meta tags into base HTML
    if (baseHtml) {
      console.log('[Serverless Function] Injecting meta tags into base HTML');
      const modifiedHtml = injectMetaTags(baseHtml, metaTags);
      console.log('[Serverless Function] Meta tags injected, returning modified HTML');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(modifiedHtml);
    }
    
    // Fallback: return basic HTML with meta tags if we couldn't fetch base HTML
    console.error('[Serverless Function] Could not fetch base HTML, using fallback');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(
      `<!DOCTYPE html><html><head>${metaTags}</head><body><div id="root"></div><script src="/assets/index.js"></script></body></html>`
    );
  } catch (error) {
    console.error('[Serverless Function] Error in bookshop function:', error);
    return res.status(500).send('Internal Server Error');
  }
}

