// Serverless-compatible sitemap generator
import { GoogleSheetsStorage } from './sheets-storage-serverless.js';

export default async function handler(req, res) {
  try {
    console.log('Serverless: Generating sitemap.xml');
    
    // Initialize storage
    const storage = new GoogleSheetsStorage();
    
    // Wait for storage to initialize and load data
    await new Promise(resolve => {
      const checkInit = async () => {
        try {
          const bookstores = await storage.getBookstores();
          if (bookstores && bookstores.length > 0) {
            resolve();
          } else {
            setTimeout(checkInit, 500);
          }
        } catch (err) {
          setTimeout(checkInit, 500);
        }
      };
      checkInit();
    });
    
    // Fetch data
    const [bookstores, features] = await Promise.all([
      storage.getBookstores(),
      storage.getFeatures()
    ]);
    
    // Get unique states and cities
    const states = [...new Set(bookstores.map(b => b.state))].sort();
    
    // Create a map of cities by state
    const citiesByState = {};
    for (const bookstore of bookstores) {
      if (!citiesByState[bookstore.state]) {
        citiesByState[bookstore.state] = new Set();
      }
      citiesByState[bookstore.state].add(bookstore.city);
    }
    
    // Convert to array of city objects with state
    const cities = [];
    for (const state in citiesByState) {
      for (const city of citiesByState[state]) {
        cities.push({ state, city });
      }
    }
    
    // Get base URL from request or use a default
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'indiebookshop.com';
    const baseUrl = `${protocol}://${host}`;
    
    // Start building the sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    
    // Function to add a URL to the sitemap
    const addUrl = (relativeUrl, priority = 0.5, changefreq = 'weekly') => {
      const loc = `${baseUrl}${relativeUrl}`;
      xml += '<url>';
      xml += `<loc>${loc}</loc>`;
      xml += `<priority>${priority}</priority>`;
      xml += `<changefreq>${changefreq}</changefreq>`;
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
    
    // Add bookshop pages
    for (const bookshop of bookstores) {
      addUrl(`/bookshop/${bookshop.id}`, 0.7, 'weekly');
    }
    
    // Add state directory pages
    for (const state of states) {
      // URL-friendly state name
      const stateSlug = state.toLowerCase().replace(/\s+/g, '-');
      addUrl(`/directory/state/${stateSlug}`, 0.6, 'weekly');
    }
    
    // Add city directory pages
    for (const { state, city } of cities) {
      // URL-friendly names
      const stateSlug = state.toLowerCase().replace(/\s+/g, '-');
      const citySlug = city.toLowerCase().replace(/\s+/g, '-');
      addUrl(`/directory/city/${stateSlug}/${citySlug}`, 0.6, 'weekly');
    }
    
    // Add category pages
    for (const feature of features) {
      const categorySlug = feature.name.toLowerCase().replace(/\s+/g, '-');
      addUrl(`/directory/category/${categorySlug}`, 0.6, 'weekly');
    }
    
    // Close the XML
    xml += '</urlset>';
    
    // Set headers and send response
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.status(200).send(xml);
    
    console.log('Serverless: Sitemap generated successfully');
  } catch (error) {
    console.error('Serverless Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}