import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og';
import { getBookstoreBySlugFull } from '@/lib/data/bookstore-data';
import { getStateDisplayName } from '@/lib/state-utils';

export const alt = 'Independent bookshop on IndieBookShop';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Rendered on first request and cached, rather than ~2,200 images at build time
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getBookstoreBySlugFull(decodeURIComponent(slug)).catch(() => null);
  if (!shop) return ogCard({ title: 'Independent bookshops across the United States', footer: 'indiebookshop.com' });

  const rating = shop.googleRating
    ? `${shop.googleRating} stars${shop.googleReviewCount ? ` · ${shop.googleReviewCount.toLocaleString('en-US')} Google reviews` : ''}`
    : 'indiebookshop.com';
  return ogCard({
    eyebrow: 'Independent bookshop',
    title: shop.name,
    subtitle: [shop.city, getStateDisplayName(shop.state) || shop.state].filter(Boolean).join(', '),
    footer: rating,
  });
}
