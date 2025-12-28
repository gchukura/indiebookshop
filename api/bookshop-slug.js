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
  
  console.log('=== BOOKSHOP LOOKUP DEBUG ===');
  console.log('1. Slug from query:', slug);
  console.log('2. Slug type:', typeof slug);
  console.log('3. Slug length:', slug?.length);
  console.log('4. Slug trimmed:', slug?.trim());
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Serverless] Supabase environment variables not set in edge function');
    console.log('================================');
    return null;
  }
  
  // Check cache first
  const cached = slugCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Serverless] Cache hit for slug: ${slug}`);
    console.log('================================');
    return cached.bookshop;
  }
  
  try {
    // OPTIMIZATION: Try direct slug column query first (if slug column exists)
    // This is much faster than fetching all bookstores and generating slugs
    console.log('[Serverless] Attempting direct slug column query...');
    try {
      // Use PostgREST filter syntax: slug=eq.value (not slug=eq.value)
      const directResponse = await fetch(
        `${supabaseUrl}/rest/v1/bookstores?slug=eq.${encodeURIComponent(slug)}&live=eq.true&select=id,name,city,state,street,zip,description,phone,website,image_url,lat_numeric,lng_numeric,feature_ids&limit=1`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
        }
      );
      
      if (directResponse.ok) {
        const directResults = await directResponse.json();
        if (directResults && directResults.length > 0) {
          const bookshop = directResults[0];
          console.log(`[Serverless] ✓ Found bookshop via slug column: ${bookshop.name} (ID: ${bookshop.id})`);
          
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
          
          console.log('================================');
          return mappedBookshop;
        }
      } else if (directResponse.status === 400) {
        // 400 might mean slug column doesn't exist - fall through to fallback
        console.log('[Serverless] Slug column query returned 400, slug column may not exist - using fallback');
      } else {
        console.log(`[Serverless] Slug column query returned ${directResponse.status}, using fallback`);
      }
    } catch (directError) {
      console.log('[Serverless] Direct slug query failed, using fallback:', directError.message);
    }
    
    // FALLBACK: If slug column doesn't exist or query failed, use the old method
    console.log('[Serverless] Using fallback: generating slugs from names...');
    // CRITICAL FIX: Query in batches but STOP EARLY when we find a match
    // This dramatically reduces database egress
    const pageSize = 500; // Smaller pages for faster early exit
    const maxPages = 5; // Limit to 5 pages max (2500 bookstores) to prevent runaway queries
    let from = 0;
    let pageCount = 0;
    let totalSearched = 0;
    let sampleSlugs = []; // For debugging
    
    // Normalize the search slug (lowercase, trimmed)
    const normalizedSearchSlug = slug.toLowerCase().trim();
    console.log('5. Normalized search slug:', normalizedSearchSlug);
    
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
        const errorText = await response.text().catch(() => '');
        const errorJson = (() => {
          try {
            return JSON.parse(errorText);
          } catch {
            return { message: errorText };
          }
        })();
        console.error('[Serverless] Failed to fetch bookstores from Supabase:', response.status);
        console.error('[Serverless] Response status text:', response.statusText);
        console.error('[Serverless] Error details:', errorJson);
        console.error('[Serverless] Query URL:', `${supabaseUrl}/rest/v1/bookstores?live=eq.true&...&offset=${from}`);
        break;
      }
      
      const bookstores = await response.json();
      
      if (!bookstores || bookstores.length === 0) {
        console.log('[Serverless] No more bookstores to search');
        break; // No more bookstores
      }
      
      totalSearched += bookstores.length;
      console.log(`[Serverless] Searching batch ${pageCount + 1}: ${bookstores.length} bookstores (total searched: ${totalSearched})`);
      
      // Collect sample slugs for first batch (for debugging)
      if (pageCount === 0 && bookstores.length > 0) {
        sampleSlugs = bookstores.slice(0, 5).map(b => ({
          name: b.name,
          generatedSlug: generateSlugFromName(b.name || ''),
        }));
        console.log('6. Sample generated slugs from first batch:', JSON.stringify(sampleSlugs, null, 2));
      }
      
      // Search for matching slug in this batch
      // Try exact match first, then case-insensitive
      let bookshop = bookstores.find((b) => {
        if (!b.name) return false;
        const bookshopSlug = generateSlugFromName(b.name);
        const normalizedBookshopSlug = bookshopSlug.toLowerCase().trim();
        const exactMatch = bookshopSlug === slug;
        const normalizedMatch = normalizedBookshopSlug === normalizedSearchSlug;
        
        if (exactMatch || normalizedMatch) {
          console.log(`[Serverless] ✓ Slug match found!`);
          console.log(`   Bookshop name: "${b.name}"`);
          console.log(`   Generated slug: "${bookshopSlug}"`);
          console.log(`   Search slug: "${slug}"`);
          console.log(`   Exact match: ${exactMatch}, Normalized match: ${normalizedMatch}`);
          return true;
        }
        return false;
      });
      
      // If no exact match, try fuzzy matching (for debugging)
      if (!bookshop && pageCount === 0) {
        const fuzzyMatches = bookstores
          .map(b => ({
            name: b.name,
            generatedSlug: generateSlugFromName(b.name || ''),
            similarity: slug.toLowerCase().includes(generateSlugFromName(b.name || '').toLowerCase()) || 
                       generateSlugFromName(b.name || '').toLowerCase().includes(slug.toLowerCase())
          }))
          .filter(b => b.similarity)
          .slice(0, 3);
        
        if (fuzzyMatches.length > 0) {
          console.log('7. Fuzzy matches found (for debugging):', JSON.stringify(fuzzyMatches, null, 2));
        }
      }
      
      if (bookshop) {
        console.log(`[Serverless] ✓ Found bookshop: ${bookshop.name} (ID: ${bookshop.id}) after querying ${totalSearched} bookstores`);
        
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
        
        console.log('================================');
        return mappedBookshop;
      }
      
      // If we got fewer than pageSize, we've reached the end
      if (bookstores.length < pageSize) {
        console.log('[Serverless] Reached end of bookstores list');
        break;
      }
      
      from += pageSize;
      pageCount++;
    }
    
    console.log(`[Serverless] ✗ Bookshop not found for slug: "${slug}" (searched ${totalSearched} bookstores across ${pageCount} pages)`);
    
    // FALLBACK: Try searching by name pattern (decode slug back to potential name)
    // Example: "fables-books" -> search for names containing "fables" and "books"
    console.log('[Serverless] Attempting fallback: searching by name pattern...');
    try {
      const nameParts = slug.split('-').filter(p => p.length > 0);
      if (nameParts.length > 0) {
        // Try to find bookshop by searching for name parts
        // Use Postgres text search: name ILIKE '%fables%' AND name ILIKE '%books%'
        const nameFilters = nameParts.map(part => `name.ilike.%${part}%`).join(',');
        const fallbackUrl = `${supabaseUrl}/rest/v1/bookstores?live=eq.true&select=id,name,city,state,street,zip,description,phone,website,image_url,lat_numeric,lng_numeric,feature_ids&limit=10`;
        
        // Try a simpler approach: search for first name part using PostgREST ilike syntax
        const firstPart = nameParts[0];
        // PostgREST syntax: name.ilike.*pattern* for case-insensitive pattern matching
        const response = await fetch(
          `${supabaseUrl}/rest/v1/bookstores?live=eq.true&select=id,name,city,state,street,zip,description,phone,website,image_url,lat_numeric,lng_numeric,feature_ids&name=ilike.*${encodeURIComponent(firstPart)}*&limit=50`,
          {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const candidates = await response.json();
          console.log(`[Serverless] Fallback search found ${candidates?.length || 0} candidates for "${firstPart}"`);
          
          if (candidates && candidates.length > 0) {
            // Check if any candidate matches the slug
            for (const candidate of candidates) {
              const candidateSlug = generateSlugFromName(candidate.name || '');
              if (candidateSlug === slug || candidateSlug.toLowerCase() === normalizedSearchSlug) {
                console.log(`[Serverless] ✓ Found match in fallback search: "${candidate.name}"`);
                const mappedBookshop = {
                  ...candidate,
                  latitude: candidate.lat_numeric?.toString() || candidate.latitude || null,
                  longitude: candidate.lng_numeric?.toString() || candidate.longitude || null,
                  featureIds: candidate.feature_ids || candidate.featureIds || [],
                  imageUrl: candidate.image_url || candidate.imageUrl || null,
                };
                slugCache.set(slug, { bookshop: mappedBookshop, timestamp: Date.now() });
                console.log('================================');
                return mappedBookshop;
              }
            }
            
            // Log close matches for debugging
            const closeMatches = candidates.slice(0, 3).map(c => ({
              name: c.name,
              generatedSlug: generateSlugFromName(c.name || ''),
            }));
            console.log('[Serverless] Close matches (for debugging):', JSON.stringify(closeMatches, null, 2));
          }
        }
      }
    } catch (fallbackError) {
      console.error('[Serverless] Fallback search failed:', fallbackError.message);
    }
    
    console.log('================================');
    return null;
  } catch (error) {
    console.error('[Serverless] ✗ Error fetching bookshop from Supabase:', error);
    console.error('[Serverless] Error message:', error.message);
    console.error('[Serverless] Error stack:', error.stack);
    console.log('================================');
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
    
    // Fix: If slug is the literal "$slug" string, extract from URL path instead
    if (slug === '$slug' || slug === '%24slug') {
      console.log('[Serverless] Detected literal $slug, extracting from URL path');
      const urlPath = req.url.split('?')[0]; // Get path without query string
      const match = urlPath.match(/^\/bookshop\/([^/]+)/);
      if (match) {
        slug = decodeURIComponent(match[1]);
        console.log('[Serverless] Extracted slug from URL path:', slug);
      }
    }
    
    // Fallback: Extract from x-vercel-original-path header or URL path if query is empty/invalid
    if (!slug || slug === '$slug' || slug === '%24slug') {
      // Try x-vercel-original-path first
      let pathToCheck = req.headers['x-vercel-original-path'];
      if (!pathToCheck) {
        // Fallback to req.url (remove query string)
        pathToCheck = req.url.split('?')[0];
      }
      console.log('[Serverless] No valid slug in query, checking path:', pathToCheck);
      if (pathToCheck) {
        const match = pathToCheck.match(/\/bookshop\/([^/?]+)/);
        if (match) {
          slug = decodeURIComponent(match[1]);
          console.log('[Serverless] Extracted slug from path:', slug);
        } else {
          console.log('[Serverless] No slug match found in path:', pathToCheck);
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
    console.log('[Serverless] Slug type:', typeof decodedSlug, 'length:', decodedSlug.length);
    const bookshop = await fetchBookshopBySlug(decodedSlug);
    console.log('[Serverless] Bookshop found:', !!bookshop);
    if (bookshop) {
      console.log('[Serverless] Found bookshop name:', bookshop.name);
      console.log('[Serverless] Generated slug from name:', generateSlugFromName(bookshop.name));
    } else {
      console.log('[Serverless] Bookshop lookup returned null/undefined');
    }
    
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
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.indiebookshop.com';
        
        // Try fetching from the production URL directly
        const fetchUrl = `${protocol}://${host}/index.html`;
        
        console.log('[Serverless] Attempting to fetch index.html from:', fetchUrl);
        const htmlResponse = await fetch(fetchUrl, {
          headers: {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
            'Accept': 'text/html',
          },
        });
        
        if (htmlResponse.ok) {
          baseHtml = await htmlResponse.text();
          console.log('[Serverless] Fetched index.html successfully, length:', baseHtml.length);
          
          // Verify we got valid HTML
          if (!baseHtml || baseHtml.length < 100 || !baseHtml.includes('<script')) {
            console.error('[Serverless] Fetched HTML seems invalid, length:', baseHtml?.length);
            baseHtml = null;
          }
        } else {
          console.error('[Serverless] Failed to fetch index.html, status:', htmlResponse.status);
        }
      } catch (fetchError) {
        console.error('[Serverless] Failed to fetch index.html:', fetchError.message);
        console.error('[Serverless] Fetch error stack:', fetchError.stack);
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
    // BUT FIRST: Try to extract script path from a fresh fetch of index.html
    console.warn('[Serverless] baseHtml not available, attempting to fetch index.html for script paths...');
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.indiebookshop.com';
      const fetchUrl = `${protocol}://${host}/index.html`;
      
      const htmlResponse = await fetch(fetchUrl);
      if (htmlResponse.ok) {
        const freshHtml = await htmlResponse.text();
        // Extract script and CSS paths from fresh HTML
        const scriptMatch = freshHtml.match(/<script[^>]*type=["']module["'][^>]*crossorigin[^>]*src=["']([^"']+)["'][^>]*>/i) ||
                          freshHtml.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/i);
        const cssMatch = freshHtml.match(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+\.css)["'][^>]*>/i);
        
        const actualScriptPath = scriptMatch ? scriptMatch[1] : (scriptPaths?.SCRIPT_PATH || '/assets/index.js');
        const actualCssPath = cssMatch ? cssMatch[1] : scriptPaths?.CSS_PATH;
        
        console.log('[Serverless] Extracted script path from fresh HTML:', actualScriptPath);
        console.log('[Serverless] Extracted CSS path from fresh HTML:', actualCssPath || 'none');
        
        const cssLink = actualCssPath ? `<link rel="stylesheet" crossorigin href="${actualCssPath}">` : '';
        const fallbackHtml = `<!DOCTYPE html><html><head>${metaTags}${cssLink}</head><body><div id="root"></div><script type="module" crossorigin src="${actualScriptPath}"></script></body></html>`;
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).send(fallbackHtml);
      }
    } catch (extractError) {
      console.error('[Serverless] Failed to extract script paths from fresh HTML:', extractError.message);
    }
    
    // Final fallback: Use build-time script paths
    console.warn('[Serverless] Using build-time script paths as final fallback');
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

