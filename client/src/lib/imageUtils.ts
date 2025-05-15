/**
 * Utility functions for handling images and SEO optimizations
 */

/**
 * Generates a descriptive alt text for a bookshop image
 * 
 * @param bookshopName The name of the bookshop
 * @param city The city where the bookshop is located
 * @param state The state where the bookshop is located
 * @param features Optional array of features the bookshop has
 * @returns SEO-optimized descriptive alt text
 */
export function generateBookshopImageAlt(
  bookshopName: string,
  city: string,
  state: string,
  features?: string[]
): string {
  let alt = `${bookshopName} - Independent bookshop in ${city}, ${state}`;
  
  if (features && features.length > 0) {
    // Include up to 3 features in the alt text
    const topFeatures = features.slice(0, 3);
    alt += ` featuring ${topFeatures.join(", ")}`;
  }
  
  return alt;
}

/**
 * Generates a descriptive alt text for an event image
 * 
 * @param eventTitle The title of the event
 * @param bookshopName The name of the bookshop hosting the event
 * @param date The date of the event
 * @param isAuthorEvent Whether it's an author event (signing, reading, etc.)
 * @returns SEO-optimized descriptive alt text
 */
export function generateEventImageAlt(
  eventTitle: string,
  bookshopName: string,
  date: string,
  isAuthorEvent?: boolean
): string {
  let alt = `${eventTitle} at ${bookshopName} on ${date}`;
  
  if (isAuthorEvent) {
    alt += " - Author event at independent bookshop";
  }
  
  return alt;
}

/**
 * Generates a filename for bookshop images that is SEO-friendly
 * 
 * @param bookshopName The name of the bookshop
 * @param city The city where the bookshop is located
 * @param state The state where the bookshop is located
 * @returns SEO-optimized filename (without extension)
 */
export function generateSEOFilename(
  bookshopName: string,
  city: string,
  state: string
): string {
  // Remove special characters and replace spaces with hyphens
  const cleanName = bookshopName.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
  const cleanCity = city.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
  const cleanState = state.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
  
  return `${cleanName}-indie-bookshop-${cleanCity}-${cleanState}`;
}

/**
 * Optimizes an image URL with proper dimensions for different use cases
 * 
 * @param imageUrl The original image URL
 * @param usage The intended usage ('thumbnail', 'card', 'detail', 'hero')
 * @returns Optimized image URL with appropriate size parameters
 */
export function optimizeImageUrl(
  imageUrl: string,
  usage: 'thumbnail' | 'card' | 'detail' | 'hero'
): string {
  if (!imageUrl) return '';
  
  // If it's not an online image service with resize parameters, return original
  if (!imageUrl.includes('unsplash.com') && !imageUrl.includes('cloudinary.com')) {
    return imageUrl;
  }
  
  // Different sizes for different usages
  const dimensions = {
    thumbnail: { width: 100, height: 100 },
    card: { width: 400, height: 300 },
    detail: { width: 800, height: 600 },
    hero: { width: 1200, height: 600 }
  };
  
  const { width, height } = dimensions[usage];
  
  // Handle Unsplash images
  if (imageUrl.includes('unsplash.com')) {
    return `${imageUrl.split('?')[0]}?w=${width}&h=${height}&fit=crop&q=80`;
  }
  
  // Handle Cloudinary images
  if (imageUrl.includes('cloudinary.com')) {
    // Extract base URL and transformation parts
    const parts = imageUrl.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/w_${width},h_${height},c_fill,q_auto,f_auto/${parts[1]}`;
    }
  }
  
  return imageUrl;
}