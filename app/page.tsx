import { Suspense } from 'react';
import Link from 'next/link';
import { getRandomBookstores, getPopularBookstores, getStates } from '@/lib/queries/bookstores';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'IndiebookShop.com - Discover Independent Bookshops Across America',
  description: 'Find and support over 3,000 independent bookstores across America. Discover unique bookshops, browse by location, and support local businesses.',
  keywords: ['independent bookstores', 'bookshops', 'local bookstores', 'indie bookstores', 'book shops near me'],
};

// Revalidate every 30 minutes
export const revalidate = 1800;

export default async function HomePage() {
  // Fetch data on the server using Phase 1 optimized queries
  const [featuredBookshops, popularBookshops, states] = await Promise.all([
    getRandomBookstores(8),
    getPopularBookstores(10),
    getStates(),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Discover Independent Bookshops
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Find and support over 3,000 independent bookstores across America
        </p>
        <Link
          href="/directory"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Browse Directory
        </Link>
      </section>

      {/* Featured Bookshops Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Featured Bookshops
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredBookshops.map((bookshop) => (
              <Link
                key={bookshop.id}
                href={`/bookshop/${bookshop.id}`}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition"
              >
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {bookshop.name}
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  {bookshop.city}, {bookshop.state}
                </p>
                {bookshop.googleRating && (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-yellow-500">★</span>
                    <span className="text-gray-700">{bookshop.googleRating}</span>
                    {bookshop.googleReviewCount && (
                      <span className="text-gray-500">({bookshop.googleReviewCount})</span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by State Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Browse by State
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {states.slice(0, 24).map((state) => (
              <Link
                key={state}
                href={`/directory?state=${encodeURIComponent(state)}`}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center"
              >
                <span className="font-medium text-gray-900">{state}</span>
              </Link>
            ))}
          </div>
          {states.length > 24 && (
            <div className="text-center mt-8">
              <Link
                href="/directory"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                View all {states.length} states →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Popular Bookshops Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Popular Bookshops
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {popularBookshops.map((bookshop) => (
              <Link
                key={bookshop.id}
                href={`/bookshop/${bookshop.id}`}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition flex gap-4"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {bookshop.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {bookshop.city}, {bookshop.state}
                  </p>
                  {bookshop.description && (
                    <p className="text-gray-500 text-sm line-clamp-2">
                      {bookshop.description}
                    </p>
                  )}
                </div>
                {bookshop.googleRating && (
                  <div className="flex flex-col items-center justify-center bg-yellow-50 px-4 py-2 rounded">
                    <span className="text-2xl font-bold text-gray-900">
                      {bookshop.googleRating}
                    </span>
                    <span className="text-yellow-500 text-sm">★★★★★</span>
                    <span className="text-gray-500 text-xs mt-1">
                      {bookshop.googleReviewCount} reviews
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SEO Footer Content */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Supporting Independent Bookstores Across America
          </h2>
          <p className="text-gray-700 mb-4">
            IndiebookShop.com is your comprehensive directory for discovering independent bookstores
            throughout the United States. Whether you're looking for a cozy neighborhood bookshop,
            a rare book specialist, or a vibrant community gathering space, we help you find the
            perfect independent bookstore for your needs.
          </p>
          <p className="text-gray-700 mb-4">
            Independent bookstores are more than just places to buy books—they're community hubs
            that host author events, book clubs, and literary discussions. By supporting local
            bookshops, you're investing in your community and helping preserve the unique character
            of independent bookselling.
          </p>
          <p className="text-gray-700">
            Browse our directory to find independent bookstores in your area, discover new favorites
            while traveling, or explore the diverse world of specialty bookshops across the country.
          </p>
        </div>
      </section>
    </main>
  );
}
