import { Request, Response } from 'express';
import { storage } from './storage';
import { BASE_URL } from '../client/src/lib/seo';

// Function to generate XML sitemap
export async function generateSitemap(req: Request, res: Response) {
  try {
    // Get data needed for the sitemap
    const bookstores = await storage.getBookstores();
    const features = await storage.getFeatures();
    
    // Extract unique states and cities
    const states = Array.from(new Set(bookstores.map(b => b.state))).filter(Boolean);
    const cities = Array.from(new Set(bookstores.map(b => b.city))).filter(Boolean);

    // Start building the XML content
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    const staticPages = [
      '', // Home page
      '/directory',
      '/directory/states',
      '/directory/cities',
      '/directory/categories',
      '/events',
      '/about',
      '/contact',
      '/blog',
      '/submit-bookshop',
      '/submit-bookstore',
      '/submit-event'
    ];

    staticPages.forEach(page => {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}${page}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${page === '' ? '1.0' : '0.8'}</priority>\n`;
      xml += `  </url>\n`;
    });

    // Add dynamic bookstore pages
    bookstores.forEach(bookstore => {
      if (bookstore.id) {
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/bookshop/${bookstore.id}</loc>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }
    });

    // Add state directory pages
    states.forEach(state => {
      if (state) {
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/directory/state/${state}</loc>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.6</priority>\n`;
        xml += `  </url>\n`;
      }
    });

    // Add city directory pages with state in the path for disambiguation
    bookstores.forEach(bookstore => {
      if (bookstore.city && bookstore.state) {
        // Create a clean slug for the city
        const citySlug = bookstore.city
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-')
          .trim();
        
        // Create the state-specific city URL
        const stateAbbr = bookstore.state.toLowerCase();
        
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/directory/city/${stateAbbr}/${citySlug}</loc>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }
    });
    
    // Also include the legacy city URLs for backward compatibility
    cities.forEach(city => {
      if (city) {
        const citySlug = city
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-')
          .trim();
        
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/directory/city/${citySlug}</loc>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.5</priority>\n`; // Lower priority than the state-specific URLs
        xml += `  </url>\n`;
      }
    });

    // Add feature/category pages
    features.forEach(feature => {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/directory/category/${feature.id}</loc>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    });

    // Close the XML structure
    xml += '</urlset>';

    // Set the appropriate headers and send the XML
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}