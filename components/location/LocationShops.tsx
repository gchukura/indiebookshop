import type { ReactNode } from 'react';
import type { Bookstore } from '@/shared/schema';
import BookshopCard from '@/components/bookshop/BookshopCard';
import LazyShopsMap from '@/components/bookshop/LazyShopsMap';
import { ItemListSchema } from '@/components/StructuredData';
import { toMapShops } from '@/lib/data/location-index';
import { getBookstoreSlug } from '@/lib/data/slug';
import { getMapboxToken } from '@/lib/mapbox';
import type { FeatureLink } from '@/lib/data/feature-index';

const SITE = 'https://www.indiebookshop.com';

type LocationShopsProps = {
  /** e.g. "Berkeley, California" */
  placeName: string;
  /** Already sorted (rating desc, then name). */
  shops: Bookstore[];
  featureLinks: Record<number, FeatureLink>;
  /** Heading above the grid; defaults to "All N bookshops". */
  heading?: string;
  /** Render the shop grid yourself (e.g. grouped by state). */
  children?: ReactNode;
};

/** Map, shop grid, and ItemList JSON-LD for a location page. */
export default function LocationShops({ placeName, shops, featureLinks, heading, children }: LocationShopsProps) {
  return (
    <section aria-labelledby="shops-heading" className="space-y-6">
      <ItemListSchema
        name={`Independent bookshops in ${placeName}`}
        items={shops.map(s => ({ name: s.name, url: `${SITE}/bookshop/${getBookstoreSlug(s)}` }))}
      />
      <LazyShopsMap shops={toMapShops(shops)} title={`Map of bookshops in ${placeName}`} mapboxToken={getMapboxToken()} />
      <h2 id="shops-heading" className="font-serif text-2xl font-bold text-[#5F4B32]">
        {heading ?? (shops.length === 1 ? 'The bookshop' : `All ${shops.length} bookshops`)}
      </h2>
      {children ?? <ShopGrid shops={shops} featureLinks={featureLinks} />}
    </section>
  );
}

/** Responsive grid of BookshopCards. */
export function ShopGrid({ shops, featureLinks }: { shops: Bookstore[]; featureLinks: Record<number, FeatureLink> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {shops.map(shop => (
        <BookshopCard key={shop.id} bookshop={shop} featureLinks={featureLinks} />
      ))}
    </div>
  );
}
