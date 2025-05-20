/**
 * Utility functions for internal linking and navigation
 */

import { Bookstore as Bookshop, Feature } from "@shared/schema";

/**
 * Generate an SEO-friendly URL slug for a bookshop
 * 
 * @param id The bookshop ID
 * @param name The bookshop name
 * @returns URL-friendly string with format: /bookshop/bookshop-name
 */
export function generateBookshopSlug(id: number, name: string): string {
  // Convert bookshop name to URL-friendly format
  const nameSlug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
    .trim();                  // Trim leading/trailing spaces
    
  // Use the name in the URL but hide ID at the end with a prefix 
  // for better SEO while maintaining ability to find the right bookshop
  return `/bookshop/${nameSlug}-id${id}`;
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
 * Generates related event links for a bookshop
 * 
 * @param bookshopId ID of the current bookshop
 * @param bookshopName Name of the current bookshop
 * @returns Object with event-related links
 */
export function generateEventLinks(
  bookshopId: number,
  bookshopName: string
): Array<{ title: string; url: string; description: string }> {
  return [
    {
      title: `Events at ${bookshopName}`,
      url: `${generateBookshopSlug(bookshopId, bookshopName)}/events`,
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