import { MetadataRoute } from 'next';
import {
  getProcessedBookstoreData,
  generateSlugFromName,
} from '@/lib/data/bookstore-data';

/**
 * Generate comprehensive sitemap.xml for SEO
 * Uses shared processed data to ensure consistency with pages
 * Next.js automatically serves this at /sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.indiebookshop.com';
  // One timestamp per sitemap run so entries don't differ by milliseconds
  const lastModified = new Date();

  try {
    // Use shared processed data (same cache as all pages)
    const data = await getProcessedBookstoreData();

    // ===========================================
    // STATIC PAGES
    // ===========================================

    const staticPages: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified,
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/directory`,
        lastModified,
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/about`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/events`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.6,
      },
      {
        url: `${baseUrl}/blog`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.6,
      },
      {
        url: `${baseUrl}/submit`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.4,
      },
      {
        url: `${baseUrl}/submit-event`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.4,
      },
    ];

    // ===========================================
    // STATE-FILTERED DIRECTORY PAGES
    // ===========================================

    const stateDirectoryPages: MetadataRoute.Sitemap = data.states.map((state) => ({
      url: `${baseUrl}/directory?state=${encodeURIComponent(state)}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));

    // ===========================================
    // BOOKSHOP DETAIL PAGES (deduplicated by slug)
    // ===========================================

    const seenSlugs = new Set<string>();
    const bookshopPages: MetadataRoute.Sitemap = data.all
      .map((b) => ({
        slug: b.slug || generateSlugFromName(b.name),
        id: b.id,
      }))
      .filter(({ slug }) => {
        if (!slug || seenSlugs.has(slug.toLowerCase())) return false;
        seenSlugs.add(slug.toLowerCase());
        return true;
      })
      .map(({ slug }) => ({
        url: `${baseUrl}/bookshop/${slug}`,
        lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));

    // ===========================================
    // COMBINE ALL PAGES
    // ===========================================

    console.log(`[Sitemap] Generated: ${staticPages.length} static, ${stateDirectoryPages.length} state directories, ${bookshopPages.length} bookshops`);

    return [
      ...staticPages,
      ...stateDirectoryPages,
      ...bookshopPages,
    ];
  } catch (error) {
    console.error('Error generating sitemap:', error);

    // Return minimal sitemap on error
    return [
      {
        url: baseUrl,
        lastModified,
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/directory`,
        lastModified,
        changeFrequency: 'daily',
        priority: 0.9,
      },
    ];
  }
}

// Revalidate sitemap every 24 hours
// Uses same cache as pages (1 hour) but sitemap regenerates daily
export const revalidate = 86400;
