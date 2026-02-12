import { Metadata } from 'next';
import { getFilteredBookstores, getStates, getStateDisplayName } from '@/lib/data/bookstore-data';
import DirectoryClient from './DirectoryClient';

type SearchParams = {
  state?: string;
  city?: string;
  county?: string;
  features?: string;
};

type Props = {
  searchParams: Promise<SearchParams> | SearchParams;
};

/**
 * Generate dynamic metadata based on URL parameters
 * This ensures /directory?state=CA and /directory?state=TX have different meta tags!
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  // Handle searchParams - in Next.js 15+, searchParams might be a Promise
  const resolvedParams = searchParams instanceof Promise ? await searchParams : searchParams;
  const { state, city, county } = resolvedParams;

  // City + State specific metadata
  if (state && city) {
    return {
      title: `Independent Bookshops in ${city}, ${state} | IndiebookShop.com`,
      description: `Find independent bookstores in ${city}, ${state}. Browse local bookshops with events, author signings, and curated selections.`,
      openGraph: {
        title: `Indie Bookshops in ${city}, ${state}`,
        description: `Discover ${city}'s best independent bookstores. Support local businesses and find your next great read.`,
        url: `https://www.indiebookshop.com/directory?state=${state}&city=${city}`,
      },
    };
  }

  // County + State specific metadata
  if (state && county) {
    return {
      title: `Independent Bookshops in ${county}, ${state} | IndiebookShop.com`,
      description: `Directory of independent bookstores in ${county}, ${state}. Find local bookshops near you.`,
      openGraph: {
        title: `Indie Bookshops in ${county}, ${state}`,
        description: `Browse independent bookstores throughout ${county}, ${state}.`,
        url: `https://www.indiebookshop.com/directory?state=${state}&county=${county}`,
      },
    };
  }

  // State specific metadata
  if (state) {
    return {
      title: `Independent Bookshops in ${state} | IndiebookShop.com`,
      description: `Comprehensive directory of independent bookstores in ${state}. Find local bookshops across ${state} with events, signings, and unique book selections.`,
      openGraph: {
        title: `Indie Bookshops in ${state}`,
        description: `Discover independent bookstores throughout ${state}. Support local businesses and find your next great read.`,
        url: `https://www.indiebookshop.com/directory?state=${state}`,
      },
    };
  }

  // Default directory metadata
  return {
    title: 'Bookshop Directory | IndiebookShop.com',
    description: 'Browse our complete directory of 3,000+ independent bookshops across America. Find indie bookstores by location, features, and more.',
    openGraph: {
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
  // Handle searchParams - in Next.js 15+, searchParams might be a Promise
  const resolvedParams = searchParams instanceof Promise ? await searchParams : searchParams;

  // Parse features from comma-separated string to number array
  const features = resolvedParams.features
    ? resolvedParams.features.split(',').map(f => parseInt(f.trim(), 10)).filter(n => !isNaN(n))
    : undefined;

  // Fetch initial data server-side
  const [bookstores, states] = await Promise.all([
    getFilteredBookstores({
      state: resolvedParams.state,
      city: resolvedParams.city,
      county: resolvedParams.county,
      features,
    }),
    getStates(),
  ]);

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
    <div className="h-[calc(100vh-5rem)] min-h-[300px] md:min-h-[calc(100vh-6rem)]">
      {/* H1 for SEO - Hidden but accessible */}
      <h1 className="sr-only">{pageTitle}</h1>

      {/* Client Component with interactive map */}
      <DirectoryClient
        initialBookstores={bookstores}
        initialStates={states}
        initialFilters={resolvedParams}
      />
    </div>
  );
}

// Revalidate every hour (aligned with data layer cache)
export const revalidate = 3600;
