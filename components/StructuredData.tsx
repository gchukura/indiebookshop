import React from 'react';
import { Bookstore } from '@/shared/schema';

type LocalBusinessSchemaProps = {
  bookstore: Bookstore;
};

/**
 * Generate Schema.org LocalBusiness structured data for a bookstore
 * This helps search engines understand the business information
 */
export function LocalBusinessSchema({ bookstore }: LocalBusinessSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BookStore',
    name: bookstore.name,
    description: bookstore.googleDescription || bookstore.aiGeneratedDescription || bookstore.description || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: bookstore.street,
      addressLocality: bookstore.city,
      addressRegion: bookstore.state,
      postalCode: bookstore.zip,
      addressCountry: 'US',
    },
    geo:
      bookstore.latitude && bookstore.longitude
        ? {
            '@type': 'GeoCoordinates',
            latitude: parseFloat(bookstore.latitude),
            longitude: parseFloat(bookstore.longitude),
          }
        : undefined,
    telephone: bookstore.phone,
    url: bookstore.website,
    priceRange: bookstore.googlePriceLevel ? '$'.repeat(bookstore.googlePriceLevel) : undefined,
    aggregateRating:
      bookstore.googleRating && bookstore.googleReviewCount
        ? {
            '@type': 'AggregateRating',
            ratingValue: parseFloat(bookstore.googleRating),
            reviewCount: bookstore.googleReviewCount,
            bestRating: 5,
          }
        : undefined,
    openingHoursSpecification: bookstore.openingHoursJson?.weekday_text
      ? bookstore.openingHoursJson.weekday_text.map((hours) => {
          const [day, time] = hours.split(': ');
          const timeRange = time && time !== 'Closed' ? time.split('–') : null;

          return {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: day,
            opens: timeRange ? timeRange[0]?.trim() : undefined,
            closes: timeRange ? timeRange[1]?.trim() : undefined,
          };
        })
      : undefined,
  };

  // Remove undefined values
  const cleanedSchema = JSON.parse(JSON.stringify(schema));

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanedSchema) }} />;
}

/**
 * Generate Schema.org BreadcrumbList structured data
 */
export function BreadcrumbSchema({ items }: { items: Array<{ name: string; url: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

/**
 * Generate Schema.org Organization structured data for homepage
 * Helps search engines understand the business/organization
 */
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'IndiebookShop.com',
    alternateName: 'Indie Book Shop',
    url: 'https://www.indiebookshop.com',
    logo: 'https://www.indiebookshop.com/logo.png',
    description: 'Comprehensive directory of over 3,000 independent bookstores across America. Find and support local indie bookshops in your community.',
    foundingDate: '2024',
    sameAs: [
      // Add social media profiles here when available
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@bluestonebrands.com',
      contactType: 'customer service',
      areaServed: 'US',
    },
    areaServed: {
      '@type': 'Country',
      name: 'United States',
    },
    knowsAbout: [
      'Independent Bookstores',
      'Indie Bookshops',
      'Local Bookstores',
      'Book Shops',
      'Book Discovery',
    ],
  };

  // Remove empty sameAs array if no social profiles
  const cleanedSchema = JSON.parse(JSON.stringify(schema));
  if (cleanedSchema.sameAs && cleanedSchema.sameAs.length === 0) {
    delete cleanedSchema.sameAs;
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanedSchema) }} />;
}

/**
 * Generate Schema.org WebSite structured data with SearchAction
 * Enables search box in Google results
 */
export function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'IndiebookShop.com',
    url: 'https://www.indiebookshop.com',
    description: 'Find and support over 3,000 independent bookstores across America',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.indiebookshop.com/directory?state={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
