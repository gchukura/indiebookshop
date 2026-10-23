import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og';
import { getTotalBookstoreCount } from '@/lib/data/bookstore-data';

export const alt = 'IndieBookShop — find your next independent bookshop';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Site-wide default share image. */
export default async function Image() {
  const count = await getTotalBookstoreCount().catch(() => 0);
  return ogCard({
    title: 'Find your next independent bookshop',
    subtitle: count ? `${count.toLocaleString('en-US')} indie bookshops across the United States` : 'Indie bookshops across the United States',
    footer: 'indiebookshop.com',
  });
}
