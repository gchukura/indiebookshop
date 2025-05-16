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
    
    // State abbreviation to full name mapping
    const stateMap = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 
      'DE': 'Delaware', 'DC': 'District of Columbia', 'FL': 'Florida', 
      'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 
      'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 
      'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 
      'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 
      'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 
      'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York', 
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 
      'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota', 
      'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 
      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 
      'WI': 'Wisconsin', 'WY': 'Wyoming',
      'BC': 'British Columbia', 'ON': 'Ontario', 'QC': 'Quebec',
      'AB': 'Alberta', 'MB': 'Manitoba', 'NS': 'Nova Scotia',
      'NB': 'New Brunswick', 'SK': 'Saskatchewan'
    };

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
    
    // Helper function to create URL-friendly slugs
    const createSlug = (text) => {
      return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
    };
    
    // Add state directory pages (both abbreviation and full name)
    for (const state of states) {
      // Add the state abbreviation URL
      addUrl(`/directory/state/${state}`, 0.6, 'weekly');
      
      // If we have a full state name mapping, add that URL too
      if (stateMap[state]) {
        const fullStateSlug = createSlug(stateMap[state]);
        addUrl(`/directory/state/${fullStateSlug}`, 0.6, 'weekly');
      }
    }
    
    // Add city directory pages
    for (const { state, city } of cities) {
      // URL-friendly city name
      const citySlug = createSlug(city);
      
      // Add city with state abbreviation
      addUrl(`/directory/city/${citySlug}`, 0.6, 'weekly');
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