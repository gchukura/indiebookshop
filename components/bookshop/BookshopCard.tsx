import Link from 'next/link';
import type { Bookstore } from '@/shared/schema';
import BookshopImage from '@/components/BookshopImage';
import { getBookshopImageUrl, getPlaceholderUrl } from '@/lib/bookshop-image';
import { getBookstoreSlug } from '@/lib/data/slug';
import type { FeatureLink } from '@/lib/data/feature-index';
import FeatureChips from './FeatureChips';

type BookshopCardProps = {
  bookshop: Bookstore;
  /** Feature id → chip name and link. Shops with no feature ids show none. */
  featureLinks?: Record<number, FeatureLink>;
};

/** Card for shop lists: photo or placeholder, name, location, rating, up to 3 feature chips. */
export default function BookshopCard({ bookshop, featureLinks = {} }: BookshopCardProps) {
  const href = `/bookshop/${getBookstoreSlug(bookshop)}`;

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg group">
      <Link href={href} className="block" tabIndex={-1} aria-hidden="true">
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
          <BookshopImage
            src={getBookshopImageUrl(bookshop)}
            alt={`${bookshop.name} in ${bookshop.city}, ${bookshop.state}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            fallbackSrc={getPlaceholderUrl(bookshop.id, 'thumb')}
          />
        </div>
      </Link>
      <div className="p-4 md:p-5">
        <h3 className="font-serif font-bold text-base md:text-lg text-[#5F4B32] mb-1 leading-tight line-clamp-2">
          <Link href={href} className="hover:text-[#E16D3D]">
            {bookshop.name}
          </Link>
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          {bookshop.city}, {bookshop.state}
        </p>
        {bookshop.googleRating && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-yellow-600" aria-hidden="true">★</span>
            <span className="text-gray-700">{bookshop.googleRating}</span>
            {bookshop.googleReviewCount ? (
              <span className="text-gray-500">
                ({bookshop.googleReviewCount.toLocaleString('en-US')} reviews)
              </span>
            ) : null}
          </div>
        )}
        <FeatureChips featureIds={bookshop.featureIds} links={featureLinks} limit={3} className="mt-3" />
      </div>
    </article>
  );
}
