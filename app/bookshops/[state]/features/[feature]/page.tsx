import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import LocationBreadcrumbs from '@/components/location/LocationBreadcrumbs';
import LocationShops from '@/components/location/LocationShops';
import { getFeatureIndex } from '@/lib/data/features';
import { getLocationIndex } from '@/lib/data/locations';
import { stateFeatureIntro, toMetaDescription } from '@/lib/data/location-content';

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ state: string; feature: string }> };

/** Only state + feature combinations with at least MIN_STATE_FEATURE_SHOPS shops get a page. */
export async function generateStaticParams() {
  const { index } = await getFeatureIndex();
  return Object.entries(index.byState).flatMap(([state, features]) =>
    Object.keys(features).map(feature => ({ state, feature }))
  );
}

async function load(params: Props['params']) {
  const { state: stateSlug, feature: featureSlug } = await params;
  const [{ index, links }, locations] = await Promise.all([getFeatureIndex(), getLocationIndex()]);
  const page = index.byState[stateSlug]?.[featureSlug];
  const state = locations.statesBySlug[stateSlug];
  if (!page || !state) notFound();
  return { page, state, links, intro: stateFeatureIntro(page, state) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page, intro } = await load(params);
  const title = `Independent Bookshops with ${page.feature.phrase} in ${page.stateName} (${page.shops.length}) | IndieBookShop`;
  const description = toMetaDescription(intro);
  const url = `https://www.indiebookshop.com/bookshops/${page.stateSlug}/features/${page.feature.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

export default async function StateFeaturePage({ params }: Props) {
  const { page, state, links, intro } = await load(params);
  const { feature } = page;

  return (
    <div className="min-h-screen bg-gray-50">
      <LocationBreadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Bookshops', href: '/bookshops' },
          { name: state.name, href: `/bookshops/${state.slug}` },
          { name: feature.name, href: `/bookshops/${state.slug}/features/${feature.slug}` },
        ]}
      />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <header className="bg-white rounded-lg shadow-md p-6">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#5F4B32] mb-4">
            Independent Bookshops with {feature.phrase} in {state.name}
          </h1>
          <p className="text-gray-700 leading-relaxed">{intro}</p>
        </header>

        <LocationShops
          placeName={`${state.name} with ${feature.phrase.toLowerCase()}`}
          shops={page.shops}
          featureLinks={links}
        />

        <p className="text-sm flex flex-wrap gap-x-6 gap-y-2">
          <Link href={`/bookshops/features/${feature.slug}`} className="text-[#2A6B7C] hover:underline">
            Bookshops with {feature.phrase.toLowerCase()} in every state ({feature.shops.length}) →
          </Link>
          <Link href={`/bookshops/${state.slug}`} className="text-[#2A6B7C] hover:underline">
            All {state.shops.length.toLocaleString('en-US')} bookshops in {state.name} →
          </Link>
        </p>
      </main>
    </div>
  );
}
