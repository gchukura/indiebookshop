// Vercel Serverless Function for SEO content injection on static pages
// Similar to api/bookshop-slug.js but for static pages (/, /directory, /about, etc.)

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
    console.log('[Static Pages] Loaded script paths:', scriptPathsCache.SCRIPT_PATH);
    return scriptPathsCache;
  } catch (error) {
    console.log('[Static Pages] Could not import script-paths.js, using defaults');
    scriptPathsCache = {
      SCRIPT_PATH: '/assets/index.js',
      CSS_PATH: null
    };
    return scriptPathsCache;
  }
}

/**
 * Generate static SEO content for homepage
 */
function generateHomepageSeoContent() {
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
function generateDirectorySeoContent() {
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
function generateAboutSeoContent() {
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
function generateContactSeoContent() {
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
function generateEventsSeoContent() {
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
function generateBlogSeoContent() {
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
 * Generate meta tags (including canonical) for static pages
 */
function generateStaticPageMetaTags(pathname) {
  const BASE_URL = 'https://www.indiebookshop.com';
  const canonicalUrl = `${BASE_URL}${pathname === '/' ? '' : pathname}`;
  
  // Page-specific titles and descriptions
  const pageMeta = {
    '/': {
      title: 'IndiebookShop.com - Discover Independent Bookshops Across America',
      description: 'Find over 3,000 independent bookshops across the United States and Canada. Browse our comprehensive directory, search by location, and discover unique literary spaces in your community.',
    },
    '/directory': {
      title: 'Browse Our Directory of Independent Bookshops | IndiebookShop.com',
      description: 'Explore our comprehensive directory of over 3,000 independent bookshops. Search by state, city, or specialty features like coffee shops, rare books, and children\'s sections.',
    },
    '/about': {
      title: 'About IndiebookShop.com - Supporting Independent Bookshops',
      description: 'IndiebookShop.com is dedicated to supporting and promoting independent bookshops across America. Learn about our mission to connect readers with local independent booksellers.',
    },
    '/contact': {
      title: 'Contact IndiebookShop.com - Get in Touch',
      description: 'Contact IndiebookShop.com with questions, suggestions, or to report issues. We\'re here to help connect book lovers with independent bookshops.',
    },
    '/events': {
      title: 'Independent Bookshop Events | IndiebookShop.com',
      description: 'Discover author readings, book signings, and special events at independent bookshops across America. Find literary events in your community.',
    },
    '/blog': {
      title: 'Independent Bookshop Blog | IndiebookShop.com',
      description: 'Read stories, interviews, and insights about independent bookshops across America. Celebrate the unique character and community value of indie bookstores.',
    },
  };
  
  const meta = pageMeta[pathname] || pageMeta['/'];
  
  return `
    <!-- Server-side injected meta tags for SEO -->
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:url" content="${canonicalUrl}" />
  `;
}

/**
 * Inject meta tags into HTML head
 */
function injectMetaTags(html, metaTags) {
  if (!html || typeof html !== 'string' || !metaTags || typeof metaTags !== 'string') {
    return html;
  }
  
  // Check if meta tags are already injected
  if (html.includes('<!-- Server-side injected meta tags for SEO -->')) {
    return html;
  }
  
  // Remove existing canonical tag if present (to avoid duplicates)
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
  
  // Inject before closing </head> tag
  if (html.includes('</head>')) {
    return html.replace('</head>', `${metaTags}</head>`);
  }
  
  // Fallback: inject after <head> tag
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${metaTags}`);
  }
  
  return html;
}

/**
 * Inject SEO body content into HTML before the root div
 */
function injectSeoBodyContent(html, seoContent) {
  if (!html || typeof html !== 'string' || !seoContent || typeof seoContent !== 'string') {
    return html;
  }
  
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

/**
 * Main handler for static page routes
 */
export default async function handler(req, res) {
  // Extract pathname from URL (remove query params and normalize)
  // For Vercel serverless functions, req.url might be the full URL or just the path
  let pathname = req.url || req.path || '/';
  
  // Handle full URLs (extract pathname)
  try {
    const url = new URL(pathname, 'http://localhost');
    pathname = url.pathname;
  } catch (e) {
    // Not a full URL, use as-is
  }
  
  // Remove query parameters
  if (pathname.includes('?')) {
    pathname = pathname.split('?')[0];
  }
  // Normalize trailing slashes (except for root)
  if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  
  // Ensure pathname starts with /
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }
  
  console.log(`[Static Pages] Requested pathname: ${pathname}, req.url: ${req.url}, req.path: ${req.path}`);
  
  // Map of static pages to their SEO content generators
  const staticPages = {
    '/': generateHomepageSeoContent,
    '/directory': generateDirectorySeoContent,
    '/about': generateAboutSeoContent,
    '/contact': generateContactSeoContent,
    '/events': generateEventsSeoContent,
    '/blog': generateBlogSeoContent,
  };
  
  const seoContentGenerator = staticPages[pathname];
  
  // If this isn't a static page we handle, pass through (shouldn't happen with current rewrites)
  if (!seoContentGenerator) {
    console.log(`[Static Pages] No SEO content generator for ${pathname}, returning 404`);
    return res.status(404).send('Not found');
  }
  
  console.log(`[Static Pages] Handling ${pathname}`);
  
  try {
    // Load script paths
    const scriptPaths = await loadScriptPaths();
    
    // Try to read the built index.html file
    const possiblePaths = [
      join(process.cwd(), 'dist', 'public', 'index.html'),
      join(process.cwd(), 'public', 'index.html'),
      join(__dirname, '..', 'dist', 'public', 'index.html'),
      join(__dirname, '..', 'public', 'index.html'),
    ];
    
    let baseHtml = null;
    for (const indexPath of possiblePaths) {
      try {
        baseHtml = readFileSync(indexPath, 'utf-8');
        console.log(`[Static Pages] Read index.html from: ${indexPath}`);
        break;
      } catch (error) {
        continue;
      }
    }
    
    // If filesystem read failed, try fetching from URL
    if (!baseHtml) {
      try {
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.indiebookshop.com';
        const fetchUrl = `${protocol}://${host}/index.html`;
        
        console.log(`[Static Pages] Fetching index.html from: ${fetchUrl}`);
        const htmlResponse = await fetch(fetchUrl, {
          headers: {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
            'Accept': 'text/html',
          },
        });
        
        if (htmlResponse.ok) {
          baseHtml = await htmlResponse.text();
          console.log(`[Static Pages] Fetched index.html successfully, length: ${baseHtml.length}`);
        }
      } catch (error) {
        console.error(`[Static Pages] Failed to fetch index.html:`, error.message);
      }
    }
    
    if (!baseHtml) {
      console.error('[Static Pages] Could not load base HTML, returning fallback');
      const cssLink = scriptPaths?.CSS_PATH ? `<link rel="stylesheet" crossorigin href="${scriptPaths.CSS_PATH}">` : '';
      const fallbackHtml = `<!DOCTYPE html><html><head><title>IndiebookShop</title>${cssLink}</head><body><div id="root"></div><script type="module" crossorigin src="${scriptPaths?.SCRIPT_PATH || '/assets/index.js'}"></script></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(fallbackHtml);
    }
    
    // Generate and inject meta tags (including canonical)
    const metaTags = generateStaticPageMetaTags(pathname);
    let modifiedHtml = injectMetaTags(baseHtml, metaTags);
    
    // Generate and inject SEO body content
    const seoContent = seoContentGenerator();
    modifiedHtml = injectSeoBodyContent(modifiedHtml, seoContent);
    
    console.log(`[Static Pages] Meta tags and SEO content injected for ${pathname}, HTML length: ${modifiedHtml.length}`);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(modifiedHtml);
    
  } catch (error) {
    console.error(`[Static Pages] Error handling ${pathname}:`, error);
    res.status(500).send('Internal Server Error');
  }
}
