// lib/bookstore-content-utils.ts
// Content generation utilities for bookstore pages
// Generates templated "About" section content based on available data

import { Bookstore } from '@/shared/schema';

// ===========================================
// TYPES
// ===========================================

interface ContentParts {
  location: string;
  typeAndSpecialization: string;
  ratings: string;
  reviewThemes: string;
  hours: string;
}

// ===========================================
// MAIN CONTENT GENERATION
// ===========================================

/**
 * Generate comprehensive "About" section content for a bookstore
 * Returns a single formatted string for the template component
 */
export function generateAboutBookstoreContent(bookstore: Bookstore): string {
  const parts = generateContentParts(bookstore);

  // Combine parts into cohesive paragraphs
  const paragraphs: string[] = [];

  // Location paragraph
  if (parts.location) {
    paragraphs.push(parts.location);
  }

  // Type and specialization paragraph
  if (parts.typeAndSpecialization) {
    paragraphs.push(parts.typeAndSpecialization);
  }

  // Ratings paragraph
  if (parts.ratings) {
    paragraphs.push(parts.ratings);
  }

  // Review themes paragraph
  if (parts.reviewThemes) {
    paragraphs.push(parts.reviewThemes);
  }

  // Hours information (as a note)
  if (parts.hours) {
    paragraphs.push(parts.hours);
  }

  // description field from bookstores table first
  if (bookstore.description && bookstore.description.trim().length > 0) {
    return bookstore.description.trim();
  }

  // Google description when present
  if (bookstore.googleDescription && bookstore.googleDescription.trim().length > 0) {
    return bookstore.googleDescription.trim();
  }

  // AI-generated description
  if (bookstore.aiGeneratedDescription) {
    return bookstore.aiGeneratedDescription;
  }

  // Otherwise, use our generated content
  return paragraphs.join('\n\n') || generateFallbackContent(bookstore);
}

/**
 * Generate individual content parts
 */
function generateContentParts(bookstore: Bookstore): ContentParts {
  return {
    location: generateLocationContent(bookstore),
    typeAndSpecialization: generateTypeContent(bookstore),
    ratings: generateRatingsContent(bookstore),
    reviewThemes: generateReviewThemesContent(bookstore),
    hours: generateHoursContent(bookstore),
  };
}

// ===========================================
// CONTENT PART GENERATORS
// ===========================================

/**
 * Generate location-focused content
 */
function generateLocationContent(bookstore: Bookstore): string {
  const { name, city, state, county, street } = bookstore;

  let content = `${name} is an independent bookshop located in ${city}, ${state}`;

  if (county) {
    content += `, in ${county} County`;
  }

  content += '.';

  // Add address context if helpful
  if (street) {
    content += ` You can find them at ${street}.`;
  }

  return content;
}

/**
 * Generate content about bookstore type and specialization
 */
function generateTypeContent(bookstore: Bookstore): string {
  const { googleTypes, featureIds } = bookstore;

  const parts: string[] = [];

  // Infer from Google types
  if (googleTypes && googleTypes.length > 0) {
    const relevantTypes = googleTypes.filter(t =>
      t.includes('book') || t.includes('library') || t.includes('store')
    );

    if (relevantTypes.length > 0) {
      parts.push('This establishment is recognized as a local bookstore');
    }
  }

  // Add feature-based content
  if (featureIds && featureIds.length > 0) {
    const featureDescriptions = getFeatureDescriptions(featureIds);
    if (featureDescriptions.length > 0) {
      parts.push(`They offer ${featureDescriptions.join(', ')}`);
    }
  }

  return parts.join('. ') + (parts.length > 0 ? '.' : '');
}

/**
 * Generate ratings-focused content
 */
function generateRatingsContent(bookstore: Bookstore): string {
  const { googleRating, googleReviewCount, name } = bookstore;

  if (!googleRating) return '';

  const rating = parseFloat(googleRating);
  if (isNaN(rating)) return '';

  let content = '';

  if (rating >= 4.5) {
    content = `${name} is highly regarded by the local community`;
  } else if (rating >= 4.0) {
    content = `${name} is well-reviewed by visitors`;
  } else if (rating >= 3.5) {
    content = `${name} has received positive feedback from customers`;
  } else {
    return '';
  }

  content += `, with a rating of ${rating} out of 5`;

  if (googleReviewCount && googleReviewCount > 0) {
    content += ` based on ${googleReviewCount} reviews`;
  }

  content += '.';

  return content;
}

/**
 * Generate content from review themes
 * This would use stored review_themes from database if available
 */
function generateReviewThemesContent(bookstore: Bookstore): string {
  const { googleReviews } = bookstore;

  // If we have reviews, extract common themes
  if (googleReviews && Array.isArray(googleReviews) && googleReviews.length > 0) {
    const themes = extractReviewThemes(googleReviews);
    if (themes.length > 0) {
      return `Visitors often mention ${themes.join(', ')}.`;
    }
  }

  return '';
}

/**
 * Generate hours information content
 */
function generateHoursContent(bookstore: Bookstore): string {
  const { openingHoursJson } = bookstore;

  if (!openingHoursJson) return '';

  const { weekday_text, open_now } = openingHoursJson;

  if (weekday_text && weekday_text.length > 0) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = weekday_text.find(h => h.startsWith(today));

    if (todayHours) {
      const openStatus = open_now ? 'currently open' : 'currently closed';
      return `${openStatus}. ${todayHours}`;
    }
  }

  return '';
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get human-readable feature descriptions
 */
function getFeatureDescriptions(featureIds: number[]): string[] {
  // Map feature IDs to descriptions
  // This should match your features table
  const featureMap: Record<number, string> = {
    1: 'events and author readings',
    2: 'a café or coffee shop',
    3: 'used and rare books',
    4: 'children\'s books section',
    5: 'online ordering',
    6: 'gift items and stationery',
    7: 'local author spotlight',
    8: 'book clubs',
    9: 'magazines and periodicals',
    10: 'textbooks and academic books',
  };

  return featureIds
    .map(id => featureMap[id])
    .filter(Boolean);
}

/**
 * Extract common themes from reviews
 */
function extractReviewThemes(reviews: Array<{ text: string; rating: number }>): string[] {
  const themes: string[] = [];
  const positiveReviews = reviews.filter(r => r.rating >= 4);

  // Common positive phrases to look for
  const patterns = [
    { regex: /selection|variety|collection/i, theme: 'a great book selection' },
    { regex: /staff|helpful|friendly/i, theme: 'friendly and helpful staff' },
    { regex: /cozy|atmosphere|vibe/i, theme: 'a cozy atmosphere' },
    { regex: /kid|children|family/i, theme: 'being family-friendly' },
    { regex: /local|community/i, theme: 'supporting the local community' },
    { regex: /coffee|café|tea/i, theme: 'their café offerings' },
    { regex: /event|reading|signing/i, theme: 'hosting author events' },
    { regex: /recommend/i, theme: 'great book recommendations' },
  ];

  const reviewText = positiveReviews.map(r => r.text).join(' ').toLowerCase();

  for (const pattern of patterns) {
    if (pattern.regex.test(reviewText) && !themes.includes(pattern.theme)) {
      themes.push(pattern.theme);
      if (themes.length >= 3) break; // Limit to 3 themes
    }
  }

  return themes;
}

/**
 * Generate fallback content when no other data is available
 */
function generateFallbackContent(bookstore: Bookstore): string {
  const { name, city, state } = bookstore;
  return `${name} is an independent bookshop serving the ${city}, ${state} community. Stop by to discover your next favorite book and support local bookselling.`;
}

// ===========================================
// ADDITIONAL CONTENT GENERATORS
// ===========================================

/**
 * Generate a short tagline for the bookstore
 */
export function generateBookstoreTagline(bookstore: Bookstore): string {
  const { name, city, state, googleRating } = bookstore;

  if (googleRating && parseFloat(googleRating) >= 4.5) {
    return `Highly-rated independent bookshop in ${city}, ${state}`;
  }

  return `Independent bookshop serving ${city}, ${state}`;
}

/**
 * Generate nearby areas text for internal linking
 */
export function generateNearbyAreasText(
  bookstore: Bookstore,
  nearbyBookstores: Array<{ city: string; state: string; count: number }>
): string {
  if (nearbyBookstores.length === 0) return '';

  const areas = nearbyBookstores
    .slice(0, 3)
    .map(b => `${b.city} (${b.count} bookshops)`);

  return `Also explore bookshops in nearby areas: ${areas.join(', ')}.`;
}

/**
 * Generate meta description snippet
 */
export function generateMetaSnippet(bookstore: Bookstore): string {
  const { name, city, state, googleRating } = bookstore;

  let snippet = `Visit ${name} in ${city}, ${state}`;

  if (googleRating) {
    const rating = parseFloat(googleRating);
    if (rating >= 4.0) {
      snippet += ` - ${rating}★ rating`;
    }
  }

  snippet += '. Hours, location, and reviews.';

  return snippet;
}
