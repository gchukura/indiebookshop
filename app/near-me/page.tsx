import type { Metadata } from 'next';
import Link from 'next/link';
import LocationBreadcrumbs from '@/components/location/LocationBreadcrumbs';
import BookshopCard from '@/components/bookshop/BookshopCard';
import LazyShopsMap from '@/components/bookshop/LazyShopsMap';
import NearMeLocator from '@/components/near-me/NearMeLocator';
import { getProcessedBookstoreData } from '@/lib/data/bookstore-data';
import { getFeatureIndex } from '@/lib/data/features';
import { nearest } from '@/lib/data/geo';
import { toMapShops } from '@/lib/data/location-index';
import { getMapboxToken } from '@/lib/mapbox';
import { BRAND } from '@/lib/seo';
import { cn } from '@/lib/utils';

const RADII = [10, 25, 50, 100];
const DEFAULT_RADIUS = 25;
const MAX_RESULTS = 50;

export const metadata: Metadata = {
  title: { absolute: `Bookshops Near You | ${BRAND}` },
  description: 'Independent bookshops nearest to your location, sorted by distance.',
  // Results depend on the visitor's location; nothing here to index
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ lat?: string; lng?: string; radius?: string }> };

function parseCoords(lat?: string, lng?: string) {
  const la = parseFloat(lat ?? '');
  const ln = parseFloat(lng ?? '');
  return Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 ? { lat: la, lng: ln } : null;
}

export default async function NearMePage({ searchParams }: Props) {
  const params = await searchParams;
  const requested = parseInt(params.radius ?? '', 10);
  const radius = RADII.includes(requested) ? requested : DEFAULT_RADIUS;
  const at = parseCoords(params.lat, params.lng);

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Near me', href: '/near-me' },
  ];

  if (!at) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LocationBreadcrumbs items={crumbs} />
        <main className="container-site py-10 md:py-14">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown mb-6">Bookshops near you</h1>
          <NearMeLocator radius={radius} />
        </main>
      </div>
    );
  }

  const [data, featureLinks] = await Promise.all([
    getProcessedBookstoreData(),
    getFeatureIndex().then(f => f.links).catch(() => ({})),
  ]);
  const within = nearest(data.all, at.lat, at.lng, MAX_RESULTS, radius);
  // Nothing in range: still show the closest few, clearly labelled
  const fallback = within.length ? [] : nearest(data.all, at.lat, at.lng, 6);
  const results = within.length ? within : fallback;
  const coords = `lat=${at.lat}&lng=${at.lng}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <LocationBreadcrumbs items={crumbs} />
      <main className="container-site py-10 md:py-14 space-y-8">
        <header>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown">Bookshops near you</h1>
          <p className="mt-2 text-gray-600" role="status">
            {within.length
              ? `${within.length === MAX_RESULTS ? `The ${MAX_RESULTS} nearest` : within.length} independent bookshop${within.length === 1 ? '' : 's'} within ${radius} miles, nearest first.`
              : `No bookshops within ${radius} miles. Here are the closest ones.`}
          </p>
          <nav aria-label="Search radius" className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">Within</span>
            {RADII.map(r => (
              <Link
                key={r}
                href={`/near-me?${coords}&radius=${r}`}
                aria-current={r === radius ? 'true' : undefined}
                className={cn(
                  'inline-flex min-h-[44px] items-center rounded-full px-4 border transition-colors',
                  r === radius ? 'bg-brand-teal border-brand-teal text-white' : 'border-input bg-white text-gray-700 hover:border-brand-teal'
                )}
              >
                {r} mi
              </Link>
            ))}
          </nav>
        </header>

        <LazyShopsMap
          shops={toMapShops(results.map(r => r.shop))}
          title="Map of bookshops near you"
          mapboxToken={getMapboxToken()}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {results.map(({ shop, miles }) => (
            <BookshopCard key={shop.id} bookshop={shop} featureLinks={featureLinks} distanceMiles={miles} />
          ))}
        </div>
      </main>
    </div>
  );
}
