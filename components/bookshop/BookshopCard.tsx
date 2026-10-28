import Link from 'next/link';
import type { Bookstore } from '@/shared/schema';
import BookshopImage from '@/components/BookshopImage';
import { getBookshopImageUrl, getPlaceholderUrl } from '@/lib/bookshop-image';
import { getBookstoreSlug } from '@/lib/data/slug';
import { getStateAbbrev } from '@/lib/state-utils';
import type { FeatureLink } from '@/lib/data/feature-index';
import { cn } from '@/lib/utils';
import FeatureChips from './FeatureChips';
import { Star } from 'lucide-react';

/** The fields a card reads; listing records and the directory's slim records both fit. */
export type CardBookshop = Pick<
  Bookstore,
  'id' | 'name' | 'slug' | 'city' | 'state' | 'imageUrl' | 'googleRating' | 'googleReviewCount' | 'featureIds'
>;

type BookshopCardProps = {
  bookshop: CardBookshop;
  /** Feature id → chip name and link. Shops with no feature ids show none. */
  featureLinks?: Record<number, FeatureLink>;
  /** "default": image on top (grids). "compact": image left, text right (lists). */
  size?: 'default' | 'compact';
  /** Shown as "1.2 mi away" (nearby lists). */
  distanceMiles?: number;
  className?: string;
};

function formatDistance(miles: number): string {
  if (miles < 0.1) return '< 0.1 mi away';
  return miles < 10 ? `${miles.toFixed(1)} mi away` : `${Math.round(miles)} mi away`;
}

/**
 * The one shop card: photo (or the shop's placeholder), name, "City, ST",
 * rating with review count, and up to 3 feature chips.
 */
export default function BookshopCard({
  bookshop,
  featureLinks = {},
  size = 'default',
  distanceMiles,
  className,
}: BookshopCardProps) {
  const href = `/bookshop/${getBookstoreSlug(bookshop)}`;
  const compact = size === 'compact';
  const location = [bookshop.city, getStateAbbrev(bookshop.state)].filter(Boolean).join(', ');

  return (
    <article
      className={cn(
        'relative bg-white rounded-lg shadow-md overflow-hidden group',
        compact ? 'flex gap-3 p-3' : 'transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg',
        className
      )}
    >
      <div className={cn('block shrink-0', compact && 'w-28 sm:w-32')}>
        <div className={cn('relative w-full aspect-[4/3] overflow-hidden bg-brand-cream', compact && 'rounded-md')}>
          <BookshopImage
            src={getBookshopImageUrl(bookshop)}
            alt={`${bookshop.name} in ${location}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            fallbackSrc={getPlaceholderUrl(bookshop.id, 'thumb')}
          />
        </div>
      </div>
      <div className={cn('min-w-0', compact ? 'flex-1' : 'p-4 md:p-5')}>
        <h3
          className={cn(
            'font-serif font-bold text-brand-brown leading-tight line-clamp-2',
            compact ? 'text-base mb-0.5' : 'text-base md:text-lg mb-1'
          )}
        >
          {/* Stretched over the whole card, so the card is one large tap target */}
          <Link href={href} className="hover:text-brand-orange after:absolute after:inset-0 after:content-['']">
            {bookshop.name}
          </Link>
        </h3>
        <p className="text-sm text-gray-600 mb-1.5">
          {location}
          {distanceMiles !== undefined && <span className="text-gray-500"> · {formatDistance(distanceMiles)}</span>}
        </p>
        {bookshop.googleRating && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 shrink-0 text-yellow-600 fill-current" aria-hidden="true" />
            <span className="text-gray-700">{bookshop.googleRating}</span>
            {bookshop.googleReviewCount ? (
              <span className="text-gray-500">
                ({bookshop.googleReviewCount.toLocaleString('en-US')}
                {compact ? ')' : ' reviews)'}
              </span>
            ) : null}
          </div>
        )}
        <FeatureChips featureIds={bookshop.featureIds} links={featureLinks} limit={3} asLabels className={compact ? 'mt-2' : 'mt-3'} />
      </div>
    </article>
  );
}
