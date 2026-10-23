import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og';
import { getFeatureIndex } from '@/lib/data/features';

export const alt = 'Independent bookshops with this feature in this state';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export default async function Image({ params }: { params: Promise<{ state: string; feature: string }> }) {
  const { state, feature } = await params;
  const page = (await getFeatureIndex()).index.byState[state]?.[feature];
  if (!page) return ogCard({ title: 'Independent bookshops across the United States', footer: 'indiebookshop.com' });
  const n = page.shops.length;
  return ogCard({
    title: `Bookshops with ${page.feature.phrase} in ${page.stateName}`,
    subtitle: `${n.toLocaleString('en-US')} shop${n === 1 ? '' : 's'}`,
    footer: 'indiebookshop.com',
  });
}
