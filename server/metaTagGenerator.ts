import { Bookstore } from '@shared/schema';

// Constants - must match client/src/lib/seo.ts
const BASE_URL = 'https://www.indiebookshop.com';

const DESCRIPTION_TEMPLATES = {
  detail: '{name} is an independent bookshop in {city}, {state}. Discover events, specialty offerings, and more information about this local bookshop at IndiebookShop.com.',
};

// Helper to generate meta descriptions with keywords
function generateDescription(template: string, replacements: Record<string, string>): string {
  let description = template;
  
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    description = description.replace(regex, value);
  });
  
  return description;
}

/**
 * Generate a slug from a bookshop name (server-side version)
 * Must match client-side generateSlugFromName logic
 */
function generateSlugFromName(name: string): string {
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
function escapeHtml(text: string): string {
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
function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate meta tags HTML for a bookshop detail page
 * This is injected server-side into the initial HTML so search engines can see it
 */
export function generateBookshopMetaTags(bookshop: Bookstore): string {
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
    description = generateDescription(DESCRIPTION_TEMPLATES.detail, {
      name: bookshop.name,
      city: bookshop.city || '',
      state: bookshop.state || ''
    });
  }
  // Truncate to 160 characters (recommended max for meta descriptions)
  description = truncate(description, 160);
  const escapedDescription = escapeHtml(description);
  
  // Generate image URL
  const ogImage = bookshop.imageUrl || `${BASE_URL}/images/default-bookshop.jpg`;
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

