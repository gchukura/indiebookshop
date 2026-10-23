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
import { countyIntro, toMetaDescription } from '@/lib/data/location-content';
import { placeTitle } from '@/lib/seo';
import { cityToSlug } from '@/lib/data/location-slugs';

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ state: string; county: string }> };

export async function generateStaticParams() {
  const { states } = await getLocationIndex();
  return states.flatMap(s => s.counties.map(c => ({ state: s.slug, county: c.slug })));
}

async function load(params: Props['params']) {
  const { state: stateSlug, county: countySlug } = await params;
  const state = (await getLocationIndex()).statesBySlug[stateSlug];
  const county = state?.countiesBySlug[countySlug];
  if (!state || !county) notFound();
  const [{ features }, { links }] = await Promise.all([getFeatureNames(), getFeatureIndex()]);
  return { state, county, featureLinks: links, intro: countyIntro(state, county, features) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, county, intro } = await load(params);
  const title = placeTitle(`${county.displayName}, ${state.name}`, `${county.displayName}, ${state.abbrev}`, county.shops.length);
  const description = toMetaDescription(intro);
  const url = `https://www.indiebookshop.com/bookshops/${state.slug}/county/${county.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

export default async function CountyPage({ params }: Props) {
  const { state, county, featureLinks, intro } = await load(params);
  const cityLinks = county.cityNames.flatMap(name => {
    const city = state.citiesBySlug[cityToSlug(name)];
    return city ? [{ name: city.name, href: `/bookshops/${state.slug}/${city.slug}`, count: city.shops.length }] : [];
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <LocationBreadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Bookshops', href: '/bookshops' },
          { name: state.name, href: `/bookshops/${state.slug}` },
          { name: county.displayName, href: `/bookshops/${state.slug}/county/${county.slug}` },
        ]}
      />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <header className="bg-white rounded-lg shadow-md p-6">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown mb-4">
            Independent Bookshops in {county.displayName}, {state.name}
          </h1>
          <p className="text-gray-700 leading-relaxed">{intro}</p>
        </header>

        {ADS_ENABLED && <AdSlot name="location-intro" lazy={false} />}

        <LocationShops placeName={`${county.displayName}, ${state.name}`} shops={county.shops} featureLinks={featureLinks} />

        <PlaceLinks title={`Cities in ${county.displayName}`} links={cityLinks} />
        <p className="text-sm">
          <Link href={`/bookshops/${state.slug}`} className="text-brand-teal hover:underline">
            All {state.shops.length.toLocaleString('en-US')} bookshops in {state.name} →
          </Link>
        </p>
      </main>
    </div>
  );
}
