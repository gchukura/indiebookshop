import { Metadata } from 'next';
import { getFilteredBookstores, getStates } from '@/lib/queries/bookstores';
import DirectoryClient from './DirectoryClient';

type Props = {
  searchParams: {
    state?: string;
    city?: string;
    county?: string;
    features?: string;
  };
};

/**
 * Generate dynamic metadata based on URL parameters
 * This ensures /directory?state=CA and /directory?state=TX have different meta tags!
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { state, city, county } = searchParams;

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
  // Fetch initial data server-side
  const [bookstores, states] = await Promise.all([
    getFilteredBookstores(searchParams),
    getStates(),
  ]);

  // Generate page title based on filters
  let pageTitle = 'Bookshop Directory';
  if (searchParams.city && searchParams.state) {
    pageTitle = `Independent Bookshops in ${searchParams.city}, ${searchParams.state}`;
  } else if (searchParams.state) {
    pageTitle = `Independent Bookshops in ${searchParams.state}`;
  }

  return (
    <div>
      {/* H1 for SEO - Hidden but accessible */}
      <h1 className="sr-only">{pageTitle}</h1>

      {/* Client Component with interactive map */}
      <DirectoryClient
        initialBookstores={bookstores}
        initialStates={states}
        initialFilters={searchParams}
      />
    </div>
  );
}

// Revalidate every 30 minutes (matches Phase 1 cache TTL)
export const revalidate = 1800;
