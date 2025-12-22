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
    // Fetch all live bookstores using Supabase REST API with pagination
    // Note: We fetch all because we don't have a slug column indexed
    // This could be optimized by adding a slug column to Supabase
    const allBookstores = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/bookstores?live=eq.true&select=*&order=name&limit=${pageSize}&offset=${from}`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact',
          },
        }
      );
      
      if (!response.ok) {
        console.error('Failed to fetch bookstores from Supabase:', response.status);
        break;
      }
      
      const bookstores = await response.json();
      
      if (!bookstores || bookstores.length === 0) {
        hasMore = false;
        break;
      }
      
      allBookstores.push(...bookstores);
      from += pageSize;
      // If we got fewer than pageSize, we've reached the end
      hasMore = bookstores.length === pageSize;
    }
    
    if (allBookstores.length === 0) {
      console.log(`[Serverless Function] No bookstores found in Supabase`);
      return null;
    }
    
    console.log(`[Serverless Function] Fetched ${allBookstores.length} bookstores from Supabase`);
    
    // Find bookshop by matching slug
    const bookshop = allBookstores.find((b) => {
      const bookshopSlug = generateSlugFromName(b.name);
      return bookshopSlug === slug;
    });
    
    if (!bookshop) {
      console.log(`[Serverless Function] Bookshop not found for slug: ${slug}`);
      return null;
    }
    
    console.log(`[Serverless Function] Found bookshop: ${bookshop.name} (ID: ${bookshop.id})`);
    
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
    
    // Extract slug from request
    // When Vercel routes /bookshop/powell-books to /api/bookshop-slug.js,
    // the original path should be in x-vercel-original-path header
    let slug = null;
    
    // Method 1: Try to get from x-vercel-original-path header (set by vercel.json route)
    // Vercel may lowercase headers, so check both cases
    const originalPath = req.headers['x-vercel-original-path'] || 
                         req.headers['x-vercel-original-path'.toLowerCase()] ||
                         req.headers['x-invoke-path'] ||
                         req.headers['x-invoke-path'.toLowerCase()] ||
                         req.headers['x-vercel-rewrite-path'] ||
                         req.headers['x-vercel-rewrite-path'.toLowerCase()];
    
    console.log('[Serverless Function] Original path header (case-sensitive):', req.headers['x-vercel-original-path']);
    console.log('[Serverless Function] Original path header (lowercase):', req.headers['x-vercel-original-path'.toLowerCase()]);
    console.log('[Serverless Function] All x-vercel headers:', JSON.stringify(
      Object.keys(req.headers).filter(k => k.toLowerCase().includes('vercel') || k.toLowerCase().includes('invoke'))
        .reduce((acc, k) => { acc[k] = req.headers[k]; return acc; }, {}), null, 2
    ));
    
    if (originalPath) {
      console.log('[Serverless Function] Original path from header:', originalPath);
      const match = originalPath.match(/^\/bookshop\/([^/]+)/);
      if (match) {
        slug = decodeURIComponent(match[1]);
        console.log('[Serverless Function] Extracted slug from header:', slug);
      } else {
        console.log('[Serverless Function] Original path did not match /bookshop/ pattern:', originalPath);
      }
    } else {
      console.log('[Serverless Function] No original path header found');
    }
    
    // Method 2: Extract from req.url pathname
    if (!slug) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;
      console.log('[Serverless Function] Request URL pathname:', pathname);
      
      if (pathname.startsWith('/api/bookshop-slug')) {
        // If we're at /api/bookshop-slug.js, try to get slug from query or referer
        slug = url.searchParams.get('slug') || req.query?.slug;
        console.log('[Serverless Function] Extracted slug from query:', slug);
      } else if (pathname.startsWith('/bookshop/')) {
        slug = decodeURIComponent(pathname.replace('/bookshop/', '').split('/')[0]);
        console.log('[Serverless Function] Extracted slug from pathname:', slug);
      }
    }
    
    // Method 3: Try referer header as last resort
    if (!slug && req.headers.referer) {
      const refererMatch = req.headers.referer.match(/\/bookshop\/([^/?#]+)/);
      if (refererMatch) {
        slug = decodeURIComponent(refererMatch[1]);
        console.log('[Serverless Function] Extracted slug from referer:', slug);
      }
    }
    
    console.log('[Serverless Function] Final extracted slug:', slug);
    
    // If no slug, just return base HTML (let React handle routing)
    if (!slug || slug === 'bookshop' || slug === 'api' || slug === 'bookshop-slug' || slug === 'bookshop-slug.js') {
      console.log('[Serverless Function] No valid slug found, returning base HTML');
      // Return minimal HTML that React can hydrate
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).send('<!DOCTYPE html><html><head><title>IndiebookShop</title></head><body><div id="root"></div><script src="/assets/index.js"></script></body></html>');
    }
    
    // Always fetch base HTML first (for fallback)
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.indiebookshop.com';
    const baseUrl = `${protocol}://${host}`;
    let baseHtml = null;
    
    try {
      console.log('[Serverless Function] Fetching base HTML from:', baseUrl);
      const htmlResponse = await fetch(`${baseUrl}/`, {
        headers: {
          'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
          'Accept': 'text/html',
        },
      });
      
      if (htmlResponse.ok) {
        baseHtml = await htmlResponse.text();
        console.log('[Serverless Function] Base HTML fetched, length:', baseHtml?.length || 0);
      } else {
        console.error('[Serverless Function] Failed to fetch base HTML, status:', htmlResponse.status);
      }
    } catch (error) {
      console.error('[Serverless Function] Error fetching base HTML:', error);
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
      // Use shorter cache for now to ensure fresh content during testing
      // Can increase to 'public, s-maxage=3600, stale-while-revalidate=86400' once verified
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
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

