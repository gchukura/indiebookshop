import type { Metadata } from 'next';
import LocationBreadcrumbs from '@/components/location/LocationBreadcrumbs';
import PlaceLinks from '@/components/location/PlaceLinks';
import { getFeatureIndex } from '@/lib/data/features';
import { BRAND, DEFAULT_OG_IMAGE } from '@/lib/seo';

export const revalidate = 3600;

const CANONICAL = 'https://www.indiebookshop.com/bookshops/features';
const INTRO =
  'Browse independent bookshops by what they offer: cafés, used and rare books, children’s sections, author events, and book clubs. Each list is grouped by state.';

export async function generateMetadata(): Promise<Metadata> {
  const title = `Independent Bookshops by Feature | ${BRAND}`;
  return {
    title: { absolute: title },
    description: INTRO,
    alternates: { canonical: CANONICAL },
    openGraph: { title, description: INTRO, url: CANONICAL, type: 'website', images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function FeaturesIndexPage() {
  const { index } = await getFeatureIndex();

  return (
    <div className="min-h-screen bg-gray-50">
      <LocationBreadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Bookshops', href: '/bookshops' },
          { name: 'Features', href: '/bookshops/features' },
        ]}
      />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <header className="bg-white rounded-lg shadow-md p-6">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown mb-4">
            Independent Bookshops by Feature
          </h1>
          <p className="text-gray-700 leading-relaxed">{INTRO}</p>
        </header>
        <PlaceLinks
          title="Features"
          links={index.features.map(f => ({ name: f.name, href: `/bookshops/features/${f.slug}`, count: f.shops.length }))}
        />
      </main>
    </div>
  );
}
