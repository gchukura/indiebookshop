import { MetadataRoute } from 'next';
import {
  getProcessedBookstoreData,
  generateSlugFromName,
} from '@/lib/data/bookstore-data';
import { safeMapKeys, safeMapGet } from '@/lib/data/cache-utils';

/**
 * Generate comprehensive sitemap.xml for SEO
 * Uses shared processed data to ensure consistency with pages
 * Next.js automatically serves this at /sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.indiebookshop.com';

  try {
    // Use shared processed data (same cache as all pages)
    const data = await getProcessedBookstoreData();

    // ===========================================
    // STATIC PAGES
    // ===========================================

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
      {
        url: `${baseUrl}/submit`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.4,
      },
      {
        url: `${baseUrl}/submit-event`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.4,
      },
    ];

    // ===========================================
    // STATE PAGES (only states with bookstores)
    // ===========================================

    const statePages: MetadataRoute.Sitemap = data.states.map((state) => ({
      url: `${baseUrl}/state/${encodeURIComponent(state.toLowerCase().replace(/\s+/g, '-'))}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Also add state-filtered directory pages for backward compatibility
    const stateDirectoryPages: MetadataRoute.Sitemap = data.states.map((state) => ({
      url: `${baseUrl}/directory?state=${encodeURIComponent(state)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));

    // ===========================================
    // CITY PAGES (only cities with bookstores)
    // ===========================================

    const cityPages: MetadataRoute.Sitemap = [];
    for (const key of safeMapKeys(data.byCity)) {
      const bookstores = safeMapGet(data.byCity, key) || [];
      if (bookstores.length > 0) {
        const [city, state] = key.split('-');
        const citySlug = city.replace(/\s+/g, '-');
        const stateSlug = state.replace(/\s+/g, '-');
        cityPages.push({
          url: `${baseUrl}/city/${stateSlug}/${citySlug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }

    // ===========================================
    // COUNTY PAGES (only counties with bookstores)
    // ===========================================

    const countyPages: MetadataRoute.Sitemap = [];
    for (const key of safeMapKeys(data.byCounty)) {
      const bookstores = safeMapGet(data.byCounty, key) || [];
      if (bookstores.length > 0) {
        const [county, state] = key.split('-');
        const countySlug = county.replace(/\s+/g, '-');
        const stateSlug = state.replace(/\s+/g, '-');
        countyPages.push({
          url: `${baseUrl}/county/${stateSlug}/${countySlug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.65,
        });
      }
    }

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
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));

    // ===========================================
    // FEATURE PAGES (if feature landing pages exist)
    // ===========================================

    const featurePages: MetadataRoute.Sitemap = [];
    for (const key of safeMapKeys(data.byFeature)) {
      const bookstores = safeMapGet(data.byFeature, key) || [];
      if (bookstores.length > 0) {
        featurePages.push({
          url: `${baseUrl}/features/${key}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }

    // ===========================================
    // COMBINE ALL PAGES
    // ===========================================

    console.log(`[Sitemap] Generated: ${staticPages.length} static, ${statePages.length} states, ${cityPages.length} cities, ${countyPages.length} counties, ${bookshopPages.length} bookshops`);

    return [
      ...staticPages,
      ...statePages,
      ...stateDirectoryPages,
      ...cityPages,
      ...countyPages,
      ...bookshopPages,
      ...featurePages,
    ];
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

// Revalidate sitemap every 24 hours
// Uses same cache as pages (1 hour) but sitemap regenerates daily
export const revalidate = 86400;
