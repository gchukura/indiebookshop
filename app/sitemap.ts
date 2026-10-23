import { MetadataRoute } from 'next';
import { getProcessedBookstoreData } from '@/lib/data/bookstore-data';
import { getBookstoreSlug } from '@/lib/data/slug';
import { getLocationIndex } from '@/lib/data/locations';
import { getFeatureIndex } from '@/lib/data/features';

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
    // LOCATION PAGES (/bookshops/...)
    // These replace the old /directory?state= entries.
    // ===========================================

    const { states } = await getLocationIndex();
    const page = (path: string, priority: number) => ({
      url: `${baseUrl}${path}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority,
    });
    const statePages: MetadataRoute.Sitemap = [
      page('/bookshops', 0.8),
      ...states.map(s => page(`/bookshops/${s.slug}`, 0.8)),
    ];
    const cityPages: MetadataRoute.Sitemap = states.flatMap(s =>
      s.cities.map(c => page(`/bookshops/${s.slug}/${c.slug}`, 0.7))
    );
    const countyPages: MetadataRoute.Sitemap = states.flatMap(s =>
      s.counties.map(c => page(`/bookshops/${s.slug}/county/${c.slug}`, 0.6))
    );

    // Feature pages (/bookshops/features/...) and state + feature pages
    const { index: featureIndex } = await getFeatureIndex();
    const featurePages: MetadataRoute.Sitemap = [
      page('/bookshops/features', 0.7),
      ...featureIndex.features.map(f => page(`/bookshops/features/${f.slug}`, 0.7)),
      ...Object.entries(featureIndex.byState).flatMap(([state, features]) =>
        Object.keys(features).map(feature => page(`/bookshops/${state}/features/${feature}`, 0.6))
      ),
    ];

    // ===========================================
    // BOOKSHOP DETAIL PAGES (deduplicated by slug)
    // ===========================================

    const seenSlugs = new Set<string>();
    const bookshopPages: MetadataRoute.Sitemap = data.all
      .map((b) => ({
        slug: getBookstoreSlug(b),
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

    console.log(`[Sitemap] Generated: ${staticPages.length} static, ${statePages.length} state, ${cityPages.length} city, ${countyPages.length} county, ${featurePages.length} feature, ${bookshopPages.length} bookshops`);

    return [
      ...staticPages,
      ...statePages,
      ...cityPages,
      ...countyPages,
      ...featurePages,
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
