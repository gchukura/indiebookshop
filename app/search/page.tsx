import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import LocationBreadcrumbs from '@/components/location/LocationBreadcrumbs';
import BookshopCard from '@/components/bookshop/BookshopCard';
import SearchBox from '@/components/search/SearchBox';
import { getProcessedBookstoreData } from '@/lib/data/bookstore-data';
import { getFeatureIndex } from '@/lib/data/features';
import { getLocationIndex } from '@/lib/data/locations';
import { searchPlaces, searchShops } from '@/lib/data/search';
import { BRAND, fitTitle } from '@/lib/seo';

const MAX_RESULTS = 100;

type Props = { searchParams: Promise<{ q?: string }> };

const cleanQuery = (q?: string) => (q ?? '').trim().slice(0, 80);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = cleanQuery((await searchParams).q);
  return {
    title: { absolute: q ? fitTitle([`Search results for “${q}” | ${BRAND}`, `Search results for “${q}”`]) : `Search | ${BRAND}` },
    description: q ? `Independent bookshops matching “${q}”.` : 'Search independent bookshops by name, city, or state.',
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = cleanQuery((await searchParams).q);
  const [data, locations, featureLinks] = await Promise.all([
    getProcessedBookstoreData(),
    getLocationIndex(),
    getFeatureIndex().then(f => f.links).catch(() => ({})),
  ]);
  const places = q ? searchPlaces(locations, q, 3) : [];
  const shops = q ? searchShops(data.all, q, MAX_RESULTS + 1) : [];
  const more = shops.length > MAX_RESULTS;

  return (
    <div className="min-h-screen bg-gray-50">
      <LocationBreadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Search', href: q ? `/search?q=${encodeURIComponent(q)}` : '/search' },
        ]}
      />
      <main className="container-site py-10 md:py-14 space-y-8">
        <header>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown">
            {q ? <>Search results for “{q}”</> : 'Search bookshops'}
          </h1>
          <div className="mt-6">
            <SearchBox defaultValue={q} />
          </div>
        </header>

        {places.length > 0 && (
          <ul className="space-y-3" aria-label="Places">
            {places.map(place => (
              <li key={place.href}>
                <Link
                  href={place.href}
                  className="group flex items-center gap-3 rounded-lg bg-brand-cream px-5 py-4 text-brand-brown hover:bg-brand-teal hover:text-white transition-colors"
                >
                  <MapPin className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">Browse all bookshops in {place.label}</span>{' '}
                    <span className="text-sm text-gray-600 group-hover:text-white">({place.count})</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {q && (
          <section aria-labelledby="results-heading">
            <h2 id="results-heading" className="font-serif text-2xl font-bold text-brand-brown mb-4">
              {shops.length === 0
                ? 'No bookshops found'
                : more
                  ? `Top ${MAX_RESULTS} bookshops`
                  : `${shops.length} bookshop${shops.length === 1 ? '' : 's'}`}
            </h2>
            {shops.length === 0 ? (
              <p className="text-gray-700">
                Try a shop’s name, a city, or a state — or{' '}
                <Link href="/bookshops" className="text-brand-teal hover:underline">
                  browse by state
                </Link>
                .
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {shops.slice(0, MAX_RESULTS).map(shop => (
                  <BookshopCard key={shop.id} bookshop={shop} featureLinks={featureLinks} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
