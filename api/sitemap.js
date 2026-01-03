// Serverless-compatible sitemap generator
// Updated for new unified directory structure
import { SupabaseStorage } from './supabase-storage-serverless.js';

/**
 * Helper function to generate a clean slug from a bookstore name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
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
    
    // Add bookshop pages using the slug column from the database
    // This ensures consistency with the bookshop-slug.js function which queries by slug
    // The slug column handles duplicates by appending city/state/ID when needed
    let bookshopCount = 0;
    let skippedCount = 0;
    for (const bookshop of bookstores) {
      if (bookshop.id && bookshop.name) {
        try {
          // Prefer the slug column from database (handles duplicates correctly)
          // Fallback to generating slug from name if slug column is missing
          let bookshopSlug = bookshop.slug;
          if (!bookshopSlug || bookshopSlug.trim() === '') {
            bookshopSlug = generateSlug(bookshop.name);
            console.warn(`Serverless: Bookshop "${bookshop.name}" (ID: ${bookshop.id}) missing slug column, using generated slug: "${bookshopSlug}"`);
          }
          
          if (bookshopSlug && bookshopSlug.trim() !== '') {
            addUrl(`/bookshop/${bookshopSlug}`, 0.7, 'weekly');
            bookshopCount++;
          } else {
            skippedCount++;
            console.warn(`Serverless: Skipped bookshop with empty slug: "${bookshop.name}" (ID: ${bookshop.id})`);
          }
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
