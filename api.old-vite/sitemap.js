// Serverless-compatible sitemap generator
// Updated for new unified directory structure
import { SupabaseStorage } from './supabase-storage-serverless.js';

/**
 * Helper function to generate a clean slug from a bookstore name
 * MUST match generateSlugFromName() in bookshop-slug.js for consistency with canonical URLs
 */
function generateSlugFromName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-')       // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '')   // Remove leading/trailing hyphens
    .trim();                    // Trim leading/trailing spaces
}

export default async function handler(req, res) {
  console.log('=== SITEMAP FUNCTION CALLED ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Request path:', req.path);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    console.log('Serverless: Generating sitemap.xml');
    
    // Initialize storage - use Supabase by default
    const storage = new SupabaseStorage();
    
    // Fetch data directly (remove the wait loop which could cause timeouts)
    const bookstores = await storage.getBookstores();
    console.log(`Serverless: Fetched ${bookstores.length} bookstores for sitemap`);
    
    // Get base URL from request or use a default
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.indiebookshop.com';
    const baseUrl = `${protocol}://${host}`;
    
    // Start building the sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    
    // Function to add a URL to the sitemap
    const addUrl = (relativeUrl, priority = 0.5, changefreq = 'weekly', lastmod = null) => {
      const loc = `${baseUrl}${relativeUrl}`;
      const lastmodStr = lastmod || new Date().toISOString();
      // Escape XML special characters in URL
      const escapedLoc = loc
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      xml += '<url>';
      xml += `<loc>${escapedLoc}</loc>`;
      xml += `<priority>${priority}</priority>`;
      xml += `<changefreq>${changefreq}</changefreq>`;
      xml += `<lastmod>${lastmodStr}</lastmod>`;
      xml += '</url>';
    };
    
    // Add static pages
    addUrl('/', 1.0, 'daily');
    addUrl('/about', 0.8, 'monthly');
    addUrl('/contact', 0.7, 'monthly');
    addUrl('/directory', 0.9, 'daily');
    addUrl('/blog', 0.8, 'weekly');
    addUrl('/events', 0.8, 'daily');
    addUrl('/submit-bookshop', 0.6, 'monthly');
    addUrl('/submit-event', 0.6, 'monthly');
    
    // Add bookshop pages using generateSlugFromName() to match canonical URLs exactly
    // IMPORTANT: Always generate slug from name (not database slug column) to ensure
    // sitemap URLs match canonical URLs exactly. This prevents "non-canonical pages in sitemap" errors.
    // The database slug column may contain location-specific variants (e.g., "name-city") that don't match canonical URLs.
    // Canonical URLs use: generateSlugFromName(bookshop.name) - we must match this exactly.
    //
    // For duplicate bookshop names: Only include ONE bookshop per unique base slug in sitemap.
    // IMPORTANT: Match routing system behavior - routing uses "last one wins" strategy, so we process
    // bookshops in reverse ID order (highest ID last) to match which bookshop is actually accessible.
    // This ensures sitemap URLs match the bookshop that's actually accessible via that URL.
    
    // Sort bookshops by ID DESCENDING to match routing system's "last one wins" behavior
    // This ensures the sitemap includes the same bookshop that's accessible via the URL
    const sortedBookshops = [...bookstores].sort((a, b) => (b.id || 0) - (a.id || 0));
    
    let bookshopCount = 0;
    let skippedCount = 0;
    const seenBaseSlugs = new Set(); // Track which base slugs we've already included
    
    for (const bookshop of sortedBookshops) {
      if (bookshop.id && bookshop.name) {
        try {
          // Always generate base slug from name to match canonical URL generation exactly
          // This ensures sitemap URLs are exactly the same as canonical URLs
          const baseSlug = generateSlugFromName(bookshop.name);
          
          if (!baseSlug || baseSlug.trim() === '') {
            skippedCount++;
            console.warn(`Serverless: Skipped bookshop with empty slug: "${bookshop.name}" (ID: ${bookshop.id})`);
            continue;
          }
          
          // Handle duplicates: Only include the LAST bookshop (highest ID) for each unique base slug
          // This matches routing system's "last one wins" behavior - ensures sitemap URL matches accessible bookshop
          if (seenBaseSlugs.has(baseSlug)) {
            skippedCount++;
            console.log(`Serverless: Skipped duplicate base slug "${baseSlug}" for bookshop "${bookshop.name}" (ID: ${bookshop.id}) - already included (last one wins)`);
            continue;
          }
          
          // First time seeing this base slug, include it (will be the last/highest ID due to sort order)
          seenBaseSlugs.add(baseSlug);
          addUrl(`/bookshop/${baseSlug}`, 0.7, 'weekly');
          bookshopCount++;
        } catch (err) {
          skippedCount++;
          console.error(`Serverless: Error processing bookshop "${bookshop.name}" (ID: ${bookshop.id}):`, err);
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Serverless: Added ${bookshopCount} bookshop URLs to sitemap, skipped ${skippedCount}`);
    
    // REMOVED: Old directory structure URLs
    // - /directory/state/[state]
    // - /directory/city/[state]/[city]
    // - /directory/county/[state]/[county]
    // - /directory/category/[category]
    // 
    // These are no longer needed with the unified /directory page
    // The unified /directory page handles all filtering via client-side state
    
    // Close the XML
    xml += '</urlset>';
    
    // Log sitemap stats
    const sitemapSize = Buffer.byteLength(xml, 'utf8');
    const sitemapSizeKB = (sitemapSize / 1024).toFixed(2);
    const totalUrls = 8 + bookshopCount; // 8 static pages + bookshop pages
    console.log(`Serverless: Sitemap generated successfully - ${totalUrls} URLs, ${sitemapSizeKB} KB`);
    
    // Set headers and send response
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // Allow caching for 1 hour - sitemap doesn't change that frequently
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Serverless Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}
