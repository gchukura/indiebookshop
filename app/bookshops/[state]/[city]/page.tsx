import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import LocationBreadcrumbs from '@/components/location/LocationBreadcrumbs';
import AdSlot from '@/components/ads/AdSlot';
import { ADS_ENABLED } from '@/lib/ads';
import LocationShops from '@/components/location/LocationShops';
import PlaceLinks from '@/components/location/PlaceLinks';
import { getFeatureNames, getLocationIndex } from '@/lib/data/locations';
import { getFeatureIndex } from '@/lib/data/features';
import { nearestCities } from '@/lib/data/location-index';
import { cityIntro, toMetaDescription } from '@/lib/data/location-content';
import { placeTitle } from '@/lib/seo';
import { countyToSlug } from '@/lib/data/location-slugs';
import { ArrowRight } from 'lucide-react';

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ state: string; city: string }> };

export async function generateStaticParams() {
  const { states } = await getLocationIndex();
  return states.flatMap(s => s.cities.map(c => ({ state: s.slug, city: c.slug })));
}

async function load(params: Props['params']) {
  const { state: stateSlug, city: citySlug } = await params;
  const state = (await getLocationIndex()).statesBySlug[stateSlug];
  const city = state?.citiesBySlug[citySlug];
  if (!state || !city) notFound();
  const [{ features }, { links }] = await Promise.all([getFeatureNames(), getFeatureIndex()]);
  return { state, city, featureLinks: links, intro: cityIntro(state, city, features) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, city, intro } = await load(params);
  const title = placeTitle(`${city.name}, ${state.name}`, `${city.name}, ${state.abbrev}`, city.shops.length);
  const description = toMetaDescription(intro);
  const url = `https://www.indiebookshop.com/bookshops/${state.slug}/${city.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

export default async function CityPage({ params }: Props) {
  const { state, city, featureLinks, intro } = await load(params);
  const county = city.county ? state.countiesBySlug[countyToSlug(city.county)] : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <LocationBreadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Bookshops', href: '/bookshops' },
          { name: state.name, href: `/bookshops/${state.slug}` },
          { name: city.name, href: `/bookshops/${state.slug}/${city.slug}` },
        ]}
      />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <header className="bg-white rounded-lg shadow-md p-6">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown mb-4">
            Independent Bookshops in {city.name}, {state.name}
          </h1>
          <p className="text-gray-700 leading-relaxed">{intro}</p>
          {county && (
            <p className="mt-3 text-sm">
              <Link href={`/bookshops/${state.slug}/county/${county.slug}`} className="text-brand-teal hover:underline">
                All bookshops in {county.displayName} ({county.shops.length})
              </Link>
            </p>
          )}
        </header>

        {ADS_ENABLED && <AdSlot name="location-intro" lazy={false} />}

        <LocationShops placeName={`${city.name}, ${state.name}`} shops={city.shops} featureLinks={featureLinks} />

        <PlaceLinks
          title={`Nearby cities in ${state.name}`}
          links={nearestCities(state, city).map(c => ({
            name: c.name,
            href: `/bookshops/${state.slug}/${c.slug}`,
            count: c.shops.length,
          }))}
        />
        <p className="text-sm">
          <Link href={`/bookshops/${state.slug}`} className="text-brand-teal hover:underline">
            All {state.shops.length.toLocaleString('en-US')} bookshops in {state.name} <ArrowRight className="inline h-4 w-4 align-[-0.125em]" aria-hidden="true" />
          </Link>
        </p>
      </main>
    </div>
  );
}
