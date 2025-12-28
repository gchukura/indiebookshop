// Vercel Serverless Function for server-side meta tag injection on /bookshop/* routes
// Using Node.js runtime instead of Edge Function for better compatibility

// Note: This uses the Supabase REST API directly for compatibility

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Script paths will be loaded dynamically (generated at build time)
let scriptPathsCache = null;

async function loadScriptPaths() {
  if (scriptPathsCache) {
    return scriptPathsCache;
  }
  
  try {
    const scriptPaths = await import('./script-paths.js');
    scriptPathsCache = {
      SCRIPT_PATH: scriptPaths.SCRIPT_PATH || '/assets/index.js',
      CSS_PATH: scriptPaths.CSS_PATH || null
    };
    console.log('[Serverless] Loaded script paths from build config:', scriptPathsCache.SCRIPT_PATH);
    return scriptPathsCache;
  } catch (error) {
    console.log('[Serverless] Could not import script-paths.js, using defaults:', error.message);
    scriptPathsCache = {
      SCRIPT_PATH: '/assets/index.js',
      CSS_PATH: null
    };
    return scriptPathsCache;
  }
}

// Constants for meta tag generation
const BASE_URL = 'https://www.indiebookshop.com';
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

// Simple in-memory cache to reduce database queries
// Key: slug, Value: { bookshop, timestamp }
const slugCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch bookshop data from Supabase by slug using REST API
 * Uses direct fetch to Supabase REST API (compatible with edge runtime)
 * OPTIMIZED: Stops early when match is found, uses caching, limits query size
 */
async function fetchBookshopBySlug(slug) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables not set in edge function');
    return null;
  }
  
  // Check cache first
  const cached = slugCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Serverless] Cache hit for slug: ${slug}`);
    return cached.bookshop;
  }
  
  try {
    // CRITICAL FIX: Query in batches but STOP EARLY when we find a match
    // This dramatically reduces database egress
    const pageSize = 500; // Smaller pages for faster early exit
    const maxPages = 5; // Limit to 5 pages max (2500 bookstores) to prevent runaway queries
    let from = 0;
    let pageCount = 0;
    
    while (pageCount < maxPages) {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/bookstores?live=eq.true&select=id,name,city,state,street,zip,description,phone,website,image_url,lat_numeric,lng_numeric,feature_ids&order=name&limit=${pageSize}&offset=${from}`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        console.error('[Serverless] Failed to fetch bookstores from Supabase:', response.status);
        break;
      }
      
      const bookstores = await response.json();
      
      if (!bookstores || bookstores.length === 0) {
        break; // No more bookstores
      }
      
      // Search for matching slug in this batch
      const bookshop = bookstores.find((b) => {
        const bookshopSlug = generateSlugFromName(b.name);
        return bookshopSlug === slug;
      });
      
      if (bookshop) {
        console.log(`[Serverless] Found bookshop: ${bookshop.name} (ID: ${bookshop.id}) after querying ${from + bookstores.length} bookstores`);
        
        // Map Supabase column names to expected format
        const mappedBookshop = {
          ...bookshop,
          latitude: bookshop.lat_numeric?.toString() || bookshop.latitude || null,
          longitude: bookshop.lng_numeric?.toString() || bookshop.longitude || null,
          featureIds: bookshop.feature_ids || bookshop.featureIds || [],
          imageUrl: bookshop.image_url || bookshop.imageUrl || null,
        };
        
        // Cache the result
        slugCache.set(slug, { bookshop: mappedBookshop, timestamp: Date.now() });
        
        // Clean up old cache entries (keep cache size reasonable)
        if (slugCache.size > 1000) {
          const oldestKey = slugCache.keys().next().value;
          slugCache.delete(oldestKey);
        }
        
        return mappedBookshop;
      }
      
      // If we got fewer than pageSize, we've reached the end
      if (bookstores.length < pageSize) {
        break;
      }
      
      from += pageSize;
      pageCount++;
    }
    
    console.log(`[Serverless] Bookshop not found for slug: ${slug} (searched ${from} bookstores)`);
    return null;
  } catch (error) {
    console.error('[Serverless] Error fetching bookshop from Supabase:', error);
    return null;
  }
}

/**
 * Main handler for /bookshop/:slug routes
 * Node.js serverless function (not Edge Function) for better compatibility
 */
export default async function handler(req, res) {
  // Load script paths early so we can use them in error handlers
  let scriptPaths = null;
  try {
    scriptPaths = await loadScriptPaths();
  } catch (error) {
    console.error('[Serverless] Failed to load script paths:', error);
    scriptPaths = { SCRIPT_PATH: '/assets/index.js', CSS_PATH: null };
  }
  
  const getFallbackHtml = () => {
    const cssLink = scriptPaths?.CSS_PATH ? `<link rel="stylesheet" crossorigin href="${scriptPaths.CSS_PATH}">` : '';
    return `<!DOCTYPE html><html><head><title>IndiebookShop</title>${cssLink}</head><body><div id="root"></div><script type="module" crossorigin src="${scriptPaths?.SCRIPT_PATH || '/assets/index.js'}"></script></body></html>`;
  };
  
  try {
    console.log('[Serverless] ===== FUNCTION INVOKED =====');
    console.log('[Serverless] Request URL:', req.url);
    console.log('[Serverless] Request method:', req.method);
    console.log('[Serverless] Query object:', JSON.stringify(req.query));
    console.log('[Serverless] Headers:', JSON.stringify(Object.keys(req.headers)));
    
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
      return res.status(200).send(getFallbackHtml());
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
      return res.status(200).send(getFallbackHtml());
    }
    
    // Generate meta tags
    console.log('[Serverless] Generating meta tags for:', bookshop.name);
    const metaTags = generateBookshopMetaTags(bookshop);
    console.log('[Serverless] Meta tags generated, length:', metaTags.length);
    
    // Try to read the built index.html file to get correct script paths
    // Vite generates hashed filenames that change with each build
    let baseHtml = null;
    
    // Try multiple possible paths for the built index.html
    const possiblePaths = [
      join(process.cwd(), 'dist', 'public', 'index.html'),
      join(process.cwd(), 'public', 'index.html'),
      join(__dirname, '..', 'dist', 'public', 'index.html'),
      join(__dirname, '..', 'public', 'index.html'),
    ];
    
    for (const indexPath of possiblePaths) {
      try {
        baseHtml = readFileSync(indexPath, 'utf-8');
        console.log('[Serverless] Read built index.html from:', indexPath);
        break;
      } catch (error) {
        // Try next path
        continue;
      }
    }
    
    // If filesystem read failed, try fetching from a direct static file URL
    // Use the deployment URL to bypass rewrites
    if (!baseHtml) {
      try {
        const deploymentUrl = process.env.VERCEL_URL || req.headers['x-vercel-deployment-url'];
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.indiebookshop.com';
        
        // Try fetching from the deployment URL directly (bypasses rewrites)
        const fetchUrl = deploymentUrl 
          ? `${protocol}://${deploymentUrl}/index.html`
          : `${protocol}://${host}/index.html`;
        
        console.log('[Serverless] Attempting to fetch index.html from:', fetchUrl);
        const htmlResponse = await fetch(fetchUrl, {
          headers: {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
            'Accept': 'text/html',
          },
        });
        
        if (htmlResponse.ok) {
          baseHtml = await htmlResponse.text();
          console.log('[Serverless] Fetched index.html successfully');
        } else {
          console.error('[Serverless] Failed to fetch index.html, status:', htmlResponse.status);
        }
      } catch (fetchError) {
        console.error('[Serverless] Failed to fetch index.html:', fetchError.message);
      }
    }
    
    // If we have base HTML, inject meta tags
    if (baseHtml) {
      console.log('[Serverless] Injecting meta tags into base HTML');
      console.log('[Serverless] Base HTML length before injection:', baseHtml.length);
      const modifiedHtml = injectMetaTags(baseHtml, metaTags);
      console.log('[Serverless] Modified HTML length after injection:', modifiedHtml.length);
      console.log('[Serverless] Meta tags injected, returning modified HTML');
      
      // Verify we're actually sending HTML
      if (!modifiedHtml || modifiedHtml.length < 100) {
        console.error('[Serverless] WARNING: Modified HTML seems too short, using fallback');
        throw new Error('Modified HTML too short');
      }
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).send(modifiedHtml);
    }
    
    // Last resort: Return HTML with script path from build config
    console.warn('[Serverless] Using fallback HTML with build-time script path');
    const cssLink = scriptPaths?.CSS_PATH ? `<link rel="stylesheet" crossorigin href="${scriptPaths.CSS_PATH}">` : '';
    const fallbackHtml = `<!DOCTYPE html><html><head>${metaTags}${cssLink}</head><body><div id="root"></div><script type="module" crossorigin src="${scriptPaths?.SCRIPT_PATH || '/assets/index.js'}"></script></body></html>`;
    
    console.log('[Serverless] Fallback HTML length:', fallbackHtml.length);
    console.log('[Serverless] Using script path:', scriptPaths?.SCRIPT_PATH);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(fallbackHtml);
  } catch (error) {
    console.error('[Serverless] ERROR in bookshop function:', error);
    console.error('[Serverless] Error message:', error.message);
    console.error('[Serverless] Error stack:', error.stack);
    
    // Ensure we always return HTML, even on error
    try {
      const fallbackHtml = getFallbackHtml();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).send(fallbackHtml);
    } catch (sendError) {
      console.error('[Serverless] CRITICAL: Failed to send error response:', sendError);
      // Last resort - send minimal HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send('<!DOCTYPE html><html><head><title>IndiebookShop</title></head><body><div id="root"></div></body></html>');
    }
  }
}

