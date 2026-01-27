import { MetadataRoute } from 'next';
import { getAllBookstores, getStates } from '@/lib/queries/bookstores';
import { generateSlugFromName } from '@/shared/utils';

/**
 * Generate sitemap.xml for SEO
 * Next.js automatically serves this at /sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.indiebookshop.com';

  try {
    // Fetch all bookstores and states
    const [bookstores, states] = await Promise.all([getAllBookstores(), getStates()]);

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/directory`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/events`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      },
      {
        url: `${baseUrl}/blog`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      },
    ];

    // State-specific directory pages
    const statePages: MetadataRoute.Sitemap = states.map((state) => ({
      url: `${baseUrl}/directory?state=${state}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // Bookshop detail pages (deduplicated by slug)
    const seenSlugs = new Set<string>();
    const bookshopPages: MetadataRoute.Sitemap = bookstores
      .map((b) => ({
        // Use slug from database if available, fallback to generated
        slug: b.slug || generateSlugFromName(b.name),
        id: b.id,
      }))
      .filter(({ slug }) => {
        if (!slug || seenSlugs.has(slug)) return false;
        seenSlugs.add(slug);
        return true;
      })
      .map(({ slug }) => ({
        url: `${baseUrl}/bookshop/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      }));

    return [...staticPages, ...statePages, ...bookshopPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);

    // Return minimal sitemap on error
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/directory`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
    ];
  }
}

// Revalidate sitemap every 24 hours (bookstore list rarely changes)
// This reduces query frequency from 24x per day to 1x per day
export const revalidate = 86400;
