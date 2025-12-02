// Updated sitemap generation for new unified directory structure
import { Request, Response } from 'express';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import { storage } from './storage';
import { BASE_URL } from '../client/src/lib/seo';

/**
 * Helper function to generate a clean slug from a bookstore name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

/**
 * Generates XML sitemap for the site
 * 
 * New structure:
 * - Main pages (home, about, directory)
 * - Individual bookshop pages (/bookshop/[slug])
 * - NO MORE: /directory/state/[state], /directory/city/[state]/[city], etc.
 * 
 * The unified /directory page handles all filtering via client-side state
 */
export async function generateSitemap(req: Request, res: Response): Promise<void> {
  try {
    // Get data needed for the sitemap
    const bookstores = await storage.getBookstores();
    
    // Get hostname from request or use BASE_URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || BASE_URL.replace('https://', '');
    const hostname = `${protocol}://${host}`;

    // Create sitemap stream
    const stream = new SitemapStream({ hostname });

    // Static pages
    const staticPages = [
      {
        url: '/',
        changefreq: 'daily' as const,
        priority: 1.0,
        lastmod: new Date().toISOString()
      },
      {
        url: '/about',
        changefreq: 'monthly' as const,
        priority: 0.8,
        lastmod: new Date().toISOString()
      },
      {
        url: '/directory',
        changefreq: 'daily' as const,
        priority: 0.9,
        lastmod: new Date().toISOString()
      },
      {
        url: '/contact',
        changefreq: 'monthly' as const,
        priority: 0.7,
        lastmod: new Date().toISOString()
      },
      {
        url: '/events',
        changefreq: 'daily' as const,
        priority: 0.8,
        lastmod: new Date().toISOString()
      },
      {
        url: '/blog',
        changefreq: 'weekly' as const,
        priority: 0.8,
        lastmod: new Date().toISOString()
      },
      {
        url: '/submit-bookshop',
        changefreq: 'monthly' as const,
        priority: 0.6,
        lastmod: new Date().toISOString()
      },
      {
        url: '/submit-event',
        changefreq: 'monthly' as const,
        priority: 0.6,
        lastmod: new Date().toISOString()
      }
    ];

    // Individual bookshop pages
    // These are still important for SEO - each bookshop gets its own page
    const bookshopPages = bookstores
      .filter(b => b.id && b.name) // Only include bookshops with id and name
      .map(bookstore => ({
        url: `/bookshop/${generateSlug(bookstore.name)}`,
        changefreq: 'weekly' as const,
        priority: 0.7,
        lastmod: new Date().toISOString()
      }));

    // Combine all pages
    const allPages = [...staticPages, ...bookshopPages];

    // Write to stream
    const readable = Readable.from(allPages);
    readable.pipe(stream);

    // Convert to string
    const sitemap = await streamToPromise(stream);
    const sitemapString = sitemap.toString();

    // Set the appropriate headers and send the XML
    res.header('Content-Type', 'application/xml; charset=utf-8');
    // Allow caching for 1 hour - sitemap doesn't change that frequently
    res.header('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.send(sitemapString);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

/**
 * REMOVED: Old directory structure sitemap generation
 * 
 * Previously generated:
 * - /directory/browse
 * - /directory/cities
 * - /directory/counties
 * - /directory/state/[state] (50 URLs)
 * - /directory/city/[state]/[city] (hundreds of URLs)
 * - /directory/county/[state]/[county] (hundreds of URLs)
 * 
 * These are no longer needed with the unified /directory page
 */

/**
 * Helper: Get unique states from bookstores
 * (Useful for other purposes, but not for sitemap anymore)
 */
export function getUniqueStates(bookstores: Awaited<ReturnType<typeof storage.getBookstores>>): string[] {
  const states = new Set(bookstores.map(b => b.state).filter(Boolean));
  return Array.from(states).sort();
}

/**
 * Helper: Get unique cities from bookstores
 * (Useful for other purposes, but not for sitemap anymore)
 */
export function getUniqueCities(bookstores: Awaited<ReturnType<typeof storage.getBookstores>>): Array<{ city: string; state: string }> {
  const citySet = new Map<string, { city: string; state: string }>();
  
  bookstores
    .filter(b => b.city && b.state)
    .forEach(b => {
      const key = `${b.city}-${b.state}`;
      if (!citySet.has(key)) {
        citySet.set(key, { city: b.city!, state: b.state! });
      }
    });
  
  return Array.from(citySet.values()).sort((a, b) => 
    `${a.city}, ${a.state}`.localeCompare(`${b.city}, ${b.state}`)
  );
}
