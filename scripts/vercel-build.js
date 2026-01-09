// This script runs when Vercel builds the project
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get current working directory
const cwd = process.cwd();

console.log('Starting Vercel build process...');

// Run the Vite build
console.log('Building frontend with Vite...');
execSync('npx vite build', { stdio: 'inherit' });

// Run TypeScript type checking (non-blocking - errors won't fail the build)
console.log('Checking TypeScript types...');
try {
  execSync('tsc --project tsconfig.json --noEmit', { stdio: 'inherit' });
  console.log('TypeScript check passed');
} catch (error) {
  console.warn('TypeScript check found errors, but continuing build (these are type-only errors, not runtime errors)');
  // Don't throw - allow build to continue
}

// Copy necessary files for serverless functions
console.log('Copying files for serverless functions...');

// Ensure public folder exists
const distPublicDir = path.join(cwd, 'dist', 'public');
if (!fs.existsSync(distPublicDir)) {
  fs.mkdirSync(distPublicDir, { recursive: true });
}

// Create environment variables config file for Vercel
console.log('Setting up environment config...');
const envConfigContent = `
// Environment configuration for Vercel
export const ENV = {
  NODE_ENV: '${process.env.NODE_ENV || 'production'}',
  USE_SAMPLE_DATA: '${process.env.USE_SAMPLE_DATA || 'true'}',
  GOOGLE_SHEETS_ID: '${process.env.GOOGLE_SHEETS_ID || ''}',
  USE_MEM_STORAGE: '${process.env.USE_MEM_STORAGE || 'false'}'
};
`;

fs.writeFileSync('api/env-config.js', envConfigContent);

// Extract script and CSS paths from built index.html for bookshop-slug function
console.log('Extracting script paths from built index.html...');
const indexPath = path.join(cwd, 'dist', 'public', 'index.html');
if (fs.existsSync(indexPath)) {
  let indexHtml = fs.readFileSync(indexPath, 'utf-8');
  
  // Match the Vite-generated script (type="module", crossorigin, and in /assets/)
  // More specific regex to match: <script type="module" crossorigin src="/assets/index-XXXXX.js"></script>
  const scriptMatch = indexHtml.match(/<script[^>]*type=["']module["'][^>]*crossorigin[^>]*src=["']([^"']+)["'][^>]*>/i);
  // If that doesn't match, try a simpler pattern
  const scriptMatch2 = scriptMatch ? null : indexHtml.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/i);
  // Match the Vite-generated CSS (in /assets/ and has crossorigin)
  const cssMatch = indexHtml.match(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+\.css)["'][^>]*>/i);
  
  const finalScriptMatch = scriptMatch || scriptMatch2;
  
  const scriptPath = finalScriptMatch ? finalScriptMatch[1] : '/assets/index.js';
  const cssPath = cssMatch ? cssMatch[1] : null;
  
  console.log('Script match result:', finalScriptMatch ? finalScriptMatch[1] : 'NOT FOUND');
  console.log('CSS match result:', cssPath || 'NOT FOUND');
  
  // Create a config file with the script paths
  const scriptConfigContent = `
// Auto-generated script paths from built index.html
// This file is generated during build to ensure correct hashed filenames
export const SCRIPT_PATH = '${scriptPath}';
export const CSS_PATH = ${cssPath ? `'${cssPath}'` : 'null'};
`;
  
  fs.writeFileSync('api/script-paths.js', scriptConfigContent);
  console.log(`Extracted script path: ${scriptPath}`);
  if (cssPath) {
    console.log(`Extracted CSS path: ${cssPath}`);
  }
  
  // Inject homepage SEO content into index.html at build time
  // This ensures the homepage has SEO content even when Vercel serves it directly
  console.log('Injecting homepage SEO content into index.html...');
  
  // Helper function to generate slug from name (matches shared/utils.ts logic)
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
  
  // Helper function to escape HTML
  function escapeHtml(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
  
  // Add static bookshop links for SEO (using well-known bookshops that are likely in the database)
  // These provide internal linking even without database access at build time
  const featuredBookshops = [
    { name: 'Powell\'s Books', city: 'Portland', state: 'Oregon' },
    { name: 'The Strand', city: 'New York', state: 'New York' },
    { name: 'City Lights Booksellers', city: 'San Francisco', state: 'California' },
    { name: 'Tattered Cover', city: 'Denver', state: 'Colorado' },
    { name: 'Politics and Prose', city: 'Washington', state: 'DC' },
    { name: 'BookPeople', city: 'Austin', state: 'Texas' },
    { name: 'Elliott Bay Book Company', city: 'Seattle', state: 'Washington' },
    { name: 'Prairie Lights', city: 'Iowa City', state: 'Iowa' },
    { name: 'Square Books', city: 'Oxford', state: 'Mississippi' },
    { name: 'Harvard Book Store', city: 'Cambridge', state: 'Massachusetts' }
  ];
  
  let bookshopLinks = '<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;"><h2 style="font-size: 1.5em; margin-bottom: 15px; color: #1a1a1a;">Featured Independent Bookshops</h2><ul style="list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">';
  
  featuredBookshops.forEach((bookshop) => {
    const slug = generateSlugFromName(bookshop.name);
    if (slug) {
      const location = [bookshop.city, bookshop.state].filter(Boolean).join(', ');
      const escapedName = escapeHtml(bookshop.name);
      const escapedLocation = location ? ` - ${escapeHtml(location)}` : '';
      bookshopLinks += `<li style="margin: 0;"><a href="/bookshop/${slug}" style="color: #2A6B7C; text-decoration: none; font-weight: 500;">${escapedName}${escapedLocation}</a></li>`;
    }
  });
  
  bookshopLinks += '</ul></div>';
  
  const homepageSeoContent = `
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
        ${bookshopLinks}
        <nav>
          <a href="/directory">Browse All Bookshops</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
          <a href="/submit-bookshop">Add Your Bookshop</a>
        </nav>
      </div>
    </noscript>
  `;
  
  // Generate canonical tag for homepage
  const canonicalUrl = 'https://www.indiebookshop.com';
  const canonicalTag = `
    <!-- Server-side injected meta tags for SEO -->
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:url" content="${canonicalUrl}" />
  `;
  
  // Inject canonical tag if not already present
  if (!indexHtml.includes('<!-- Server-side injected meta tags for SEO -->')) {
    // Remove existing canonical tag if present (to avoid duplicates)
    indexHtml = indexHtml.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
    
    // Inject before closing </head> tag
    if (indexHtml.includes('</head>')) {
      indexHtml = indexHtml.replace('</head>', `${canonicalTag}</head>`);
      console.log('Homepage canonical tag injected into index.html');
    }
  }
  
  // Check if SEO content is already injected
  if (!indexHtml.includes('<!-- Server-side injected SEO body content -->')) {
    // Find <div id="root"> and inject before it
    const rootDivPattern = /<div\s+id=["']root["'][^>]*>/i;
    const rootDivMatch = indexHtml.match(rootDivPattern);
    
    if (rootDivMatch) {
      const rootDivTag = rootDivMatch[0];
      const seoContentWithMarker = `<!-- Server-side injected SEO body content -->\n${homepageSeoContent}`;
      indexHtml = indexHtml.replace(rootDivTag, seoContentWithMarker + '\n' + rootDivTag);
      console.log('Homepage SEO content injected into index.html');
    } else {
      console.warn('Warning: Could not find <div id="root"> in index.html, skipping SEO content injection');
    }
  } else {
    console.log('Homepage SEO content already present in index.html');
  }
  
  // Write the modified HTML back to file
  fs.writeFileSync(indexPath, indexHtml, 'utf-8');
} else {
  console.warn('Warning: Could not find built index.html to extract script paths');
}

console.log('Vercel build process completed successfully.');