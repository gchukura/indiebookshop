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
  if (!html || typeof html !== 'string') {
    console.error('[Serverless] injectMetaTags: Invalid HTML input');
    return html;
  }
  
  console.log('[Serverless] Injecting meta tags, HTML length:', html.length);
  console.log('[Serverless] Meta tags to inject (first 200 chars):', metaTags.substring(0, 200));
  
  // Check if meta tags are already injected (avoid duplicates)
  if (html.includes('<!-- Server-side injected meta tags for SEO -->')) {
    console.log('[Serverless] Meta tags already injected, skipping');
    return html;
  }
  
  // Extract just the title from metaTags (metaTags includes title + all meta tags)
  const titleMatch = metaTags.match(/<title>(.*?)<\/title>/i);
  const titleOnly = titleMatch ? titleMatch[0] : '';
  const metaTagsWithoutTitle = metaTags.replace(/<title>.*?<\/title>/i, '').trim();
  
  console.log('[Serverless] Title to inject:', titleOnly.substring(0, 100));
  console.log('[Serverless] Meta tags (without title) length:', metaTagsWithoutTitle.length);
  
  // Step 1: Replace the default title if it exists
  if (titleOnly) {
    const titleReplaced = html.replace(/<title>.*?<\/title>/i, titleOnly);
    if (titleReplaced !== html) {
      console.log('[Serverless] Replaced title tag');
      html = titleReplaced;
    } else {
      console.log('[Serverless] No existing title tag found, will inject new one');
    }
  }
  
  // Step 2: Inject meta tags (without title) before closing </head> tag
  if (html.includes('</head>')) {
    // Check if title was already in metaTags and we need to add it
    if (titleOnly && !html.includes(titleOnly)) {
      // Title wasn't replaced, inject it with meta tags
      html = html.replace('</head>', `${metaTags}</head>`);
      console.log('[Serverless] Injected title + meta tags before </head> tag');
    } else {
      // Title was already replaced, just inject meta tags
      html = html.replace('</head>', `${metaTagsWithoutTitle}</head>`);
      console.log('[Serverless] Injected meta tags (without title) before </head> tag');
    }
  } else if (html.includes('<head>')) {
    // If no closing head tag, inject after opening head tag
    html = html.replace('<head>', `<head>${metaTags}`);
    console.log('[Serverless] Injected meta tags after <head> tag');
  } else {
    console.error('[Serverless] No <head> tag found in HTML!');
    // Last resort: prepend to HTML
    html = `${metaTags}${html}`;
  }
  
  // Verify injection worked
  if (html.includes('<!-- Server-side injected meta tags for SEO -->')) {
    console.log('[Serverless] Meta tags successfully injected');
    // Verify canonical tag is present
    if (html.includes('<link rel="canonical"')) {
      console.log('[Serverless] Canonical tag verified in HTML');
    } else {
      console.error('[Serverless] WARNING: Canonical tag not found in HTML!');
    }
  } else {
    console.error('[Serverless] WARNING: Meta tags may not have been injected correctly');
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
    console.log('[Serverless] ===== FUNCTION INVOKED =====');
    console.log('[Serverless] Request URL:', req.url);
    console.log('[Serverless] Request method:', req.method);
    console.log('[Serverless] Query object:', JSON.stringify(req.query));
    
    // Get slug from query parameter OR header (rewrite may not be working, fallback to header)
    let slug = req.query.slug;
    
    // Handle array case
    if (Array.isArray(slug)) {
      slug = slug[0];
    }
    
    // Fallback: Extract from x-vercel-original-path header if query is empty
    if (!slug) {
      const originalPath = req.headers['x-vercel-original-path'];
      console.log('[Serverless] No slug in query, checking header:', originalPath);
      if (originalPath) {
        const match = originalPath.match(/^\/bookshop\/([^/]+)/);
        if (match) {
          slug = decodeURIComponent(match[1]);
          console.log('[Serverless] Extracted slug from header:', slug);
        }
      }
    }
    
    console.log('[Serverless] Final slug:', slug);
    
    // Validate slug
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      console.log('[Serverless] ERROR: No valid slug found');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).send('<!DOCTYPE html><html><head><title>IndiebookShop</title></head><body><div id="root"></div><script src="/assets/index.js"></script></body></html>');
    }
    
    // Decode slug in case it's URL encoded
    const decodedSlug = decodeURIComponent(slug.trim());
    console.log('[Serverless] Using slug:', decodedSlug);
    
    // Fetch bookshop data from Supabase
    console.log('[Serverless] Fetching bookshop for slug:', decodedSlug);
    const bookshop = await fetchBookshopBySlug(decodedSlug);
    console.log('[Serverless] Bookshop found:', !!bookshop);
    
    // If bookshop not found, return base HTML (let React handle 404)
    if (!bookshop) {
      console.log('[Serverless] Bookshop not found for slug:', decodedSlug, '- returning base HTML');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).send('<!DOCTYPE html><html><head><title>IndiebookShop</title></head><body><div id="root"></div><script src="/assets/index.js"></script></body></html>');
    }
    
    // Generate meta tags
    console.log('[Serverless] Generating meta tags for:', bookshop.name);
    const metaTags = generateBookshopMetaTags(bookshop);
    console.log('[Serverless] Meta tags generated, length:', metaTags.length);
    
    // Fetch base HTML to inject meta tags into
    // Use internal Vercel URL to avoid recursive calls
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.indiebookshop.com';
    const baseUrl = `${protocol}://${host}`;
    let baseHtml = null;
    
    try {
      // Fetch from root path - this should return the static index.html
      // Add a header to prevent it from being routed back to this function
      console.log('[Serverless] Fetching base HTML from:', `${baseUrl}/`);
      const htmlResponse = await fetch(`${baseUrl}/`, {
        headers: {
          'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
          'Accept': 'text/html',
          'X-Internal-Request': 'true', // Prevent routing back to this function
        },
      });
      
      if (htmlResponse.ok) {
        baseHtml = await htmlResponse.text();
        console.log('[Serverless] Base HTML fetched successfully, length:', baseHtml?.length || 0);
        
        // Verify we got actual HTML
        if (!baseHtml || baseHtml.length < 100) {
          console.error('[Serverless] Base HTML seems too short, might be an error page');
          baseHtml = null;
        } else if (!baseHtml.includes('<head>') && !baseHtml.includes('<!DOCTYPE')) {
          console.error('[Serverless] Base HTML doesn\'t look like valid HTML');
          baseHtml = null;
        }
      } else {
        console.error('[Serverless] Failed to fetch base HTML, status:', htmlResponse.status);
      }
    } catch (error) {
      console.error('[Serverless] Error fetching base HTML:', error);
      console.error('[Serverless] Error details:', error.message, error.stack);
    }
    
    // Inject meta tags into base HTML
    if (baseHtml) {
      console.log('[Serverless] Injecting meta tags into base HTML');
      const modifiedHtml = injectMetaTags(baseHtml, metaTags);
      console.log('[Serverless] Meta tags injected, returning modified HTML');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).send(modifiedHtml);
    }
    
    // Fallback: return basic HTML with meta tags if we couldn't fetch base HTML
    console.log('[Serverless] Could not fetch base HTML, using fallback HTML with meta tags');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(
      `<!DOCTYPE html><html><head>${metaTags}</head><body><div id="root"></div><script src="/assets/index.js"></script></body></html>`
    );
  } catch (error) {
    console.error('[Serverless] ERROR in bookshop function:', error);
    console.error('[Serverless] Error stack:', error.stack);
    // Return base HTML on error to let React handle it
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(200).send('<!DOCTYPE html><html><head><title>IndiebookShop</title></head><body><div id="root"></div><script src="/assets/index.js"></script></body></html>');
  }
}

