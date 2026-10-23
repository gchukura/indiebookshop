import { Metadata } from 'next';
import { getAllBookstores, getStates } from '@/lib/data/bookstore-data';
import { getFeatureNames } from '@/lib/data/locations';
import { getMapboxToken } from '@/lib/mapbox';
import { getFeatureIndex } from '@/lib/data/features';
import { getStateAbbrev, getStateDisplayName } from '@/lib/state-utils';
import { BRAND, DEFAULT_OG_IMAGE, fitTitle } from '@/lib/seo';
import DirectoryClient, { DirectoryBookstore } from './DirectoryClient';

type SearchParams = {
  state?: string;
  city?: string;
  county?: string;
  features?: string;
  /** Free-text search from the homepage */
  q?: string;
  /** "Use my location" from the homepage: list sorted by distance */
  lat?: string;
  lng?: string;
};

type Props = {
  searchParams: Promise<SearchParams>;
};

/**
 * Generate dynamic metadata based on URL parameters
 * This ensures /directory?state=CA and /directory?state=TX have different meta tags!
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const { state, city, county } = resolvedParams;
  const stateName = state ? getStateDisplayName(state) || state : '';
  const stateAbbrev = state ? getStateAbbrev(state) : '';

  // City + State specific metadata
  if (state && city) {
    return {
      title: { absolute: fitTitle([`Independent Bookshops in ${city}, ${stateName} | ${BRAND}`, `Bookshops in ${city}, ${stateAbbrev} | ${BRAND}`, `Bookshops in ${city}, ${stateAbbrev}`]) },
      description: `Find independent bookstores in ${city}, ${state}. Browse local bookshops with events, author signings, and curated selections.`,
      openGraph: {
        images: [DEFAULT_OG_IMAGE],
        title: `Indie Bookshops in ${city}, ${state}`,
        description: `Discover ${city}'s best independent bookstores. Support local businesses and find your next great read.`,
        url: `https://www.indiebookshop.com/directory?state=${state}&city=${city}`,
      },
    };
  }

  // County + State specific metadata
  if (state && county) {
    return {
      title: { absolute: fitTitle([`Independent Bookshops in ${county}, ${stateName} | ${BRAND}`, `Bookshops in ${county}, ${stateAbbrev} | ${BRAND}`, `Bookshops in ${county}, ${stateAbbrev}`]) },
      description: `Directory of independent bookstores in ${county}, ${state}. Find local bookshops near you.`,
      openGraph: {
        images: [DEFAULT_OG_IMAGE],
        title: `Indie Bookshops in ${county}, ${state}`,
        description: `Browse independent bookstores throughout ${county}, ${state}.`,
        url: `https://www.indiebookshop.com/directory?state=${state}&county=${county}`,
      },
    };
  }

  // State specific metadata
  if (state) {
    return {
      title: { absolute: fitTitle([`Independent Bookshops in ${stateName} | ${BRAND}`, `Bookshops in ${stateName} | ${BRAND}`]) },
      description: `Comprehensive directory of independent bookstores in ${state}. Find local bookshops across ${state} with events, signings, and unique book selections.`,
      openGraph: {
        images: [DEFAULT_OG_IMAGE],
        title: `Indie Bookshops in ${state}`,
        description: `Discover independent bookstores throughout ${state}. Support local businesses and find your next great read.`,
        url: `https://www.indiebookshop.com/directory?state=${state}`,
      },
    };
  }

  // Default directory metadata
  return {
    title: { absolute: `Bookshop Directory | ${BRAND}` },
    description: 'Browse our complete directory of 3,000+ independent bookshops across America. Find indie bookstores by location, features, and more.',
    openGraph: {
      images: [DEFAULT_OG_IMAGE],
      title: 'Independent Bookshop Directory',
      description: 'Discover 3,000+ independent bookstores across America. Filter by location and features.',
      url: 'https://www.indiebookshop.com/directory',
    },
  };
}

/**
 * Directory Page - Server Component
 *
 * Fetches initial data server-side, then hydrates client components
 * with the interactive map and filters.
 */
export default async function DirectoryPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;

  // Every shop goes to the client, which applies the ?state/city/county/features
  // filters itself — so changing a filter never needs a server round trip.
  const [bookstoresFull, states, { features }, featureLinks] = await Promise.all([
    getAllBookstores(),
    getStates(),
    getFeatureNames(),
    getFeatureIndex().then(f => f.links).catch(() => ({})),
  ]);

  // Slim down to only the fields DirectoryClient actually uses.
  // This keeps the RSC payload around ~500 KB.
  const bookstores: DirectoryBookstore[] = bookstoresFull.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug ?? null,
    city: b.city,
    state: b.state,
    county: b.county ?? null,
    latitude: b.latitude ?? null,
    longitude: b.longitude ?? null,
    imageUrl: b.imageUrl ?? null,
    googleRating: b.googleRating ?? null,
    googleReviewCount: b.googleReviewCount ?? null,
    featureIds: b.featureIds ?? [],
  }));

  // Generate page title based on filters (state may be abbrev; show full name when available)
  let pageTitle = 'Bookshop Directory';
  if (resolvedParams.city && resolvedParams.state) {
    const stateLabel = getStateDisplayName(resolvedParams.state) || resolvedParams.state;
    pageTitle = `Independent Bookshops in ${resolvedParams.city}, ${stateLabel}`;
  } else if (resolvedParams.state) {
    const stateLabel = getStateDisplayName(resolvedParams.state) || resolvedParams.state;
    pageTitle = `Independent Bookshops in ${stateLabel}`;
  }

  return (
    // Phones: the page scrolls (sticky toolbar, list in flow). Desktop: a full-height map with a side panel.
    <div className="md:h-[calc(100dvh-6rem)] md:min-h-[480px] md:flex md:flex-col">
      {/* H1 for SEO - Hidden but accessible */}
      <h1 className="sr-only">{pageTitle}</h1>

      {/* Client Component with interactive map */}
      <DirectoryClient
        initialBookstores={bookstores}
        initialStates={states}
        features={features.map(f => ({ id: f.id, name: f.name }))}
        featureLinks={featureLinks}
        mapboxToken={getMapboxToken()}
        initialFilters={resolvedParams}
      />
    </div>
  );
}

// Revalidate every hour (aligned with data layer cache)
export const revalidate = 3600;
