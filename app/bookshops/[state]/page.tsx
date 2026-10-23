import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import LocationBreadcrumbs from '@/components/location/LocationBreadcrumbs';
import LocationShops from '@/components/location/LocationShops';
import PlaceLinks from '@/components/location/PlaceLinks';
import { getFeatureNames, getLocationIndex } from '@/lib/data/locations';
import { stateIntro, toMetaDescription } from '@/lib/data/location-content';

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ state: string }> };

export async function generateStaticParams() {
  const { states } = await getLocationIndex();
  return states.map(s => ({ state: s.slug }));
}

async function load(params: Props['params']) {
  const { state: stateSlug } = await params;
  const state = (await getLocationIndex()).statesBySlug[stateSlug];
  if (!state) notFound();
  const { features, names } = await getFeatureNames();
  return { state, featureNames: names, intro: stateIntro(state, features) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, intro } = await load(params);
  const title = `Independent Bookshops in ${state.name} (${state.shops.length}) | IndieBookShop`;
  const description = toMetaDescription(intro);
  const url = `https://www.indiebookshop.com/bookshops/${state.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

export default async function StatePage({ params }: Props) {
  const { state, featureNames, intro } = await load(params);

  return (
    <div className="min-h-screen bg-gray-50">
      <LocationBreadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Bookshops', href: '/bookshops' },
          { name: state.name, href: `/bookshops/${state.slug}` },
        ]}
      />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <header className="bg-white rounded-lg shadow-md p-6">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#5F4B32] mb-4">
            Independent Bookshops in {state.name}
          </h1>
          <p className="text-gray-700 leading-relaxed">{intro}</p>
        </header>

        <PlaceLinks
          title={`Cities in ${state.name}`}
          links={state.cities.map(c => ({
            name: c.name,
            href: `/bookshops/${state.slug}/${c.slug}`,
            count: c.shops.length,
          }))}
        />

        <LocationShops placeName={state.name} shops={state.shops} featureNames={featureNames} />

        {state.counties.length > 0 && (
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Counties in {state.name}</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
              {state.counties.map(county => (
                <li key={county.slug}>
                  <Link href={`/bookshops/${state.slug}/county/${county.slug}`} className="text-[#2A6B7C] hover:underline">
                    {county.displayName}
                  </Link>{' '}
                  <span className="text-sm text-gray-500">({county.shops.length})</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
