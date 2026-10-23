import Link from 'next/link';
import type { Bookstore } from '@/shared/schema';
import BookshopImage from '@/components/BookshopImage';
import { getBookshopImageUrl, getPlaceholderUrl } from '@/lib/bookshop-image';
import { getBookstoreSlug } from '@/lib/data/slug';

type BookshopCardProps = {
  bookshop: Bookstore;
  /** Feature id → name, for the chips. Shops with no feature ids show none. */
  featureNames?: Record<number, string>;
};

/** Card for shop lists: photo or placeholder, name, location, rating, up to 3 feature chips. */
export default function BookshopCard({ bookshop, featureNames = {} }: BookshopCardProps) {
  const href = `/bookshop/${getBookstoreSlug(bookshop)}`;
  const chips = (bookshop.featureIds ?? [])
    .map(id => featureNames[id])
    .filter(Boolean)
    .slice(0, 3);

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
        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mt-3">
            {chips.map(name => (
              <li key={name} className="text-xs px-2 py-0.5 rounded-full bg-[#F7F3E8] text-[#5F4B32]">
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
