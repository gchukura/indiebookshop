/**
 * Utility functions for internal linking and navigation
 */

import { Bookstore as Bookshop, Feature } from "@shared/schema";

/**
 * Generate a clean SEO-friendly URL slug for a bookshop
 * 
 * @param id The bookshop ID (retained for data tracking but not used in URL)
 * @param name The bookshop name
 * @returns URL-friendly string with format: /bookshop/bookshop-name
 */
export function generateBookshopSlug(id: number, name: string): string {
  // Use only the name in the URL for maximum SEO benefit
  // The ID is not included in the URL, but is used in the component for data fetching
  return `/bookshop/${generateSlugFromName(name)}`;
}

/**
 * Extracts a clean slug from a bookshop name
 * 
 * @param name The bookshop name
 * @returns A URL-friendly slug
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
    .trim();                  // Trim leading/trailing spaces
}

/**
 * Generates a list of related links for a bookshop based on its features, city, and state
 * 
 * @param bookshop The current bookshop
 * @param allFeatures List of all available features
 * @returns Array of related link objects with title and URL
 */
export function generateRelatedLinks(
  bookshop: Bookshop,
  allFeatures: Feature[]
): Array<{ title: string; url: string; description: string }> {
  const links: Array<{ title: string; url: string; description: string }> = [];

  // Add link to state directory
  links.push({
    title: `All Bookshops in ${bookshop.state}`,
    url: `/directory/state/${bookshop.state}`,
    description: `Discover more independent bookshops in ${bookshop.state}`
  });

  // Add link to city directory
  links.push({
    title: `Bookshops in ${bookshop.city}`,
    url: `/directory/city/${encodeURIComponent(bookshop.city)}`,
    description: `Find more indie bookshops in ${bookshop.city}, ${bookshop.state}`
  });

  // Add links for each feature the bookshop has
  if (bookshop.featureIds && allFeatures?.length > 0) {
    // Get up to 3 features for the bookshop
    const bookshopFeatures = allFeatures
      .filter(feature => bookshop.featureIds?.includes(feature.id))
      .slice(0, 3);

    bookshopFeatures.forEach(feature => {
      links.push({
        title: `Bookshops with ${feature.name}`,
        url: `/directory/category/${feature.id}`,
        description: `Find more bookshops with ${feature.name.toLowerCase()} areas or services`
      });
    });
  }

  return links;
}

/**
 * Generates breadcrumb data for a bookshop detail page
 * 
 * @param bookshop The current bookshop
 * @param baseUrl The base URL of the site
 * @returns Array of breadcrumb items for navigation and Schema.org
 */
export function generateBreadcrumbs(
  bookshop: Bookshop,
  baseUrl: string
): Array<{ position: number; name: string; item: string }> {
  return [
    {
      position: 1,
      name: 'Home',
      item: baseUrl
    },
    {
      position: 2,
      name: 'Directory',
      item: `${baseUrl}/directory`
    },
    {
      position: 3,
      name: bookshop.state,
      item: `${baseUrl}/directory/state/${bookshop.state}`
    },
    {
      position: 4,
      name: bookshop.city,
      item: `${baseUrl}/directory/city/${encodeURIComponent(bookshop.city)}`
    },
    {
      position: 5,
      name: bookshop.name,
      item: `${baseUrl}${generateBookshopSlug(bookshop.id, bookshop.name)}`
    }
  ];
}

/**
 * Generates a URL for a county directory page
 * 
 * @param county The county name
 * @param state Optional state name for county-state combined URLs
 * @returns URL string for county directory
 */
export function generateCountyUrl(county: string, state?: string): string {
  // Format the county name for URL
  const formattedCounty = county.toLowerCase().replace(/\s+/g, '-');
  
  if (state) {
    // Format the state name for URL
    const formattedState = state.toLowerCase().replace(/\s+/g, '-');
    return `/directory/county-state/${formattedCounty}-${formattedState}`;
  }
  
  return `/directory/county/${formattedCounty}`;
}

/**
 * Generates related event links for a bookshop
 * 
 * @param bookshopIdentifier ID or slug of the current bookshop
 * @param bookshopName Name of the current bookshop
 * @returns Object with event-related links
 */
export function generateEventLinks(
  bookshopIdentifier: number | string,
  bookshopName: string
): Array<{ title: string; url: string; description: string }> {
  // Create the bookshop URL
  let bookshopUrl: string;
  
  if (typeof bookshopIdentifier === 'number') {
    // If it's a number, it's an ID, generate a slug from name
    bookshopUrl = generateBookshopSlug(bookshopIdentifier, bookshopName);
  } else {
    // If it's a string, assume it's already a slug
    bookshopUrl = `/bookshop/${bookshopIdentifier}`;
  }
  
  return [
    {
      title: `Events at ${bookshopName}`,
      url: `${bookshopUrl}/events`,
      description: `View upcoming literary events, author signings, and book clubs at ${bookshopName}`
    },
    {
      title: 'All Bookshop Events',
      url: '/events',
      description: 'Browse all literary events at independent bookshops'
    },
    {
      title: 'Submit an Event',
      url: '/submit-event',
      description: 'Add your bookshop event to our directory'
    }
  ];
}