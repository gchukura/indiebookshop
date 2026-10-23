import type { Metadata } from 'next';
import Link from 'next/link';
import LocationBreadcrumbs from '@/components/location/LocationBreadcrumbs';
import { getLocationIndex } from '@/lib/data/locations';

export const revalidate = 3600;

const CANONICAL = 'https://www.indiebookshop.com/bookshops';

async function getIntro() {
  const { states } = await getLocationIndex();
  const total = states.reduce((sum, s) => sum + s.shops.length, 0);
  return {
    states,
    total,
    intro: `IndieBookShop lists ${total.toLocaleString('en-US')} independent bookshops across ${states.length} states and the District of Columbia. Pick a state to see its shops, cities, and counties.`,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { total, intro } = await getIntro();
  const title = `Independent Bookshops by State (${total.toLocaleString('en-US')}) | IndieBookShop`;
  return {
    title: { absolute: title },
    description: intro,
    alternates: { canonical: CANONICAL },
    openGraph: { title, description: intro, url: CANONICAL, type: 'website' },
  };
}

export default async function BookshopsIndexPage() {
  const { states, intro } = await getIntro();

  return (
    <div className="min-h-screen bg-gray-50">
      <LocationBreadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Bookshops', href: '/bookshops' }]} />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <header className="bg-white rounded-lg shadow-md p-6">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown mb-4">
            Independent Bookshops by State
          </h1>
          <p className="text-gray-700 leading-relaxed">{intro}</p>
          <p className="mt-3 text-sm">
            <Link href="/bookshops/features" className="text-brand-teal hover:underline">
              Or browse by feature: cafés, used books, children’s sections, and more →
            </Link>
          </p>
        </header>
        <section className="bg-white rounded-lg shadow-md p-6">
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {states.map(state => (
              <li key={state.slug}>
                <Link
                  href={`/bookshops/${state.slug}`}
                  className="flex items-center justify-between gap-2 border-2 border-gray-200 hover:border-brand-teal rounded-lg px-3 py-2 transition-colors"
                >
                  <span className="font-semibold text-brand-brown">{state.name}</span>
                  <span className="text-sm text-gray-500">{state.shops.length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
