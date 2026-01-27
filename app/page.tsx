import Link from 'next/link';
import { getRandomBookstores, getPopularBookstores, getStates } from '@/lib/queries/bookstores';
import { generateSlugFromName } from '@/shared/utils';
import { MapPin, Map, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'IndiebookShop.com - Discover Independent Bookshops Across America',
  description: 'Find and support over 3,000 independent bookstores across America. Discover unique bookshops, browse by location, and support local businesses.',
  keywords: ['independent bookstores', 'bookshops', 'local bookstores', 'indie bookstores', 'book shops near me'],
};

// Revalidate every 30 minutes
export const revalidate = 1800;

// State name to abbreviation mapping
const STATE_NAME_TO_CODE: { [key: string]: string } = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI',
  'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME',
  'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
  'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
  'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
  'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX',
  'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
  'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  // Canadian provinces
  'British Columbia': 'BC', 'Ontario': 'ON', 'Quebec': 'QC', 'Alberta': 'AB',
  'Manitoba': 'MB', 'Nova Scotia': 'NS', 'New Brunswick': 'NB', 'Saskatchewan': 'SK'
};

const US_STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Helper to get state flag URL
const getStateImageUrl = (abbreviation: string): string => {
  if (abbreviation === 'DC') {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='30' viewBox='0 0 40 30'%3E%3Crect width='40' height='30' fill='white'/%3E%3Crect y='10' width='40' height='3' fill='%23DC143C'/%3E%3Crect y='17' width='40' height='3' fill='%23DC143C'/%3E%3C/svg%3E`;
  }

  if (US_STATE_ABBREVIATIONS.includes(abbreviation)) {
    const stateLower = abbreviation.toLowerCase();
    return `https://flagcdn.com/w40/us-${stateLower}.png`;
  }

  const canadianProvinces = ['BC', 'ON', 'QC', 'AB', 'MB', 'NS', 'NB', 'SK'];
  if (canadianProvinces.includes(abbreviation)) {
    return 'https://flagcdn.com/w40/ca.png';
  }

  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='30'%3E%3Crect width='40' height='30' fill='%23f3f4f6' stroke='%23d1d5db' stroke-width='1'/%3E%3C/svg%3E`;
};

export default async function HomePage() {
  const [featuredBookshops, popularBookshops, states] = await Promise.all([
    getRandomBookstores(6),
    getPopularBookstores(6),
    getStates(),
  ]);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-[#5F4B32] py-10 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="font-serif text-3xl md:text-4xl lg:text-display font-bold text-white mb-4 md:mb-6">
              Discover Independent Bookshops Across America
            </h1>
            <p className="font-sans text-base md:text-body-lg text-gray-100 mb-8 md:mb-10 max-w-4xl mx-auto px-4 md:px-2">
              Explore over 3,000 independent bookshops in all 50 U.S. states and Canada. Search by location, browse by specialty, or discover shops near you on our interactive map.
            </p>

            {/* Primary CTA */}
            <div className="mb-6 w-full sm:w-auto">
              <Link
                href="/directory"
                className="inline-block bg-[#E16D3D] hover:bg-[#d06a4f] text-white rounded-full px-8 md:px-10 py-4 md:py-5 text-lg md:text-xl font-semibold min-h-[56px] shadow-lg transition-colors"
              >
                Start Exploring →
              </Link>
            </div>

            {/* Secondary CTA */}
            <div className="text-center">
              <Link href="/submit" className="text-gray-100 hover:text-white underline text-sm md:text-base">
                Own a bookshop? Add or update your listing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Entry Points Section */}
      <section className="py-8 md:py-12 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-8 text-center">
              Start Your Search
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* By Location */}
              <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#2A6B7C] flex flex-col">
                <h3 className="font-serif font-bold text-xl text-[#5F4B32] mb-3 flex items-center gap-2 justify-start">
                  <MapPin className="w-6 h-6 text-[#2A6B7C] flex-shrink-0" />
                  <span>Search by Location</span>
                </h3>
                <p className="text-gray-700 mb-4 text-sm flex-grow">
                  Find bookshops near you or in cities you're visiting
                </p>
                <Link
                  href="/directory"
                  className="mt-auto block bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full px-6 py-3 text-center font-semibold transition-colors"
                >
                  Open Map & Filters
                </Link>
              </div>

              {/* By State */}
              <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#2A6B7C] flex flex-col">
                <h3 className="font-serif font-bold text-xl text-[#5F4B32] mb-3 flex items-center gap-2 justify-start">
                  <Map className="w-6 h-6 text-[#2A6B7C] flex-shrink-0" />
                  <span>Browse by State</span>
                </h3>
                <p className="text-gray-700 mb-4 text-sm flex-grow">
                  Explore all bookshops state by state
                </p>
                <a
                  href="#browse-by-state"
                  className="mt-auto block bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full px-6 py-3 text-center font-semibold transition-colors"
                >
                  See All States
                </a>
              </div>

              {/* Featured/Discover */}
              <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#2A6B7C] flex flex-col">
                <h3 className="font-serif font-bold text-xl text-[#5F4B32] mb-3 flex items-start gap-2">
                  <Sparkles className="w-6 h-6 text-[#2A6B7C] flex-shrink-0 mt-0.5" />
                  <span className="leading-tight">Discover Featured Shops</span>
                </h3>
                <p className="text-gray-700 mb-4 text-sm flex-grow">
                  Browse curated selections from our directory
                </p>
                <a
                  href="#featured-bookshops"
                  className="mt-auto block bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full px-6 py-3 text-center font-semibold transition-colors"
                >
                  View Featured
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust/Stats Bar */}
      <section className="py-8 bg-white border-y border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
            <div>
              <div className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#E16D3D] mb-2">3,000+</div>
              <div className="text-gray-700 font-medium">Independent Bookshops</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#E16D3D] mb-2">50</div>
              <div className="text-gray-700 font-medium">States Covered</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#E16D3D] mb-2">Growing</div>
              <div className="text-gray-700 font-medium">Updated Weekly</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Bookshops Section */}
      <section id="featured-bookshops" className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8">
            <div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 pt-8 md:pt-6 shadow-sm bg-[#2A6B7C]/5">
              <div className="absolute -top-4 md:-top-5 left-0 w-full flex items-center justify-center px-2">
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
                <h2 className="inline-block bg-white px-2 md:px-5 text-lg md:text-2xl lg:text-3xl font-serif font-bold text-[#5F4B32] text-center mx-2">
                  Featured Bookshops
                </h2>
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
              </div>
              <p className="text-center text-sm md:text-base lg:text-lg text-gray-700 mb-4 md:mb-6 lg:mb-8 mt-2 md:mt-0 px-2">
                Discover standout indie bookshops from across our directory. Each offers unique character and community connection.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                {featuredBookshops.map((bookshop) => {
                  const bookshopSlug = bookshop.slug || generateSlugFromName(bookshop.name);
                  return (
                  <Link
                    key={bookshop.id}
                    href={`/bookshop/${bookshopSlug}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg block"
                  >
                    <div className="p-4 md:p-5">
                      <h3 className="font-serif font-bold text-base md:text-lg lg:text-xl text-[#5F4B32] mb-2 hover:text-[#E16D3D] leading-tight line-clamp-2">
                        {bookshop.name}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                        {bookshop.city}, {bookshop.state}
                      </p>
                      {bookshop.googleRating && (
                        <div className="flex items-center gap-1 text-sm mb-3">
                          <span className="text-yellow-600">★</span>
                          <span className="text-gray-700">{bookshop.googleRating}</span>
                          {bookshop.googleReviewCount && (
                            <span className="text-gray-500">({bookshop.googleReviewCount})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Bookshops Section */}
      <section className="py-8 md:py-12 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8">
            <div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 pt-8 md:pt-6 shadow-sm bg-[#2A6B7C]/5">
              <div className="absolute -top-4 md:-top-5 left-0 w-full flex items-center justify-center px-2">
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
                <h2 className="inline-block bg-white px-2 md:px-5 text-lg md:text-2xl lg:text-3xl font-serif font-bold text-[#5F4B32] text-center mx-2">
                  Popular Bookshops
                </h2>
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
              </div>
              <p className="text-center text-sm md:text-base lg:text-lg text-gray-700 mb-4 md:mb-6 lg:mb-8 mt-2 md:mt-0 px-2">
                Highly-rated independent bookshops loved by readers across America.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                {popularBookshops.map((bookshop) => {
                  const bookshopSlug = bookshop.slug || generateSlugFromName(bookshop.name);
                  return (
                  <Link
                    key={bookshop.id}
                    href={`/bookshop/${bookshopSlug}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg block"
                  >
                    <div className="p-4 md:p-5">
                      <h3 className="font-serif font-bold text-base md:text-lg lg:text-xl text-[#5F4B32] mb-2 hover:text-[#E16D3D] leading-tight line-clamp-2">
                        {bookshop.name}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                        {bookshop.city}, {bookshop.state}
                      </p>
                      {bookshop.googleRating && (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-yellow-600">★</span>
                          <span className="text-gray-700">{bookshop.googleRating}</span>
                          {bookshop.googleReviewCount && (
                            <span className="text-gray-500">({bookshop.googleReviewCount})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by State Section */}
      <section id="browse-by-state" className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8">
            <div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 pt-8 md:pt-6 shadow-sm bg-[#2A6B7C]/5">
              <div className="absolute -top-4 md:-top-5 left-0 w-full flex items-center justify-center px-2">
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
                <h2 className="inline-block bg-white px-2 md:px-5 text-lg md:text-2xl lg:text-3xl font-serif font-bold text-[#5F4B32] text-center mx-2">
                  Browse by State
                </h2>
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
              </div>
              <p className="text-center text-sm md:text-base lg:text-lg text-gray-700 mb-4 md:mb-6 lg:mb-8 mt-2 md:mt-0 px-2">
                Explore independent bookshops across all 50 states and find your next literary destination.
              </p>

              {/* Separate US states and other regions */}
              {(() => {
                const usStates = states
                  .filter(state => STATE_NAME_TO_CODE[state] && US_STATE_ABBREVIATIONS.includes(STATE_NAME_TO_CODE[state]))
                  .sort((a, b) => {
                    const codeA = STATE_NAME_TO_CODE[a] || '';
                    const codeB = STATE_NAME_TO_CODE[b] || '';
                    return codeA.localeCompare(codeB);
                  });
                
                const otherRegions = states.filter(state => !usStates.includes(state));

                return (
                  <>
                    {usStates.length > 0 && (
                      <>
                        <h3 className="text-xl font-serif font-bold text-[#5F4B32] mb-4">United States</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                          {usStates.map((stateName) => {
                            const stateCode = STATE_NAME_TO_CODE[stateName] || stateName.substring(0, 2).toUpperCase();
                            const flagUrl = getStateImageUrl(stateCode);

                            return (
                              <Link
                                key={stateName}
                                href={`/directory?state=${encodeURIComponent(stateName)}`}
                                className="bg-white border-2 border-gray-200 hover:border-[#2A6B7C] rounded-lg p-3 transition-all hover:shadow-md flex items-center gap-2"
                              >
                                <img
                                  src={flagUrl}
                                  alt={`${stateName} flag`}
                                  className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='16'%3E%3Crect width='24' height='16' fill='%23e5e7eb'/%3E%3C/svg%3E`;
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-[#5F4B32] text-sm truncate">{stateName}</div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {otherRegions.length > 0 && (
                      <>
                        <h3 className="text-xl font-serif font-bold text-[#5F4B32] mb-4 mt-8">Other Regions</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                          {otherRegions.map((regionName) => {
                            const regionCode = STATE_NAME_TO_CODE[regionName] || regionName.substring(0, 2).toUpperCase();
                            const flagUrl = getStateImageUrl(regionCode);

                            return (
                              <Link
                                key={regionName}
                                href={`/directory?state=${encodeURIComponent(regionName)}`}
                                className="bg-white border-2 border-gray-200 hover:border-[#2A6B7C] rounded-lg p-3 transition-all hover:shadow-md flex items-center gap-2"
                              >
                                <img
                                  src={flagUrl}
                                  alt={`${regionName} flag`}
                                  className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='16'%3E%3Crect width='24' height='16' fill='%23e5e7eb'/%3E%3C/svg%3E`;
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-[#5F4B32] text-sm truncate">{regionName}</div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
