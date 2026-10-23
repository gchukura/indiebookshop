import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getFeaturedBookstores, getPopularBookstores, getTotalBookstoreCount } from '@/lib/data/bookstore-data';
import { getLocationIndex } from '@/lib/data/locations';
import { getFeatureIndex } from '@/lib/data/features';
import { OrganizationSchema, WebSiteSchema } from '@/components/StructuredData';
import BookshopCard from '@/components/bookshop/BookshopCard';
import HeroSearch from '@/components/home/HeroSearch';

export async function generateMetadata(): Promise<Metadata> {
  const count = await getTotalBookstoreCount().catch(() => 0);
  return {
    title: 'IndiebookShop.com - Discover Independent Bookshops Across America',
    description: `Find and support ${count ? count.toLocaleString('en-US') : 'thousands of'} independent bookstores across America. Discover unique bookshops, browse by location, and support local businesses.`,
    keywords: ['independent bookstores', 'bookshops', 'local bookstores', 'indie bookstores', 'book shops near me'],
  };
}

// Revalidate every hour (aligned with data layer cache)
export const revalidate = 3600;

/** Section with a serif, left-aligned heading and a one-line description. */
function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="py-10 md:py-14">
      <div className="container-site">
        <h2 id={`${id}-heading`} className="font-serif text-2xl md:text-3xl font-bold text-brand-brown">
          {title}
        </h2>
        <p className="mt-1 mb-6 text-gray-600">{description}</p>
        {children}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [total, featured, topRated, { states }, { index: featureIndex, links: featureLinks }] = await Promise.all([
    getTotalBookstoreCount(),
    getFeaturedBookstores(6, 'week'),
    getPopularBookstores(6),
    getLocationIndex(),
    getFeatureIndex().catch(() => ({ index: { features: [], bySlug: {}, byState: {} }, links: {} })),
  ]);

  return (
    <>
      <OrganizationSchema />
      <WebSiteSchema />

      {/* Hero */}
      <section className="bg-brand-cream py-14 md:py-20">
        <div className="container-site">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-brand-brown leading-tight max-w-3xl">
            Find your next independent bookshop
          </h1>
          <p className="mt-4 mb-8 text-lg text-gray-700">
            Search {total.toLocaleString('en-US')} independent bookshops across the United States.
          </p>
          <HeroSearch />
        </div>
      </section>

      <Section id="featured" title="Featured this week" description="A handful of well-loved shops from the directory, chosen fresh each week.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {featured.map(shop => (
            <BookshopCard key={shop.id} bookshop={shop} featureLinks={featureLinks} />
          ))}
        </div>
      </Section>

      <Section id="states" title="Browse by state" description="Every state with independent bookshops in the directory.">
        <ul className="columns-2 sm:columns-3 lg:columns-5 gap-x-8">
          {states.map(state => (
            <li key={state.slug} className="break-inside-avoid py-1">
              <Link href={`/bookshops/${state.slug}`} className="text-brand-teal hover:underline">
                {state.name}
              </Link>{' '}
              <span className="text-sm text-gray-500">{state.shops.length}</span>
            </li>
          ))}
        </ul>
      </Section>

      {featureIndex.features.length > 0 && (
        <Section id="categories" title="Popular categories" description="Cafés, used and rare books, children’s sections, and more.">
          <ul className="flex flex-wrap gap-3">
            {featureIndex.features.map(feature => (
              <li key={feature.slug}>
                <Link
                  href={`/bookshops/features/${feature.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-cream px-4 py-2 text-brand-brown hover:bg-brand-teal hover:text-white transition-colors"
                >
                  <span className="font-semibold">{feature.name}</span>
                  <span className="text-sm opacity-75">{feature.shops.length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="top-rated" title="Top rated" description="The highest-rated shops on Google, with the most reviews breaking ties.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {topRated.map(shop => (
            <BookshopCard key={shop.id} bookshop={shop} featureLinks={featureLinks} />
          ))}
        </div>
      </Section>

      <section className="pb-14 md:pb-20">
        <div className="container-site grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg bg-brand-cream p-6 md:p-8">
            <h2 className="font-serif text-2xl font-bold text-brand-brown">Own a bookshop?</h2>
            <p className="mt-2 mb-5 text-gray-700">Add your shop to the directory, or send us corrections to your listing.</p>
            <Link href="/submit" className={cn(buttonVariants({ variant: 'accent' }), 'px-6')}>
              Add or update a listing
            </Link>
          </div>
          <div className="rounded-lg bg-brand-cream p-6 md:p-8">
            <h2 className="font-serif text-2xl font-bold text-brand-brown">Hosting an event?</h2>
            <p className="mt-2 mb-5 text-gray-700">Tell readers about author visits, readings, and book clubs at your shop.</p>
            <Link href="/submit-event" className={cn(buttonVariants(), 'px-6')}>
              Submit an event
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
