import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import LocationBreadcrumbs from '@/components/location/LocationBreadcrumbs';
import LocationShops, { ShopGrid } from '@/components/location/LocationShops';
import { getFeatureIndex } from '@/lib/data/features';
import { featureIntro, toMetaDescription } from '@/lib/data/location-content';
import { placeTitle } from '@/lib/seo';

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ feature: string }> };

export async function generateStaticParams() {
  const { index } = await getFeatureIndex();
  return index.features.map(f => ({ feature: f.slug }));
}

async function load(params: Props['params']) {
  const { feature: slug } = await params;
  const { index, links } = await getFeatureIndex();
  const feature = index.bySlug[slug];
  if (!feature) notFound();
  return { feature, links, byState: index.byState, intro: featureIntro(feature) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { feature, intro } = await load(params);
  const title = placeTitle(feature.phrase, feature.phrase, feature.shops.length, 'Independent Bookshops with');
  const description = toMetaDescription(intro);
  const url = `https://www.indiebookshop.com/bookshops/features/${feature.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

export default async function FeaturePage({ params }: Props) {
  const { feature, links, byState, intro } = await load(params);

  return (
    <div className="min-h-screen bg-gray-50">
      <LocationBreadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Bookshops', href: '/bookshops' },
          { name: 'Features', href: '/bookshops/features' },
          { name: feature.name, href: `/bookshops/features/${feature.slug}` },
        ]}
      />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <header className="bg-white rounded-lg shadow-md p-6">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown mb-4">
            Independent Bookshops with {feature.phrase}
          </h1>
          <p className="text-gray-700 leading-relaxed">{intro}</p>
          <nav aria-label="Jump to state" className="mt-4">
            <ul className="flex flex-wrap gap-x-4 text-sm">
              {feature.states.map(group => (
                <li key={group.stateSlug}>
                  <a href={`#${group.stateSlug}`} className="inline-flex min-h-[44px] items-center gap-1 text-brand-teal hover:underline">
                    {group.stateName} <span className="text-gray-500">({group.shops.length})</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <LocationShops
          placeName={`the US with ${feature.phrase.toLowerCase()}`}
          shops={feature.shops}
          featureLinks={links}
          heading={`All ${feature.shops.length} bookshops, by state`}
        >
          <div className="space-y-10">
            {feature.states.map(group => {
              const statePage = byState[group.stateSlug]?.[feature.slug];
              return (
                <section key={group.stateSlug} id={group.stateSlug} className="scroll-mt-24">
                  <h3 className="font-serif text-xl font-bold text-brand-brown mb-4">
                    {statePage ? (
                      <Link href={`/bookshops/${group.stateSlug}/features/${feature.slug}`} className="inline-flex min-h-[44px] items-center hover:text-brand-orange">
                        {group.stateName}
                      </Link>
                    ) : (
                      group.stateName
                    )}{' '}
                    <span className="text-base font-normal text-gray-500">({group.shops.length})</span>
                  </h3>
                  <ShopGrid shops={group.shops} featureLinks={links} />
                </section>
              );
            })}
          </div>
        </LocationShops>
      </main>
    </div>
  );
}
