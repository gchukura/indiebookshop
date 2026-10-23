import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og';
import { getFeatureIndex } from '@/lib/data/features';

export const alt = 'Independent bookshops with this feature';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export default async function Image({ params }: { params: Promise<{ feature: string }> }) {
  const { feature: slug } = await params;
  const feature = (await getFeatureIndex()).index.bySlug[slug];
  if (!feature) return ogCard({ title: 'Independent bookshops across the United States', footer: 'indiebookshop.com' });
  return ogCard({
    title: `Independent Bookshops with ${feature.phrase}`,
    subtitle: `${feature.shops.length.toLocaleString('en-US')} shops in ${feature.states.length} states`,
    footer: 'indiebookshop.com',
  });
}
