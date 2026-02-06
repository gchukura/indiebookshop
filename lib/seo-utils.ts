// lib/seo-utils.ts
// Shared SEO utilities for consistent metadata across all pages

import { Bookstore } from '@/shared/schema';

// ===========================================
// BOOKSTORE SEO UTILITIES
// ===========================================

/**
 * Generate optimized title for bookstore detail page
 */
export function generateBookstoreTitle(bookstore: Bookstore): string {
  const { name, city, state } = bookstore;
  return `${name} | Independent Bookshop in ${city}, ${state}`;
}

/**
 * Generate enhanced description for bookstore detail page
 */
export function generateBookstoreDescription(bookstore: Bookstore): string {
  const { name, city, state, description, googleRating, googleReviewCount } = bookstore;

  let desc = `Discover ${name}, an independent bookshop located in ${city}, ${state}.`;

  if (googleRating) {
    const rating = parseFloat(googleRating);
    if (rating >= 4.0) {
      desc += ` Rated ${rating}/5`;
      if (googleReviewCount) {
        desc += ` by ${googleReviewCount} readers`;
      }
      desc += '.';
    }
  }

  if (description) {
    // Add first sentence of description if available
    const firstSentence = description.split('.')[0];
    if (firstSentence && firstSentence.length < 100) {
      desc += ` ${firstSentence}.`;
    }
  }

  // Ensure description is not too long for meta description
  if (desc.length > 160) {
    desc = desc.substring(0, 157) + '...';
  }

  return desc;
}

/**
 * Generate keywords for bookstore
 */
export function generateBookstoreKeywords(bookstore: Bookstore): string[] {
  const keywords: string[] = [
    'independent bookshop',
    'bookstore',
    bookstore.name,
    bookstore.city,
    bookstore.state,
  ];

  if (bookstore.county) {
    keywords.push(bookstore.county);
  }

  keywords.push(
    `bookshop ${bookstore.city}`,
    `bookstore ${bookstore.state}`,
    `indie bookshop ${bookstore.city}`,
  );

  return keywords;
}

// ===========================================
// LOCATION PAGE SEO UTILITIES
// ===========================================

/**
 * Generate title for state page
 */
export function generateStatePageTitle(state: string, count: number): string {
  return `Independent Bookshops in ${state} | ${count} Local Bookstores`;
}

/**
 * Generate description for state page
 */
export function generateStatePageDescription(state: string, count: number): string {
  return `Explore ${count} independent bookshops across ${state}. Find local bookstores with unique collections, cozy reading nooks, and community events near you.`;
}

/**
 * Generate title for city page
 */
export function generateCityPageTitle(city: string, state: string, count: number): string {
  return `Bookshops in ${city}, ${state} | ${count} Independent Bookstores`;
}

/**
 * Generate description for city page
 */
export function generateCityPageDescription(city: string, state: string, count: number): string {
  return `Discover ${count} independent bookshops in ${city}, ${state}. Browse local bookstores offering new and used books, author events, and more.`;
}

/**
 * Generate title for county page
 */
export function generateCountyPageTitle(county: string, state: string, count: number): string {
  return `Bookshops in ${county} County, ${state} | ${count} Local Stores`;
}

/**
 * Generate description for county page
 */
export function generateCountyPageDescription(county: string, state: string, count: number): string {
  return `Find ${count} independent bookshops in ${county} County, ${state}. Discover local bookstores with curated selections and community events.`;
}

// ===========================================
// STRUCTURED DATA GENERATORS
// ===========================================

/**
 * Generate LocalBusiness structured data for a bookstore
 */
export function generateBookstoreStructuredData(bookstore: Bookstore, baseUrl: string): object {
  const structuredData: any = {
    '@context': 'https://schema.org',
    '@type': 'BookStore',
    name: bookstore.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: bookstore.street,
      addressLocality: bookstore.city,
      addressRegion: bookstore.state,
      postalCode: bookstore.zip,
      addressCountry: 'US',
    },
    url: `${baseUrl}/bookshop/${bookstore.slug || generateSlugFromName(bookstore.name)}`,
  };

  // Add optional fields
  if (bookstore.latitude && bookstore.longitude) {
    structuredData.geo = {
      '@type': 'GeoCoordinates',
      latitude: parseFloat(bookstore.latitude),
      longitude: parseFloat(bookstore.longitude),
    };
  }

  if (bookstore.phone || bookstore.formattedPhone) {
    structuredData.telephone = bookstore.formattedPhone || bookstore.phone;
  }

  if (bookstore.website) {
    structuredData.sameAs = bookstore.website;
  }

  if (bookstore.description || bookstore.aiGeneratedDescription) {
    structuredData.description = bookstore.aiGeneratedDescription || bookstore.description;
  }

  if (bookstore.imageUrl) {
    structuredData.image = bookstore.imageUrl;
  }

  if (bookstore.googleRating) {
    structuredData.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: parseFloat(bookstore.googleRating),
      bestRating: '5',
      worstRating: '1',
      ratingCount: bookstore.googleReviewCount || 1,
    };
  }

  if (bookstore.openingHoursJson?.weekday_text) {
    structuredData.openingHours = bookstore.openingHoursJson.weekday_text;
  }

  return structuredData;
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbStructuredData(
  items: Array<{ name: string; url: string }>,
  baseUrl: string
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Generate Organization structured data
 */
export function generateOrganizationStructuredData(baseUrl: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'IndieBookShop',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: 'Discover independent bookshops across America. Find local bookstores with unique collections, cozy reading nooks, and community events.',
    sameAs: [
      // Add social media links here
    ],
  };
}

/**
 * Generate WebSite structured data for homepage
 */
export function generateWebSiteStructuredData(baseUrl: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'IndieBookShop',
    url: baseUrl,
    description: 'Find independent bookshops near you',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/directory?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate ItemList structured data for location pages
 */
export function generateItemListStructuredData(
  bookstores: Bookstore[],
  baseUrl: string
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: bookstores.length,
    itemListElement: bookstores.slice(0, 10).map((bookstore, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'BookStore',
        name: bookstore.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: bookstore.city,
          addressRegion: bookstore.state,
        },
        url: `${baseUrl}/bookshop/${bookstore.slug || generateSlugFromName(bookstore.name)}`,
      },
    })),
  };
}

// ===========================================
// CANONICAL URL UTILITIES
// ===========================================

/**
 * Generate canonical URL for bookstore
 */
export function generateBookstoreCanonicalUrl(bookstore: Bookstore, baseUrl: string): string {
  const slug = bookstore.slug || generateSlugFromName(bookstore.name);
  return `${baseUrl}/bookshop/${slug}`;
}

/**
 * Generate canonical URL for state page
 */
export function generateStateCanonicalUrl(state: string, baseUrl: string): string {
  const slug = state.toLowerCase().replace(/\s+/g, '-');
  return `${baseUrl}/state/${slug}`;
}

/**
 * Generate canonical URL for city page
 */
export function generateCityCanonicalUrl(city: string, state: string, baseUrl: string): string {
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  const stateSlug = state.toLowerCase().replace(/\s+/g, '-');
  return `${baseUrl}/city/${stateSlug}/${citySlug}`;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Generate slug from bookstore name
 */
function generateSlugFromName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

/**
 * Get base URL from environment
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://indiebookshop.com';
}
